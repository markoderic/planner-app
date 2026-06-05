#!/usr/bin/env python3
import hashlib
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parent
SYNC_DIR = ROOT / ".planner-sync"
PORT = int(os.environ.get("PORT", "4173"))
HOST = os.environ.get("HOST", "0.0.0.0")


class PlannerHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Planner-Account, X-Planner-Key, X-Planner-Client")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/api/sync":
            self.handle_sync_get()
            return
        super().do_GET()

    def do_POST(self):
        if self.path.split("?", 1)[0] == "/api/sync":
            self.handle_sync_post()
            return
        self.send_json(405, {"error": "Method not allowed"})

    def translate_path(self, path):
        requested = unquote(path.split("?", 1)[0].split("#", 1)[0])
        if requested == "/":
            requested = "/index.html"
        target = (ROOT / requested.lstrip("/")).resolve()
        if not str(target).startswith(str(ROOT)) or ".planner-sync" in target.parts:
            return str(ROOT / "__forbidden__")
        return str(target)

    def account_file(self):
        account = self.headers.get("X-Planner-Account", "").strip()
        key = self.headers.get("X-Planner-Key", "")
        if not account or not key:
            return None
        digest = hashlib.sha256(f"{account}\0{key}".encode("utf-8")).hexdigest()
        return SYNC_DIR / f"{digest}.json"

    def handle_sync_get(self):
        account_file = self.account_file()
        if not account_file:
            self.send_json(401, {"error": "Missing sync account or key"})
            return
        if not account_file.exists():
            self.send_json(200, {"data": None, "updatedAt": None})
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(account_file.read_bytes())

    def handle_sync_post(self):
        account_file = self.account_file()
        if not account_file:
            self.send_json(401, {"error": "Missing sync account or key"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            self.send_json(400, {"error": "Invalid JSON"})
            return
        if not payload.get("data"):
            self.send_json(400, {"error": "Missing planner data"})
            return
        updated_at = payload.get("updatedAt") or payload["data"].get("_meta", {}).get("updatedAt")
        body = {
            "data": payload["data"],
            "updatedAt": updated_at,
            "clientId": payload.get("clientId", "")
        }
        temp_file = account_file.with_suffix(".tmp")
        temp_file.write_text(json.dumps(body), encoding="utf-8")
        temp_file.replace(account_file)
        self.send_json(200, {"ok": True, "updatedAt": updated_at})

    def send_json(self, status, body):
        encoded = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


if __name__ == "__main__":
    os.chdir(ROOT)
    SYNC_DIR.mkdir(exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), PlannerHandler)
    print(f"Planner app: http://localhost:{PORT}")
    print(f"Sync API: http://localhost:{PORT}/api/sync")
    server.serve_forever()
