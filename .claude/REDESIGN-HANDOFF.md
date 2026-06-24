# Planner App — Redesign Handoff

Read this first. It captures the full state of the UI redesign so a new chat can continue with no context loss.

## Project basics
- Vanilla **HTML/CSS/JS** PWA. No framework, no build step.
- Key files: `app.js` (~8k lines, all logic + render functions), `styles.css` (~6k lines), `index.html`, `service-worker.js`.
- Data is in `localStorage` (`personalPlannerData.v1`); render is string-template `innerHTML` driven by `render()` in app.js. Actions go through `data-action` → `handleAction(action, button)`.
- Preview: `.claude/launch.json` runs a node static server (`.claude/static-server.mjs`) on **port 4178**. Use the Claude Preview MCP (`preview_start` name "planner"), `preview_resize` preset "mobile" (375×812), navigate to `/index.html`.
- Mockups live in `.claude/mockups/` (each is standalone HTML linking `_base.css`, shows 2–3 phone frames). Render at ~900–1340px wide and screenshot.

## Cache-busting (DO after every change)
Bump all three together or changes won't show on device:
- `index.html`: `styles.css?v=NN` and `app.js?v=NN`
- `service-worker.js`: `CACHE_NAME = "planner-app-vNN"`
- **Current versions: styles v85, app v79, SW v100.** (Increment from there.)

## Design system — direction "A · Quiet" (LOCKED)
Apple-restraint, dark, SF Pro, glass used sparingly (nav/modals/floating only).
- Tokens in `styles.css` `:root`: `--bg:#0a0c10`, `--elevated:#161a22`, `--elevated-2:#1c212c`, `--line`, `--hairline`, `--text/--muted/--subtle`, font stack = SF Pro first.
- Accent tokens: `--blue #4f8cff, --cyan #36d3ff, --purple #9d6fff, --green #47dc9a, --orange #ffae52, --pink #ff5c8a, --teal #2fd9c0`. `--accent` is neutral white.
- Radii: `--radius 20 / --radius-lg 24 / --radius-md 14`. Motion: `--ease-spring`, `--ease-out`, `--dur-fast 140 / --dur 200 / --dur-slow 280`. Glass: `--glass`, `--glass-border`, `--glass-blur`.
- **Section accent mapping** (consistent everywhere): Tasks = purple, Money/Finance = green, School = blue, Health = pink, Calendar = orange, Notes = yellow, Travel = cyan/teal, More = neutral. **Assignments keep their per-class color.**
- Reusable patterns (already in CSS): `.sec-head`/`.sec-title`, inset grouped lists (`.list.grouped`, `.group`), `.stat-tiles`/`.stat-tile` (2×2, use `minmax(0,1fr)`), `.stat-chips`/`.stat-chip`, chips (`.chip`/`.status-chip`), `.seg-toggle`/`.segmented`, soft `.empty` (dashed), bottom-nav glass (NO active pill/box — just brighten icon+label).
- `.view { grid-template-columns: minmax(0,1fr) }` prevents horizontal overflow — keep it.

## Redesign WORKFLOW (how every section has been done)
1. Build mockups in `.claude/mockups/<section>.html` — 2–3 phone "directions" in the Quiet system.
2. Render in preview, screenshot, present options, and **ask the user which they like via AskUserQuestion BEFORE editing the app.**
3. Build the chosen direction into `app.js`/`styles.css`. **Presentation-only — never change data/logic.** Preserve every feature + every `data-action`.
4. Verify in preview (interactions + screenshots), bump versions.

## STATUS — built into the real app (DONE)
- **Dashboard** — "Quiet" hero (greeting + green progress ring + 3 chips), grouped "Up next" (icon tiles, tap → detail popup with "Take me there"), 2×2 snapshot tiles, "Overview & metrics" collapsed, money trend, weekly progress, goals.
- **Tasks** — "A · Clean list": compact stat chips, daily habits as grouped rows (round check + name + schedule pill + ⋯edit), category chips, task groups (Today/Overdue/Upcoming/Anytime/History) as grouped `.tk-list` rows (check + title + meta pills + chevron). Habit/task delete lives in the edit modal.
- **School (overview)** — "B-with-A's-top": span segmented + 4 stat chips, **2-col class cards** (`.class-card2`, class-color bar + grade pill + progress + next due), assignments (filters + groups), school calendar card. (Class **detail** page NOT yet redesigned — mockup pending below.)
- **Health (Workouts)** — "C + split bars": Workouts/Nutrition segmented (pink), refined week strip (today pink ring), Lifting/Running toggle, 2×2 stat tiles, **split-history progress bars**, informative lift/run log. (Nutrition view NOT yet redesigned — mockup pending.)
- **Finance** — hybrid: **balance hero** (current money + green sparkline `financeBalancePoints`/`sparklineSvg` + mini stats + span chips), **2×2 overview tiles**, **tabbed sub-nav** (`ui.financeSection`, `set-finance-section`) showing ONE numbered section at a time (Current money/Income/Bills/Spending/Savings/Debt/Investments/Forecast). Old floating "jump to" shortcut removed.
- **Class detail** — direction **A · Grade hero** (built). `renderClassDetail` + `classGradeRing(percent, letter, color)` in app.js: topbar (back + title + meta, NO top add button), `.class-hero` panel (grade ring fills to completion %, letter grade centered in class color, completion bar, `.class-chips` overdue/upcoming/next, Edit grade + Edit class actions, notes), "To do" = `renderAssignmentGroups` (all actions preserved), Calendar via `renderSchoolCalendarCard({scope:"class",classId,open:false})` (collapsed), Timeline `<details>` (collapsed). CSS under "Class detail · grade hero" in styles.css. `renderSchoolCalendarCard` gained an `open` param (default true).

## STATUS — mockups made, AWAITING user's choice + build (PENDING)
Each file has 2 directions; user must pick, then build (presentation-only):
- **Calendar** → `calendar.html` — A · Month + agenda (orange month grid, dots by type, tapped-day agenda below) | B · Agenda list (grouped by Today/Tomorrow/date). NOTE: classes already removed from calendar filters (only kind chips: All/Tasks/Meetings/Bills/Workouts).
- **Nutrition** (Health tab) → `nutrition.html` — A · Calorie ring + macro bars + meals | B · Macro tiles (2×2) + meals + weekly avg.
- **Notes** → `notes.html` — A · Notes list (search + folder chips + Pinned/Recent groups) | B · Card grid (2-col colored cards).
- **Travel** → `travel.html` — A · Map hero + 3-stat row + searchable country list | B · Progress-first (visited ring + by-continent bars). Keep map/zoom/search/visited toggle.
- **More** → `more.html` — A · Grouped settings (profile + inset groups) | B · Tool grid + settings list.

## Collapse animation (already fixed — don't regress)
`toggleDetails` in app.js animates a `.details-body` wrapped in a single `.dcl` inner via **WAAPI height** (460ms, `--ease-out`), collapsing to a true 0 (no padding residual, no fallback-timer pause). Don't go back to grid `fr` or JS-rAF height.

## Functional fixes already shipped (don't redo)
School calendar month nav; assignment in-progress merged into "To do" + animations; tasks "Anytime" (no-date); per-weekday habits; income chart (solid green line, Weekly/Monthly/Yearly, compare two months); month-to-date; collapsible lift/run log; modal centering + body scroll-lock; inputs no horizontal scroll; projection uses **minimum** debt payment (not payoff-goal); investments share-based (shares×price); credit-card payment validation relaxed + editable payment history; dashboard Up-Next overlap + detail popup; cohesive global pass (tokens/SF/nav/chips/empty states); unified kind colors; nav slimmed (height 56) + zoom-locked PWA (`maximum-scale=1,user-scalable=no`, `touch-action`, gesture preventDefault); flipped income-history chevron.

## How to continue in a new chat
Open a new chat **in this same project folder**. Say e.g. "continue the planner redesign — build the Calendar section, I pick direction A" (or ask to see a mockup first). Point it at this file: `.claude/REDESIGN-HANDOFF.md`.
