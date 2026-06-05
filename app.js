(() => {
  "use strict";

  const STORAGE_KEY = "personalPlannerData.v1";
  const UI_KEY = "personalPlannerUi.v1";
  const SYNC_KEY = "personalPlannerSync.v1";
  const app = document.getElementById("app");
  const modalRoot = document.getElementById("modal-root");
  const toast = document.getElementById("toast");
  const bootStarted = performance.now();

  const today = () => dateString(new Date());
  const nowIso = () => new Date().toISOString();

  const defaultSettings = () => ({
    accent: "#f7f7ff",
    weeklyReview: true,
    nutrition: true,
    gymDetails: true,
    tax: {
      autoOhio: true,
      payPeriodsPerYear: 26,
      ohioExemptions: 1,
      ohioLocalRate: 0
    },
    taskCategories: ["Personal", "School", "Money", "Business", "Gym", "Shopping", "Errand", "Other"],
    billCategories: ["Rent", "Phone", "Car", "Insurance", "Subscriptions", "School", "Debt", "Other"],
    spendingCategories: ["Food", "Gas", "Groceries", "Shopping", "Subscriptions", "School", "Gym", "Going out", "Business", "Other"],
    incomeSources: ["Job", "Website client", "DoorDash", "Cash", "Gift", "Refund", "Other"]
  });

  const emptyData = (includeDefaultHabits = true) => ({
    _meta: {
      updatedAt: nowIso()
    },
    settings: defaultSettings(),
    dailyHabits: includeDefaultHabits
      ? [
          makeItem({ title: "Make bed" }),
          makeItem({ title: "Pray" }),
          makeItem({ title: "Drink water" }),
          makeItem({ title: "Brush teeth" }),
          makeItem({ title: "Plan tomorrow" })
        ]
      : [],
    habitCompletions: {},
    tasks: [],
    finance: {
      accounts: [],
      income: [],
      bills: [],
      spending: [],
      debts: [],
      investments: []
    },
    school: {
      classes: [],
      assignments: []
    },
    gym: {
      workouts: [],
      planDays: []
    },
    nutrition: {
      entries: [],
      goals: {
        calories: 2200,
        protein: 160,
        carbs: 230,
        fat: 70
      }
    },
    shopping: [],
    reminders: [],
    inbox: []
  });

  const demoData = () => {
    const data = emptyData(true);
    const d0 = today();
    const d1 = dateString(addDays(new Date(), 1));
    const d2 = dateString(addDays(new Date(), 2));
    const d5 = dateString(addDays(new Date(), 5));

    data.finance.accounts = [
      makeItem({ name: "Checking", type: "Checking", balance: 860 }),
      makeItem({ name: "Savings", type: "Savings", balance: 420 }),
      makeItem({ name: "Cash", type: "Cash", balance: 45 })
    ];
    data.finance.income = [
      makeItem({ type: "hourly", source: "Job", hourlyWage: 18, hours: 16, date: d0, payDate: d5, taxMode: "auto", deductionPercent: "", notes: "" }),
      makeItem({ type: "manual", source: "Website client", amount: 250, date: d1, payDate: d1, taxMode: "auto", deductionPercent: "", notes: "" })
    ];
    data.finance.bills = [
      makeItem({ name: "Phone", amount: 62, dueDate: d2, frequency: "monthly", category: "Phone", paid: false, notes: "" }),
      makeItem({ name: "Streaming", amount: 15, dueDate: d5, frequency: "monthly", category: "Subscriptions", paid: false, notes: "" })
    ];
    data.finance.spending = [
      makeItem({ amount: 18.5, category: "Food", date: d0, note: "Lunch", necessary: true, paymentMethod: "Debit" }),
      makeItem({ amount: 36, category: "Gas", date: d0, note: "", necessary: true, paymentMethod: "Debit" })
    ];
    data.finance.debts = [
      makeItem({ name: "Credit card", balance: 650, originalBalance: 900, interestRate: 22, minimumPayment: 45, dueDate: d5, targetPayoffDate: dateString(addDays(new Date(), 120)), notes: "", paymentHistory: [] })
    ];
    data.finance.investments = [
      makeItem({ name: "Starter portfolio", type: "stock", amountInvested: 300, currentValue: 326, notes: "" })
    ];

    const classA = makeItem({ name: "Anthropology", professor: "", meetingDays: "Mon Wed", accentColor: "#25d8ff", notes: "" });
    const classB = makeItem({ name: "Statistics", professor: "", meetingDays: "Tue Thu", accentColor: "#7c5cff", notes: "" });
    data.school.classes = [classA, classB];
    data.school.assignments = [
      makeItem({ title: "Quiz 4", classId: classA.id, type: "quiz", dueDate: d1, dueTime: "23:59", priority: "High", status: "in progress", grade: "", pointsEarned: "", pointsPossible: "", notes: "", link: "" }),
      makeItem({ title: "Problem set", classId: classB.id, type: "assignment", dueDate: d5, dueTime: "", priority: "Medium", status: "not started", grade: "", pointsEarned: "", pointsPossible: "", notes: "", link: "" })
    ];

    data.tasks = [
      makeItem({ title: "Schedule oil change", category: "Errand", dueDate: d0, priority: "Medium", notes: "", reminderTime: "", completed: false }),
      makeItem({ title: "Review anthropology notes", category: "School", dueDate: d1, priority: "High", notes: "", reminderTime: "", completed: false })
    ];
    data.gym.workouts = [
      makeItem({ date: d0, split: "Push", duration: 62, notes: "", energy: 4, exercises: [{ name: "Bench press", sets: 3, reps: 8, weight: 135 }] })
    ];
    data.gym.planDays = [1, 3, 5];
    data.nutrition.entries = [
      makeItem({ mealName: "Breakfast", calories: 520, protein: 32, carbs: 58, fat: 18, date: d0, notes: "" })
    ];
    data.shopping = [
      makeItem({ itemName: "Tongue scraper", estimatedPrice: 8, store: "", category: "Personal", priority: "Medium", purchased: false }),
      makeItem({ itemName: "Chicken breast", estimatedPrice: 16, store: "Grocery", category: "Food", priority: "High", purchased: false })
    ];
    data.reminders = [
      makeItem({ title: "Call insurance", date: d2, time: "10:00", type: "Call", notes: "", completed: false })
    ];

    return data;
  };

  let ui = loadUi();
  let syncState = loadSync();
  let syncPushTimer = null;
  let syncInFlight = false;
  let undoState = null;
  let appData = loadData();
  normalizeData();
  saveData({ skipSync: true, touch: false });
  applyAccent();

  function uid() {
    return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function makeItem(values = {}) {
    return { id: uid(), createdAt: nowIso(), ...values };
  }

  function loadUi() {
    try {
      return {
        activeTab: "dashboard",
        moreView: "gym",
        dashboardSpan: "today",
        dashboardStyle: "cards",
        financeSpan: "30",
        taskFilter: "All",
        schoolClassFilter: "all",
        dashboardCustom: { start: today(), end: today() },
        financeCustom: { start: today(), end: dateString(addDays(new Date(), 30)) },
        ...JSON.parse(localStorage.getItem(UI_KEY) || "{}")
      };
    } catch {
      return {
        activeTab: "dashboard",
        moreView: "gym",
        dashboardSpan: "today",
        dashboardStyle: "cards",
        financeSpan: "30",
        taskFilter: "All",
        schoolClassFilter: "all",
        dashboardCustom: { start: today(), end: today() },
        financeCustom: { start: today(), end: dateString(addDays(new Date(), 30)) }
      };
    }
  }

  function saveUi() {
    localStorage.setItem(UI_KEY, JSON.stringify(ui));
  }

  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : emptyData(true);
    } catch {
      return emptyData(true);
    }
  }

  function defaultSyncEndpoint() {
    return ["http:", "https:"].includes(location.protocol) ? `${location.origin}/api/sync` : "";
  }

  function loadSync() {
    const fallback = {
      enabled: false,
      endpoint: defaultSyncEndpoint(),
      account: "",
      key: "",
      clientId: uid(),
      lastSync: "",
      status: "Not signed in"
    };
    try {
      return { ...fallback, ...JSON.parse(localStorage.getItem(SYNC_KEY) || "{}") };
    } catch {
      return fallback;
    }
  }

  function saveSync() {
    localStorage.setItem(SYNC_KEY, JSON.stringify(syncState));
  }

  function saveData(options = {}) {
    const { skipSync = false, touch = true } = options;
    if (touch) {
      appData._meta = {
        ...(appData._meta || {}),
        updatedAt: nowIso(),
        clientId: syncState?.clientId || appData._meta?.clientId || ""
      };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    if (!skipSync) queueSyncPush();
  }

  function normalizeData() {
    const fresh = emptyData(false);
    appData = deepMerge(fresh, appData || {});
    appData._meta = {
      updatedAt: appData._meta?.updatedAt || nowIso(),
      clientId: appData._meta?.clientId || syncState?.clientId || ""
    };
    appData.settings = { ...defaultSettings(), ...(appData.settings || {}) };
    if (appData.settings.accent === "#7c5cff") appData.settings.accent = defaultSettings().accent;
    appData.settings.tax = { ...defaultSettings().tax, ...(appData.settings.tax || {}) };
    appData.finance = deepMerge(fresh.finance, appData.finance || {});
    appData.school = deepMerge(fresh.school, appData.school || {});
    appData.gym = deepMerge(fresh.gym, appData.gym || {});
    appData.nutrition = deepMerge(fresh.nutrition, appData.nutrition || {});
    appData.dailyHabits = appData.dailyHabits || [];
    appData.habitCompletions = appData.habitCompletions || {};
    appData.tasks = appData.tasks || [];
    appData.shopping = appData.shopping || [];
    appData.reminders = appData.reminders || [];
    appData.inbox = appData.inbox || [];
    appData.finance.income.forEach((entry) => {
      if (!entry.taxMode) entry.taxMode = Number(entry.deductionPercent) > 0 ? "manual" : "auto";
    });
    appData.finance.debts.forEach((debt) => {
      debt.debtType = normalizedDebtType(debt);
    });
  }

  function deepMerge(base, incoming) {
    if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base;
    if (!base || typeof base !== "object") return incoming ?? base;
    const output = { ...base };
    Object.keys(incoming || {}).forEach((key) => {
      if (Array.isArray(output[key])) output[key] = Array.isArray(incoming[key]) ? incoming[key] : output[key];
      else if (output[key] && typeof output[key] === "object") output[key] = deepMerge(output[key], incoming[key]);
      else output[key] = incoming[key];
    });
    return output;
  }

  function dateString(date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function parseDate(value) {
    if (!value) return null;
    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function addYears(date, years) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + years);
    return d;
  }

  function daysBetween(start, end) {
    const a = parseDate(start);
    const b = parseDate(end);
    if (!a || !b) return 0;
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }

  function startOfWeek(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  function endOfWeek(date) {
    return addDays(startOfWeek(date), 6);
  }

  function startOfMonth(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function endOfMonth(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }

  function calculateDateRange(span, custom) {
    const now = new Date();
    const startToday = dateString(now);
    if (span === "today") return { start: startToday, end: startToday, label: "Today" };
    if (span === "week") return { start: dateString(startOfWeek(now)), end: dateString(endOfWeek(now)), label: "This week" };
    if (span === "month") return { start: dateString(startOfMonth(now)), end: dateString(endOfMonth(now)), label: "This month" };
    if (span === "paycheck") return { start: startToday, end: dateString(addDays(now, 13)), label: "Paycheck cycle" };
    if (span === "7") return { start: startToday, end: dateString(addDays(now, 6)), label: "7 days" };
    if (span === "14") return { start: startToday, end: dateString(addDays(now, 13)), label: "14 days" };
    if (span === "30") return { start: startToday, end: dateString(addDays(now, 29)), label: "30 days" };
    const start = custom?.start || startToday;
    const end = custom?.end || start;
    return start <= end ? { start, end, label: "Custom range" } : { start: end, end: start, label: "Custom range" };
  }

  function safetyForecastRange(selectedRange) {
    const start = today();
    const thirtyDayEnd = dateString(addDays(new Date(), 29));
    const end = selectedRange?.end && selectedRange.end > thirtyDayEnd ? selectedRange.end : thirtyDayEnd;
    return { start, end, label: selectedRange?.end && selectedRange.end > thirtyDayEnd ? "Selected future range" : "Next 30 days" };
  }

  function dateInRange(value, range) {
    if (!value) return false;
    return value >= range.start && value <= range.end;
  }

  function isBeforeToday(value) {
    return value && value < today();
  }

  function formatCurrency(value) {
    const amount = Number(value) || 0;
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
  }

  function formatCompactCurrency(value) {
    const amount = Number(value) || 0;
    if (Math.abs(amount) < 1000) return formatCurrency(amount);
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(amount);
  }

  function formatNumber(value, digits = 0) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(Number(value) || 0);
  }

  function formatDate(value) {
    const date = parseDate(value);
    if (!date) return "No date";
    return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date);
  }

  function formatLongDate(value) {
    const date = parseDate(value);
    if (!date) return "No date";
    return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(date);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function pct(done, total) {
    if (!total) return 0;
    return Math.round((done / total) * 100);
  }

  function clamp(value, min = 0, max = 100) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function sum(list, selector) {
    return list.reduce((total, item) => total + (Number(selector(item)) || 0), 0);
  }

  function findById(list, id) {
    return list.find((item) => item.id === id);
  }

  function deleteById(list, id) {
    const index = list.findIndex((item) => item.id === id);
    if (index >= 0) list.splice(index, 1);
  }

  function removeById(list, id) {
    const index = list.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const [item] = list.splice(index, 1);
    return { item, index };
  }

  function sortByDate(list, key = "dueDate") {
    return [...list].sort((a, b) => String(a[key] || "9999-12-31").localeCompare(String(b[key] || "9999-12-31")));
  }

  function sortIncomeEntries(list) {
    return [...list].sort((a, b) => String(incomeDate(b) || "").localeCompare(String(incomeDate(a) || "")));
  }

  function normalizedDebtType(debt = {}) {
    const value = String(debt.debtType || "").toLowerCase();
    if (["credit-card", "loan", "other"].includes(value)) return value;
    const name = String(debt.name || "").toLowerCase();
    if (/\b(loan|student|auto|car|personal)\b/.test(name)) return "loan";
    if (/\b(card|credit|visa|mastercard|amex|discover)\b/.test(name)) return "credit-card";
    return "credit-card";
  }

  function creditCardDebts() {
    return appData.finance.debts.filter((debt) => normalizedDebtType(debt) === "credit-card");
  }

  function icon(name) {
    const icons = {
      grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />',
      check: '<path d="M20 6 9 17l-5-5" />',
      wallet: '<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 0V6a2 2 0 0 1 2-2h12" /><path d="M16 13h.01" />',
      book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />',
      more: '<path d="M5 12h.01M12 12h.01M19 12h.01" />',
      x: '<path d="M18 6 6 18M6 6l12 12" />',
      plus: '<path d="M12 5v14M5 12h14" />',
      edit: '<path d="M12 20h9" /><path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5z" />',
      trash: '<path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 16h10l1-16" />',
      done: '<path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />',
      undo: '<path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-1" />',
      calendar: '<path d="M8 2v4M16 2v4M3 10h18" /><path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />',
      chart: '<path d="M3 3v18h18" /><path d="M7 15v-5M12 15V7M17 15v-9" />',
      upload: '<path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M20 16v4H4v-4" />',
      download: '<path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M20 20H4" />',
      settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.05.05a2 2 0 0 1-2.83 2.83l-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.03.04a2 2 0 0 1-3.94 0L10 20a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.05.05a2 2 0 0 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.04-.03a2 2 0 0 1 0-3.94L4 10a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.05-.05a2 2 0 0 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.03-.04a2 2 0 0 1 3.94 0L14 4a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.05-.05a2 2 0 0 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.4 9c.18.35.38.67.6 1l.04.03a2 2 0 0 1 0 3.94L20 14a1.7 1.7 0 0 0-.6 1z" />',
      circle: '<circle cx="12" cy="12" r="9" />',
      target: '<circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" />',
      spark: '<path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />'
    };
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.circle}</svg>`;
  }

  function applyAccent() {
    const accent = appData.settings.accent || defaultSettings().accent;
    const rgb = hexToRgb(accent);
    const second = accentPair(accent);
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    document.documentElement.style.setProperty("--accent-2", second);
    document.documentElement.style.setProperty("--accent-contrast", accentContrast(accent));
  }

  function hexToRgb(hex) {
    const clean = String(hex || "#f7f7ff").replace("#", "");
    const value = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
    const int = Number.parseInt(value, 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255
    };
  }

  function safeHexColor(value, fallback = "#6f7685") {
    const color = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
  }

  function rgbText(hex) {
    const rgb = hexToRgb(safeHexColor(hex));
    return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
  }

  function accentPair(hex) {
    const pairs = {
      "#f7f7ff": "#aeb3c2",
      "#c8ccd6": "#f7f7ff",
      "#6f7685": "#c8ccd6",
      "#25d8ff": "#86f0ff",
      "#7c5cff": "#25d8ff",
      "#9b8cff": "#d2ccff",
      "#32d98f": "#9ff3c7",
      "#ffd166": "#fff0b3",
      "#ff6b8a": "#ffc2ce",
      "#ff9f43": "#ffd6a6"
    };
    return pairs[String(hex).toLowerCase()] || "#aeb3c2";
  }

  function accentContrast(hex) {
    const { r, g, b } = hexToRgb(hex);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? "#050509" : "#f7f7ff";
  }

  function setupNavIcons() {
    document.querySelectorAll("[data-icon]").forEach((el) => {
      el.innerHTML = icon(el.dataset.icon);
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function syncConfigured() {
    return Boolean(syncState.enabled && syncState.endpoint && syncState.account && syncState.key);
  }

  function syncAuthHeaders(json = false) {
    return {
      ...(json ? { "Content-Type": "application/json" } : {}),
      "X-Planner-Account": syncState.account,
      "X-Planner-Key": syncState.key,
      "X-Planner-Client": syncState.clientId
    };
  }

  function setSyncStatus(status, shouldRender = false) {
    syncState.status = status;
    saveSync();
    if (shouldRender && ui.activeTab === "more" && ui.moreView === "settings") render();
  }

  function queueSyncPush() {
    if (!syncConfigured()) return;
    clearTimeout(syncPushTimer);
    syncPushTimer = window.setTimeout(() => {
      pushSyncData(false);
    }, 900);
  }

  async function connectSync() {
    if (!syncConfigured()) {
      showToast("Enter sync endpoint, account, and sync key.");
      return;
    }
    const result = await pullSyncData(false);
    if (result === "empty" || result === "local-newer") await pushSyncData(true);
  }

  async function pullSyncData(manual = true) {
    if (!syncConfigured()) {
      showToast("Sign in to sync first.");
      return "missing";
    }
    try {
      setSyncStatus("Syncing...", true);
      const response = await fetch(syncState.endpoint, {
        method: "GET",
        headers: syncAuthHeaders()
      });
      if (!response.ok) throw new Error(`Sync pull failed (${response.status})`);
      const payload = await response.json();
      const remoteData = payload.data || null;
      if (!remoteData) {
        setSyncStatus("Signed in. No cloud data yet.", true);
        if (manual) showToast("No cloud data yet. Push this device to start.");
        return "empty";
      }

      const remoteUpdatedAt = payload.updatedAt || remoteData._meta?.updatedAt || "";
      const localUpdatedAt = appData._meta?.updatedAt || "";
      if (manual || !localUpdatedAt || remoteUpdatedAt > localUpdatedAt) {
        appData = remoteData;
        normalizeData();
        appData._meta.clientId = syncState.clientId;
        saveData({ skipSync: true, touch: false });
        applyAccent();
        syncState.lastSync = nowIso();
        setSyncStatus(`Pulled ${formatSyncTime(syncState.lastSync)}`, true);
        showToast("Planner data pulled from sync.");
        return "pulled";
      }

      syncState.lastSync = nowIso();
      setSyncStatus("This device is newer.", true);
      if (manual) showToast("This device already has the newest data.");
      return "local-newer";
    } catch (error) {
      setSyncStatus("Sync unavailable. Check the endpoint.", true);
      if (manual) showToast(error.message || "Sync pull failed.");
      return "error";
    }
  }

  async function pushSyncData(manual = true) {
    if (!syncConfigured() || syncInFlight) return "missing";
    syncInFlight = true;
    try {
      setSyncStatus("Syncing...", manual);
      const response = await fetch(syncState.endpoint, {
        method: "POST",
        headers: syncAuthHeaders(true),
        body: JSON.stringify({
          data: appData,
          updatedAt: appData._meta?.updatedAt || nowIso(),
          clientId: syncState.clientId
        })
      });
      if (!response.ok) throw new Error(`Sync push failed (${response.status})`);
      syncState.lastSync = nowIso();
      setSyncStatus(`Pushed ${formatSyncTime(syncState.lastSync)}`, manual);
      if (manual) showToast("Planner data pushed to sync.");
      return "pushed";
    } catch (error) {
      setSyncStatus("Sync unavailable. Check the endpoint.", manual);
      if (manual) showToast(error.message || "Sync push failed.");
      return "error";
    } finally {
      syncInFlight = false;
    }
  }

  function formatSyncTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
  }

  function setUndo(label, restore) {
    undoState = { scope: "finance", label, restore };
  }

  function undoFinanceDelete() {
    if (!undoState?.restore) {
      showToast("Nothing to undo.");
      return;
    }
    undoState.restore();
    const label = undoState.label;
    undoState = null;
    saveData();
    render();
    showToast(`Restored ${label}.`);
  }

  function deleteFinanceItem(list, id, label) {
    const removed = removeById(list, id);
    if (!removed) return false;
    setUndo(label, () => {
      list.splice(Math.min(removed.index, list.length), 0, removed.item);
    });
    return true;
  }

  function render(options = {}) {
    const quiet = Boolean(options.quiet);
    app.classList.toggle("is-soft-render", quiet);
    saveUi();
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === ui.activeTab);
    });

    if (ui.activeTab === "dashboard") app.innerHTML = renderDashboard();
    if (ui.activeTab === "tasks") app.innerHTML = renderTasks();
    if (ui.activeTab === "finance") app.innerHTML = renderFinance();
    if (ui.activeTab === "school") app.innerHTML = renderSchool();
    if (ui.activeTab === "more") app.innerHTML = renderMore();
  }

  function finishAppLoad() {
    const minimumLoadMs = 520;
    const delay = Math.max(0, minimumLoadMs - (performance.now() - bootStarted));
    window.setTimeout(() => {
      document.body.classList.remove("app-loading");
      document.body.classList.add("app-ready");
      const loader = document.querySelector(".app-loader");
      if (loader) window.setTimeout(() => loader.remove(), 300);
    }, delay);
  }

  function actionButton(action, id, label, iconName, className = "icon-btn", extra = {}) {
    const attrs = Object.entries(extra)
      .map(([key, value]) => `data-${key}="${escapeHtml(value)}"`)
      .join(" ");
    const text = className === "icon-btn" ? "" : `<span>${escapeHtml(label)}</span>`;
    return `<button type="button" class="${className}" data-action="${action}" data-id="${escapeHtml(id || "")}" ${attrs} title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${icon(iconName)}${text}</button>`;
  }

  function metric(label, value, note = "") {
    return `
      <article class="card metric-card">
        <div class="metric-label">${escapeHtml(label)}</div>
        <div>
          <div class="metric-value">${value}</div>
          ${note ? `<div class="metric-note">${escapeHtml(note)}</div>` : ""}
        </div>
      </article>
    `;
  }

  function ringMetric(label, value, percent, note = "") {
    return `
      <article class="card ring-card">
        <div class="ring" style="--value:${clamp(percent)}">
          <span class="ring-value">${value}</span>
        </div>
        <div>
          <p class="ring-label">${escapeHtml(label)}</p>
          ${note ? `<p class="ring-note">${escapeHtml(note)}</p>` : ""}
        </div>
      </article>
    `;
  }

  function progressRow(label, percent, detail = "") {
    return `
      <div class="progress-row">
        <div class="progress-label"><span>${escapeHtml(label)}</span><span>${percent}%${detail ? ` · ${escapeHtml(detail)}` : ""}</span></div>
        <div class="progress"><span style="width:${clamp(percent)}%"></span></div>
      </div>
    `;
  }

  function itemCard({ title, meta = [], note = "", actions = "", className = "" }) {
    const metaHtml = meta.filter(Boolean).map((m) => `<span>${escapeHtml(m)}</span>`).join("");
    return `
      <article class="item-card ${className}">
        <div class="item-main">
          <p class="item-title">${escapeHtml(title)}</p>
          ${metaHtml ? `<div class="item-meta">${metaHtml}</div>` : ""}
          ${note ? `<p class="tiny">${escapeHtml(note)}</p>` : ""}
        </div>
        <div class="item-actions">${actions}</div>
      </article>
    `;
  }

  function emptyState(message) {
    return `<div class="empty">${escapeHtml(message)}</div>`;
  }

  function topbar(title, eyebrow, action = "") {
    return `
      <section class="topbar">
        <div>
          <p class="eyebrow">${escapeHtml(eyebrow)}</p>
          <h1>${escapeHtml(title)}</h1>
        </div>
        ${action ? `<div class="actions">${action}</div>` : ""}
      </section>
    `;
  }

  function rangeToggle(kind, active) {
    const spans = kind === "dashboard"
      ? [
          ["today", "Today"],
          ["week", "This week"],
          ["month", "This month"],
          ["paycheck", "Paycheck cycle"],
          ["custom", "Custom range"]
        ]
      : [
          ["today", "Today"],
          ["7", "7 days"],
          ["14", "14 days"],
          ["30", "30 days"],
          ["month", "This month"],
          ["paycheck", "Paycheck cycle"],
          ["custom", "Custom"]
        ];
    return `<div class="segmented">${spans.map(([span, label]) => `<button type="button" class="${active === span ? "active" : ""}" data-action="set-${kind}-span" data-span="${span}">${label}</button>`).join("")}</div>`;
  }

  function dashboardViewToggle() {
    const views = [
      ["cards", "Squares"],
      ["rings", "Rings"]
    ];
    return `<div class="segmented">${views.map(([view, label]) => `<button type="button" class="${ui.dashboardStyle === view ? "active" : ""}" data-action="set-dashboard-style" data-style="${view}">${label}</button>`).join("")}</div>`;
  }

  function customRangeControls(kind, range) {
    if ((kind === "dashboard" && ui.dashboardSpan !== "custom") || (kind === "finance" && ui.financeSpan !== "custom")) return "";
    return `
      <div class="custom-range">
        <label class="field">
          <span class="tiny">Start</span>
          <input type="date" data-${kind}-custom="start" value="${escapeHtml(range.start)}">
        </label>
        <label class="field">
          <span class="tiny">End</span>
          <input type="date" data-${kind}-custom="end" value="${escapeHtml(range.end)}">
        </label>
      </div>
    `;
  }

  function renderDashboard() {
    const range = calculateDateRange(ui.dashboardSpan, ui.dashboardCustom);
    const finance = calculateFinance(range);
    const safetyRange = safetyForecastRange(range);
    const safeFinance = calculateFinance(safetyRange);
    const habit = habitStats(range);
    const task = taskStats(range);
    const school = schoolStats(range);
    const nutrition = nutritionStats(range);
    const reminders = remindersInRange(range).filter((item) => !item.completed);
    const todayFocus = getTodayFocus();
    const weekly = weeklySummary();
    const openBills = safeFinance.billOccurrences.filter((bill) => !bill.paid);
    const obligationCount = openBills.length + safeFinance.debtPaymentOccurrences.length;
    const obligationTotal = safeFinance.billsDue + safeFinance.debtPayments;
    const dashboardMetrics = `
      ${metric("Tasks completed", `${task.completed}/${task.total}`, `${task.percent}% complete`)}
      ${metric("Habits completed", `${habit.completed}/${habit.total}`, `${habit.streak} day streak`)}
      ${metric("Safe-to-spend", formatCurrency(safeFinance.safeToSpend), `Protected through ${formatDate(safetyRange.end)}`)}
      ${metric("Projected balance", formatCurrency(finance.projectedBalance), range.label)}
      ${metric("Bills and debt", formatCurrency(obligationTotal), `${obligationCount} due`)}
      ${metric("Assignments due", String(school.openDue.length), `${school.overdue.length} overdue`)}
    `;
    const ringMetrics = `
      ${ringMetric("Tasks", `${task.completed}/${task.total}`, task.percent, `${task.percent}% complete`)}
      ${ringMetric("Habits", `${habit.percent}%`, habit.percent, `${habit.streak} day streak`)}
      ${ringMetric("Safe to spend", formatCurrency(safeFinance.safeToSpend), safeFinance.currentMoney ? (safeFinance.safeToSpend / safeFinance.currentMoney) * 100 : 0, safetyRange.label)}
      ${ringMetric("Projected", formatCurrency(finance.projectedBalance), finance.currentMoney ? (finance.projectedBalance / Math.max(finance.currentMoney, 1)) * 100 : 0, range.label)}
      ${ringMetric("School", String(school.openDue.length), school.total ? 100 - school.percent : 0, `${school.overdue.length} overdue`)}
      ${ringMetric("Bills + debt", formatCurrency(obligationTotal), finance.currentMoney ? (obligationTotal / Math.max(finance.currentMoney, 1)) * 100 : 0, `${obligationCount} due`)}
    `;

    return `
      <div class="view">
        ${topbar("Today", formatLongDate(today()), actionButton("open-quick-add", "", "Quick add", "plus", "primary"))}

        <section class="card hero-card">
          <div class="hero-content">
            <div class="hero-row">
              <div>
                <p class="eyebrow">Selected span</p>
                <h2>${escapeHtml(range.label)}</h2>
                <p class="muted">${escapeHtml(formatDate(range.start))} to ${escapeHtml(formatDate(range.end))}</p>
              </div>
            </div>
            ${rangeToggle("dashboard", ui.dashboardSpan)}
            ${customRangeControls("dashboard", range)}
            ${dashboardViewToggle()}
            <div class="stat-strip">
              <div class="strip-item"><span class="strip-value">${task.completed}/${task.total}</span><span class="strip-label">Tasks</span></div>
              <div class="strip-item"><span class="strip-value">${habit.percent}%</span><span class="strip-label">Habits</span></div>
              <div class="strip-item"><span class="strip-value">${formatCompactCurrency(safeFinance.safeToSpend)}</span><span class="strip-label">Safe to spend</span></div>
            </div>
          </div>
        </section>

        <section class="dashboard-overview" aria-label="Dashboard overview">
          <article class="card overview-card overview-card-primary">
            <div>
              <p class="eyebrow">Today focus</p>
              <h2 class="overview-value">${todayFocus.length}</h2>
              <p class="muted">${todayFocus.length === 1 ? "open item" : "open items"} due today</p>
            </div>
            <div class="overview-pairs">
              <span><b>${task.completed}/${task.total}</b> tasks</span>
              <span><b>${habit.percent}%</b> habits</span>
            </div>
          </article>
          <article class="card overview-card">
            <div>
              <p class="eyebrow">Money</p>
              <h2 class="overview-value">${formatCurrency(safeFinance.safeToSpend)}</h2>
              <p class="muted">safe through ${escapeHtml(formatDate(safetyRange.end))}</p>
            </div>
            <div class="overview-pairs">
              <span><b>${formatCompactCurrency(finance.currentMoney)}</b> current</span>
              <span><b>${formatCompactCurrency(finance.projectedBalance)}</b> projected</span>
            </div>
          </article>
          <article class="card overview-card">
            <div>
              <p class="eyebrow">School</p>
              <h2 class="overview-value">${school.openDue.length}</h2>
              <p class="muted">assignments in ${escapeHtml(range.label.toLowerCase())}</p>
            </div>
            <div class="overview-pairs">
              <span><b>${school.completed.length}/${school.total}</b> completed</span>
              <span><b>${school.overdue.length}</b> overdue</span>
            </div>
          </article>
          <article class="card overview-card">
            <div>
              <p class="eyebrow">Bills + debt</p>
              <h2 class="overview-value">${formatCompactCurrency(obligationTotal)}</h2>
              <p class="muted">${obligationCount} upcoming ${obligationCount === 1 ? "obligation" : "obligations"}</p>
            </div>
            <div class="overview-pairs">
              <span><b>${openBills.length}</b> bills</span>
              <span><b>${safeFinance.debtPaymentOccurrences.length}</b> debt payments</span>
            </div>
          </article>
        </section>

        <section class="${ui.dashboardStyle === "rings" ? "ring-grid" : "metric-grid"}">
          ${ui.dashboardStyle === "rings" ? ringMetrics : dashboardMetrics}
        </section>

        <section class="two-col">
          <div class="card panel section">
            <div class="section-header">
              <h2>Today focus</h2>
              ${actionButton("add-task", "", "Add task", "plus", "secondary")}
            </div>
            <div class="list">
              ${todayFocus.length ? todayFocus.map(renderFocusItem).join("") : emptyState("No open items due today.")}
            </div>
          </div>

          <div class="card panel section">
            <div class="section-header">
              <h2>Upcoming</h2>
              ${actionButton("add-reminder", "", "Add reminder", "plus", "secondary")}
            </div>
            <div class="list">
              ${renderUpcomingDashboard(safeFinance, school, reminders)}
            </div>
          </div>
        </section>

        <section class="card panel section">
          <div class="section-header">
            <h2>Weekly progress</h2>
            <span class="tiny">${escapeHtml(formatDate(weekly.range.start))} to ${escapeHtml(formatDate(weekly.range.end))}</span>
          </div>
          ${progressRow("Tasks", weekly.tasks.percent, `${weekly.tasks.completed}/${weekly.tasks.total}`)}
          ${progressRow("Habits", weekly.habits.percent, `${weekly.habits.completed}/${weekly.habits.total}`)}
          ${progressRow("School", weekly.school.percent, `${weekly.school.completed.length}/${weekly.school.total}`)}
          ${progressRow("Nutrition", appData.settings.nutrition ? nutrition.caloriePercent : 0, appData.settings.nutrition ? `${formatNumber(nutrition.calories)} cal` : "Off")}
        </section>
      </div>
    `;
  }

  function getTodayFocus() {
    const habitItems = appData.dailyHabits
      .filter((habit) => !isHabitDone(habit.id, today()))
      .map((habit) => ({ type: "habit", ...habit }));
    const taskItems = appData.tasks
      .filter((task) => !task.completed && task.dueDate === today())
      .map((task) => ({ type: "task", ...task }));
    const assignmentItems = appData.school.assignments
      .filter((assignment) => !assignmentComplete(assignment) && assignment.dueDate === today())
      .map((assignment) => ({ type: "assignment", ...assignment }));
    return [...habitItems, ...taskItems, ...assignmentItems].slice(0, 6);
  }

  function renderFocusItem(item) {
    if (item.type === "habit") {
      return itemCard({
        title: item.title,
        meta: ["Daily habit"],
        actions: actionButton("toggle-daily-habit", item.id, "Complete", "check")
      });
    }
    if (item.type === "assignment") {
      return itemCard({
        title: item.title,
        meta: ["School", item.classId ? className(item.classId) : "", item.priority],
        actions: actionButton("edit-assignment", item.id, "Edit", "edit")
      });
    }
    return itemCard({
      title: item.title,
      meta: [item.category, item.priority],
      actions: actionButton("toggle-task", item.id, "Complete", "check")
    });
  }

  function renderUpcomingDashboard(finance, school, reminders) {
    const billCards = finance.billOccurrences.slice(0, 2).map((bill) =>
      itemCard({
        title: bill.name,
        meta: ["Bill", formatCurrency(bill.amount), formatDate(bill.date)],
        className: bill.paid ? "paid" : "",
        actions: actionButton("toggle-bill-paid", bill.id, bill.paid ? "Mark unpaid" : "Mark paid", bill.paid ? "undo" : "check")
      })
    );
    const debtCards = finance.debtPaymentOccurrences.slice(0, 2).map((payment) =>
      itemCard({
        title: payment.name,
        meta: ["Debt payment", formatCurrency(payment.amount), formatDate(payment.date)],
        actions: actionButton("edit-debt", payment.debtId, "Edit debt", "edit")
      })
    );
    const assignmentCards = school.openDue.slice(0, 2).map((assignment) =>
      itemCard({
        title: assignment.title,
        meta: ["Assignment", assignment.classId ? className(assignment.classId) : "", formatDate(assignment.dueDate)],
        actions: actionButton("edit-assignment", assignment.id, "Edit", "edit")
      })
    );
    const reminderCards = reminders.slice(0, 2).map((reminder) =>
      itemCard({
        title: reminder.title,
        meta: ["Reminder", formatDate(reminder.date), reminder.time || ""],
        actions: actionButton("toggle-reminder", reminder.id, "Complete", "check")
      })
    );
    const cards = [...billCards, ...debtCards, ...assignmentCards, ...reminderCards];
    return cards.length ? cards.join("") : emptyState("No upcoming bills, debt payments, assignments, or reminders in this span.");
  }

  function renderTasks() {
    const dayHabits = habitStats(calculateDateRange("today"));
    const weekHabits = habitStats(calculateDateRange("week"));
    const range = calculateDateRange("week");
    const stats = taskStats(range);
    const filtered = ui.taskFilter === "All" ? appData.tasks : appData.tasks.filter((task) => task.category === ui.taskFilter);
    const todayTasks = filtered.filter((task) => task.dueDate === today() && !task.completed);
    const overdue = filtered.filter((task) => !task.completed && isBeforeToday(task.dueDate));
    const upcoming = sortByDate(filtered.filter((task) => !task.completed && task.dueDate > today())).slice(0, 20);

    return `
      <div class="view">
        ${topbar("Tasks", "Planner checklist", actionButton("add-task", "", "Add task", "plus", "primary"))}

        <section class="metric-grid">
          ${metric("Daily completion", `${dayHabits.percent}%`, `${dayHabits.completed}/${dayHabits.total} today`)}
          ${metric("Weekly habits", `${weekHabits.percent}%`, `${weekHabits.completed}/${weekHabits.total}`)}
          ${metric("Habit streak", `${dayHabits.streak}`, "Consecutive full days")}
          ${metric("Task completion", `${stats.percent}%`, `${stats.completed}/${stats.total} this week`)}
        </section>

        <section class="card panel section">
          <div class="section-header">
            <h2>Daily preset habits</h2>
            ${actionButton("add-daily-habit", "", "Add habit", "plus", "secondary")}
          </div>
          ${progressRow("Today", dayHabits.percent, `${dayHabits.completed}/${dayHabits.total}`)}
          <div class="list">
            ${appData.dailyHabits.length ? appData.dailyHabits.map(renderDailyHabit).join("") : emptyState("Add recurring daily habits you do not want to rewrite.")}
          </div>
        </section>

        <section class="card panel section">
            <div class="section-header">
              <h2>Custom tasks</h2>
              <div class="actions">
                ${actionButton("add-task-category", "", "Add category", "plus", "secondary")}
                <select id="task-filter" aria-label="Filter tasks">
                  ${["All", ...appData.settings.taskCategories].map((cat) => `<option value="${escapeHtml(cat)}" ${ui.taskFilter === cat ? "selected" : ""}>${escapeHtml(cat)}</option>`).join("")}
                </select>
              </div>
            </div>
          <div class="details-stack">
            ${renderTaskGroup("Today", todayTasks)}
            ${renderTaskGroup("Overdue", overdue)}
            ${renderTaskGroup("Upcoming", upcoming)}
          </div>
        </section>
      </div>
    `;
  }

  function renderDailyHabit(habit) {
    const done = isHabitDone(habit.id, today());
    return itemCard({
      title: habit.title,
      meta: [done ? "Complete today" : "Open today"],
      className: done ? "complete" : "",
      actions: `
        ${actionButton("toggle-daily-habit", habit.id, done ? "Uncheck" : "Complete", done ? "undo" : "check")}
        ${actionButton("edit-daily-habit", habit.id, "Edit", "edit")}
        ${actionButton("delete-daily-habit", habit.id, "Delete", "trash")}
      `
    });
  }

  function renderTaskGroup(title, tasks) {
    return `
      <details class="card" open>
        <summary><span>${escapeHtml(title)}</span><span class="tiny">${tasks.length}</span></summary>
        <div class="details-body">
          <div class="list">
            ${tasks.length ? sortByDate(tasks).map(renderTaskItem).join("") : emptyState(`No ${title.toLowerCase()} tasks.`)}
          </div>
        </div>
      </details>
    `;
  }

  function renderTaskItem(task) {
    return itemCard({
      title: task.title,
      meta: [task.category, task.priority, task.dueDate ? formatDate(task.dueDate) : "No due date", task.reminderTime ? `Reminder ${task.reminderTime}` : ""],
      note: task.notes,
      className: task.completed ? "complete" : "",
      actions: `
        ${actionButton("toggle-task", task.id, task.completed ? "Uncomplete" : "Complete", task.completed ? "undo" : "check")}
        ${actionButton("edit-task", task.id, "Edit", "edit")}
        ${actionButton("delete-task", task.id, "Delete", "trash")}
      `
    });
  }

  function renderFinance() {
    const range = calculateDateRange(ui.financeSpan, ui.financeCustom);
    const finance = calculateFinance(range);
    const safetyRange = safetyForecastRange(range);
    const safeFinance = calculateFinance(safetyRange);
    const financeActions = actionButton("add-spending", "", "Add spending", "plus", "primary");

    return `
      <div class="view">
        ${topbar("Finance", "Money calculations", financeActions)}

        <section class="card hero-card">
          <div class="hero-content">
            <div>
              <p class="eyebrow">Forecast span</p>
              <h2>${escapeHtml(range.label)}</h2>
              <p class="muted">${escapeHtml(formatDate(range.start))} to ${escapeHtml(formatDate(range.end))}</p>
            </div>
            ${rangeToggle("finance", ui.financeSpan)}
            ${customRangeControls("finance", range)}
            <div class="stat-strip">
              <div class="strip-item"><span class="strip-value">${formatCompactCurrency(finance.currentMoney)}</span><span class="strip-label">Current</span></div>
              <div class="strip-item"><span class="strip-value">${formatCompactCurrency(finance.projectedBalance)}</span><span class="strip-label">Projected</span></div>
              <div class="strip-item"><span class="strip-value">${formatCompactCurrency(safeFinance.safeToSpend)}</span><span class="strip-label">Safe to spend</span></div>
            </div>
          </div>
        </section>

        <section class="metric-grid">
          ${metric("Total current money", formatCurrency(finance.currentMoney), "Checking, savings, cash, other")}
          ${metric("Upcoming bills", formatCurrency(finance.billsDue), `${finance.billOccurrences.length} due in range`)}
          ${metric("Debt payments", formatCurrency(safeFinance.debtPayments), `${safeFinance.debtPaymentOccurrences.length} due in ${safetyRange.label.toLowerCase()}`)}
          ${metric("Safe-to-spend", formatCurrency(safeFinance.safeToSpend), `Protected through ${formatDate(safetyRange.end)}`)}
          ${metric("Investments", formatCurrency(finance.investmentValue), `${formatCurrency(finance.investmentGain)} gain/loss`)}
          ${metric("Net worth estimate", formatCurrency(finance.netWorth), "Money + investments - debt")}
          ${metric("Daily spending limit", formatCurrency(safeFinance.dailyLimit), `${daysBetween(safetyRange.start, safetyRange.end)} protected days`)}
        </section>

        <section class="details-stack">
          ${financeDetails("Current money", renderAccounts(finance, safeFinance, safetyRange), "add-account", "Add account")}
          ${financeDetails("Income", renderIncome(finance, range), "add-income", "Add income")}
          ${financeDetails("Bills and subscriptions", renderBills(finance), "add-bill", "Add bill")}
          ${financeDetails("Spending", renderSpending(range), "add-spending", "Add spending")}
          ${financeDetails("Debt repayment", renderDebts(finance), "add-debt", "Add debt")}
          ${financeDetails("Investments", renderInvestments(finance), "add-investment", "Add investment")}
          ${financeDetails("Forecast", renderForecast(finance, range, safeFinance, safetyRange), "", "")}
        </section>
      </div>
    `;
  }

  function financeDetails(title, body, action, label) {
    return `
      <details class="card" open>
        <summary><span>${escapeHtml(title)}</span>${action ? actionButton(action, "", label, "plus", "secondary") : "<span></span>"}</summary>
        <div class="details-body">${body}</div>
      </details>
    `;
  }

  function renderAccounts(finance, safeFinance = finance, safetyRange = finance.range) {
    return `
      <div class="metric-grid">
        ${metric("Total current money", formatCurrency(finance.currentMoney), "")}
        ${metric("Safe-to-spend", formatCurrency(safeFinance.safeToSpend), `After obligations through ${formatDate(safetyRange.end)}`)}
      </div>
      <div class="list">
        ${appData.finance.accounts.length ? appData.finance.accounts.map((account) => itemCard({
          title: account.name,
          meta: [account.type || "Account", formatCurrency(account.balance)],
          actions: `${actionButton("edit-account", account.id, "Edit", "edit")}${actionButton("delete-account", account.id, "Delete", "trash")}`
        })).join("") : emptyState("Add checking, savings, cash, or other balances.")}
      </div>
    `;
  }

  function renderIncome(finance, range) {
    const incomeInRange = appData.finance.income.filter((entry) => dateInRange(incomeDate(entry), range));
    const outsideRange = appData.finance.income.filter((entry) => !dateInRange(incomeDate(entry), range));
    const bySource = groupTotals(incomeInRange, "source", entryNetIncome);
    return `
      <div class="metric-grid">
        ${metric("Gross earnings", formatCurrency(finance.grossIncome), "")}
        ${metric("Estimated taxes", formatCurrency(finance.taxTotal), "Federal, FICA, Ohio, local")}
        ${metric("Estimated net", formatCurrency(finance.netIncome), "")}
        ${metric("Weekly income", formatCurrency(calculateFinance(calculateDateRange("week")).netIncome), "")}
        ${metric("Monthly income", formatCurrency(calculateFinance(calculateDateRange("month")).netIncome), "")}
      </div>
      ${renderBarChart(bySource, finance.netIncome)}
      <div class="list">
        ${incomeInRange.length ? sortIncomeEntries(incomeInRange).map((entry) => renderIncomeItem(entry, range)).join("") : emptyState("No income logged in this range.")}
      </div>
      ${outsideRange.length ? `
        <div class="mini-section">
          <h3>Outside this range</h3>
          <div class="list">
            ${sortIncomeEntries(outsideRange).map((entry) => renderIncomeItem(entry, range)).join("")}
          </div>
        </div>
      ` : ""}
    `;
  }

  function renderIncomeItem(entry, range = null) {
    const gross = entryGrossIncome(entry);
    const net = entryNetIncome(entry);
    const tax = entryTaxEstimate(entry);
    const outsideRange = range && !dateInRange(incomeDate(entry), range);
    const taxNote = entry.taxMode === "manual"
      ? `Manual tax: ${formatCurrency(tax.total)} (${formatNumber(tax.effectiveRate, 1)}%)`
      : `Tax estimate: ${formatCurrency(tax.total)} (${formatNumber(tax.effectiveRate, 1)}%) · Fed ${formatCurrency(tax.federal)}, FICA ${formatCurrency(tax.socialSecurity + tax.medicare)}, OH ${formatCurrency(tax.ohio)}${tax.local ? `, local ${formatCurrency(tax.local)}` : ""}`;
    return itemCard({
      title: entry.source || "Income",
      meta: [entry.type === "hourly" ? "Hourly" : "Manual", entry.taxMode === "manual" ? "Manual tax" : "Auto Ohio tax", `Gross ${formatCurrency(gross)}`, `Net ${formatCurrency(net)}`, formatDate(incomeDate(entry)), outsideRange ? "Outside selected range" : ""],
      note: [taxNote, entry.notes].filter(Boolean).join(" · "),
      actions: `${actionButton("edit-income", entry.id, "Edit", "edit")}${actionButton("delete-income", entry.id, "Delete", "trash")}`
    });
  }

  function renderBills(finance) {
    return `
      <div class="metric-grid">
        ${metric("Bills due soon", formatCurrency(finance.billsDue), "Selected range")}
        ${metric("After bills", formatCurrency(finance.currentMoney - finance.billsDue), "Current minus unpaid bills")}
      </div>
      <div class="list">
        ${appData.finance.bills.length ? sortByDate(appData.finance.bills, "dueDate").map(renderBillItem).join("") : emptyState("Add recurring bills and subscriptions.")}
      </div>
    `;
  }

  function renderBillItem(bill) {
    return itemCard({
      title: bill.name,
      meta: [formatCurrency(bill.amount), formatDate(bill.dueDate), bill.frequency, bill.category, bill.paid ? "Paid" : "Unpaid"],
      note: bill.notes,
      className: bill.paid ? "paid" : "",
      actions: `
        ${actionButton("toggle-bill-paid", bill.id, bill.paid ? "Mark unpaid" : "Mark paid", bill.paid ? "undo" : "check")}
        ${actionButton("edit-bill", bill.id, "Edit", "edit")}
        ${actionButton("delete-bill", bill.id, "Delete", "trash")}
      `
    });
  }

  function renderSpending(range) {
    const entries = appData.finance.spending.filter((entry) => dateInRange(entry.date, range));
    const total = sum(entries, (entry) => entry.amount);
    const byCategory = groupTotals(entries, "category", (entry) => entry.amount);
    return `
      <div class="metric-grid">
        ${metric("Spending today", formatCurrency(sum(appData.finance.spending.filter((entry) => entry.date === today()), (entry) => entry.amount)), "")}
        ${metric("Spending this week", formatCurrency(sum(appData.finance.spending.filter((entry) => dateInRange(entry.date, calculateDateRange("week"))), (entry) => entry.amount)), "")}
        ${metric("Spending this month", formatCurrency(sum(appData.finance.spending.filter((entry) => dateInRange(entry.date, calculateDateRange("month"))), (entry) => entry.amount)), "")}
        ${metric("Average daily", formatCurrency(total / daysBetween(range.start, range.end)), "Selected range")}
      </div>
      ${renderBarChart(byCategory, total)}
      <div class="list">
        ${entries.length ? sortByDate(entries, "date").map(renderSpendingItem).join("") : emptyState("No spending logged in this range.")}
      </div>
    `;
  }

  function renderSpendingItem(entry) {
    const linkedDebt = entry.debtId ? findById(appData.finance.debts, entry.debtId) : null;
    return itemCard({
      title: entry.note || entry.category || "Spending",
      meta: [
        formatCurrency(entry.amount),
        entry.category,
        entry.necessary ? "Necessary" : "Optional",
        formatDate(entry.date),
        linkedDebt ? `Charged to ${linkedDebt.name}` : entry.paymentMethod || ""
      ],
      actions: `${actionButton("edit-spending", entry.id, "Edit", "edit")}${actionButton("delete-spending", entry.id, "Delete", "trash")}`
    });
  }

  function renderDebts(finance) {
    const creditCards = appData.finance.debts.filter((debt) => normalizedDebtType(debt) === "credit-card");
    const loans = appData.finance.debts.filter((debt) => normalizedDebtType(debt) === "loan");
    const otherDebts = appData.finance.debts.filter((debt) => normalizedDebtType(debt) === "other");
    return `
      <div class="metric-grid">
        ${metric("Total debt", formatCurrency(finance.totalDebt), "")}
        ${metric("Credit cards", formatCurrency(sum(creditCards, (debt) => debt.balance)), `${creditCards.length} card${creditCards.length === 1 ? "" : "s"}`)}
        ${metric("Loans", formatCurrency(sum(loans, (debt) => debt.balance)), `${loans.length} loan${loans.length === 1 ? "" : "s"}`)}
        ${metric("Debt payments due", formatCurrency(finance.debtPayments), `${finance.debtPaymentOccurrences.length} in selected range`)}
        ${metric("Monthly minimums", formatCurrency(sum(appData.finance.debts, (debt) => debt.minimumPayment)), "")}
      </div>
      <div class="debt-groups">
        ${renderDebtGroup("Credit cards", creditCards, "Spending can be charged to these cards and raise the balance automatically.")}
        ${renderDebtGroup("Loans", loans, "Student, auto, personal, or other installment debt.")}
        ${otherDebts.length ? renderDebtGroup("Other debts", otherDebts, "") : ""}
      </div>
    `;
  }

  function renderDebtGroup(title, debts, note = "") {
    return `
      <div class="mini-section debt-group">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${note ? `<p class="tiny">${escapeHtml(note)}</p>` : ""}
        </div>
        <div class="list">
          ${debts.length ? debts.map(renderDebtItem).join("") : emptyState(`No ${title.toLowerCase()} added.`)}
        </div>
      </div>
    `;
  }

  function renderDebtItem(debt) {
    const original = Number(debt.originalBalance) || Number(debt.balance) || 0;
    const balance = Number(debt.balance) || 0;
    const progress = original ? pct(original - balance, original) : 0;
    const targetPay = monthlyDebtTarget(debt);
    const reservedPayment = debtPaymentAmount(debt);
    return `
      <article class="item-card debt-card">
        <div class="debt-header">
          <p class="item-title debt-title">${escapeHtml(debt.name)}</p>
          <div class="item-actions debt-actions">
            ${actionButton("make-debt-payment", debt.id, "Make payment", "wallet")}
            ${actionButton("edit-debt", debt.id, "Edit", "edit")}
            ${actionButton("delete-debt", debt.id, "Delete", "trash")}
          </div>
        </div>
        <div class="item-main debt-main">
          <div class="debt-overview">
            <div class="debt-balance">
              <span>Main balance</span>
              <strong>${formatCurrency(balance)}</strong>
              <small>remaining</small>
            </div>
            <div class="debt-info-grid">
              <div class="debt-info">
                <span>Due date</span>
                <strong>${debt.dueDate ? formatDate(debt.dueDate) : "Not set"}</strong>
              </div>
              <div class="debt-info">
                <span>Minimum</span>
                <strong>${formatCurrency(debt.minimumPayment)}</strong>
              </div>
              <div class="debt-info">
                <span>Reserved</span>
                <strong>${formatCurrency(reservedPayment)}</strong>
              </div>
              <div class="debt-info">
                <span>APR</span>
                <strong>${debt.interestRate || 0}%</strong>
              </div>
              ${debt.targetPayoffDate ? `
                <div class="debt-info debt-info-wide">
                  <span>Monthly target</span>
                  <strong>${formatCurrency(targetPay)}</strong>
                </div>
              ` : ""}
            </div>
          </div>
          <div class="debt-progress-label">
            <span>Paid down</span>
            <strong>${clamp(progress)}%</strong>
          </div>
          <div class="progress" aria-label="Debt payoff progress"><span style="width:${clamp(progress)}%"></span></div>
        </div>
      </article>
    `;
  }

  function renderInvestments(finance) {
    const gainPct = finance.invested ? (finance.investmentGain / finance.invested) * 100 : 0;
    return `
      <div class="metric-grid">
        ${metric("Total invested", formatCurrency(finance.invested), "")}
        ${metric("Current value", formatCurrency(finance.investmentValue), "")}
        ${metric("Gain/loss", formatCurrency(finance.investmentGain), `${formatNumber(gainPct, 1)}%`)}
      </div>
      <div class="list">
        ${appData.finance.investments.length ? appData.finance.investments.map((investment) => itemCard({
          title: investment.name,
          meta: [investment.type, `Invested ${formatCurrency(investment.amountInvested)}`, `Current ${formatCurrency(investment.currentValue)}`],
          note: investment.notes,
          actions: `${actionButton("edit-investment", investment.id, "Edit", "edit")}${actionButton("delete-investment", investment.id, "Delete", "trash")}`
        })).join("") : emptyState("Add investments for a simple gain/loss estimate.")}
      </div>
    `;
  }

  function renderForecast(finance, range, safeFinance = finance, safetyRange = range) {
    return `
      <div class="metric-grid">
        ${metric("Projected balance", formatCurrency(finance.projectedBalance), "Current + income - bills - debt - spending - shopping")}
        ${metric("Safe-to-spend", formatCurrency(safeFinance.safeToSpend), `Protected through ${formatDate(safetyRange.end)}`)}
        ${metric("Expected income", formatCurrency(finance.netIncome), "Selected range")}
        ${metric("Upcoming bills", formatCurrency(finance.billsDue), "Unpaid bills")}
        ${metric("Debt payments", formatCurrency(safeFinance.debtPayments), `${safeFinance.debtPaymentOccurrences.length} due in ${safetyRange.label.toLowerCase()}`)}
        ${metric("Expected spending", formatCurrency(finance.spending), "Logged spending in range")}
        ${metric("Lowest balance", formatCurrency(safeFinance.lowestBalance), "Lowest protected balance")}
      </div>
      <p class="tiny">Safe-to-spend reserves upcoming bills, debt payments, logged spending, and open shopping before calculating the daily limit.</p>
    `;
  }

  function renderSchool() {
    const range = calculateDateRange("week");
    const stats = schoolStats(range);
    const byClass = appData.school.classes.map((klass) => classStats(klass.id));
    if (!validSchoolClassFilter(ui.schoolClassFilter)) ui.schoolClassFilter = "all";
    const filteredAssignments = filterSchoolAssignments(appData.school.assignments);
    const dueToday = filteredAssignments.filter((assignment) => !assignmentComplete(assignment) && assignment.dueDate === today());
    const upcomingExams = sortByDate(filteredAssignments.filter((assignment) => !assignmentComplete(assignment) && assignment.type === "exam" && assignment.dueDate >= today())).slice(0, 5);
    const filterLabel = schoolFilterLabel(ui.schoolClassFilter);

    return `
      <div class="view">
        ${topbar("School", "Assignments and classes", actionButton("add-assignment", "", "Add assignment", "plus", "primary"))}

        <section class="metric-grid">
          ${metric("Due today", String(dueToday.length), "")}
          ${metric("Due this week", String(stats.openDue.length), "All classes")}
          ${metric("Overdue", String(stats.overdue.length), "Open assignments")}
          ${metric("Completed", String(stats.completed.length), "Submitted or graded")}
        </section>

        <section class="card panel section">
          <div class="section-header">
            <h2>Classes</h2>
            ${actionButton("add-class", "", "Add class", "plus", "secondary")}
          </div>
          <div class="list">
            ${appData.school.classes.length ? byClass.map(renderClassCard).join("") : emptyState("Add classes to group assignments and estimate grades.")}
          </div>
        </section>

        <section class="two-col">
          <div class="card panel section">
            <div class="section-header"><h2>Assignments</h2>${actionButton("add-assignment", "", "Add", "plus", "secondary")}</div>
            <div class="assignment-tools">
              ${schoolClassFilterToggle()}
              <p class="tiny">${escapeHtml(filterLabel)} · ${filteredAssignments.length} assignment${filteredAssignments.length === 1 ? "" : "s"}</p>
            </div>
            <div class="list">
              ${filteredAssignments.length ? sortByDate(filteredAssignments).map(renderAssignmentItem).join("") : emptyState("No assignments match this class filter.")}
            </div>
          </div>

          <div class="card panel section">
            <h2>Upcoming exams</h2>
            <div class="list">
              ${upcomingExams.length ? upcomingExams.map(renderAssignmentItem).join("") : emptyState("No upcoming exams logged.")}
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function validSchoolClassFilter(filter) {
    return filter === "all" || filter === "unassigned" || Boolean(findById(appData.school.classes, filter));
  }

  function filterSchoolAssignments(assignments) {
    if (ui.schoolClassFilter === "unassigned") return assignments.filter((assignment) => !assignment.classId);
    if (ui.schoolClassFilter === "all") return assignments;
    return assignments.filter((assignment) => assignment.classId === ui.schoolClassFilter);
  }

  function schoolFilterLabel(filter) {
    if (filter === "unassigned") return "Showing assignments with no class";
    if (filter === "all") return "Showing all assignments";
    return `Showing ${className(filter)}`;
  }

  function schoolClassFilterToggle() {
    const filters = [
      { id: "all", name: "All", color: appData.settings.accent || "#f7f7ff" },
      { id: "unassigned", name: "No class", color: "#6f7685" },
      ...appData.school.classes.map((klass) => ({ id: klass.id, name: klass.name || "Class", color: klass.accentColor || "#7c5cff" }))
    ];
    return `
      <div class="class-filter" role="group" aria-label="Filter assignments by class">
        ${filters.map((filter) => {
          const color = safeHexColor(filter.color);
          return `
            <button type="button" class="class-chip ${ui.schoolClassFilter === filter.id ? "active" : ""}" data-action="set-school-class-filter" data-class-id="${escapeHtml(filter.id)}" style="--class-color:${escapeHtml(color)}; --class-color-rgb:${rgbText(color)}">
              <span>${escapeHtml(filter.name)}</span>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderClassCard(stats) {
    const color = safeHexColor(stats.color);
    return `
      <article class="item-card class-card" style="--class-color:${escapeHtml(color)}; --class-color-rgb:${rgbText(color)}">
        <div class="item-main">
          <p class="item-title">${escapeHtml(stats.name)}</p>
          <div class="item-meta">
            <span>${stats.completed}/${stats.total} complete</span>
            <span>${stats.percent}% completion</span>
            ${stats.grade !== null ? `<span>${formatNumber(stats.grade, 1)}% grade estimate</span>` : ""}
          </div>
          <div class="progress"><span style="width:${clamp(stats.percent)}%"></span></div>
        </div>
        <div class="item-actions">
          ${actionButton("set-school-class-filter", stats.id, "Show assignments", "target")}
          ${actionButton("edit-class", stats.id, "Edit", "edit")}
          ${actionButton("delete-class", stats.id, "Delete", "trash")}
        </div>
      </article>
    `;
  }

  function renderAssignmentItem(assignment) {
    const complete = assignmentComplete(assignment);
    const klass = findById(appData.school.classes, assignment.classId);
    const color = safeHexColor(klass?.accentColor, "#6f7685");
    const dueLabel = `${formatDate(assignment.dueDate)}${assignment.dueTime ? ` ${assignment.dueTime}` : ""}`;
    const classLabel = assignment.classId ? className(assignment.classId) : "No class";
    const meta = [
      `<span class="assignment-class-tag ${complete ? "complete" : ""}">${escapeHtml(classLabel)}</span>`,
      assignment.type ? `<span>${escapeHtml(assignment.type)}</span>` : "",
      assignment.dueDate ? `<span>${escapeHtml(dueLabel)}</span>` : "<span>No due date</span>",
      assignment.priority ? `<span>${escapeHtml(assignment.priority)}</span>` : "",
      complete ? `<span class="assignment-status-tag">${escapeHtml(assignment.status)}</span>` : ""
    ];
    return `
      <article class="item-card assignment-card ${complete ? "complete" : ""} ${!complete && isBeforeToday(assignment.dueDate) ? "overdue" : ""}" style="--class-color:${escapeHtml(color)}; --class-color-rgb:${rgbText(color)}">
        <div class="item-main">
          <p class="item-title assignment-title">${escapeHtml(assignment.title)}</p>
          <div class="item-meta">
            ${meta.filter(Boolean).join("")}
          </div>
          <label class="field">
            <span class="tiny">Status</span>
            <select data-assignment-status="${escapeHtml(assignment.id)}">
              ${["not started", "in progress", "submitted", "graded"].map((status) => `<option value="${status}" ${assignment.status === status ? "selected" : ""}>${status}</option>`).join("")}
            </select>
          </label>
          ${assignment.notes ? `<p class="tiny">${escapeHtml(assignment.notes)}</p>` : ""}
        </div>
        <div class="item-actions">
          ${actionButton("edit-assignment", assignment.id, "Edit", "edit")}
          ${actionButton("delete-assignment", assignment.id, "Delete", "trash")}
        </div>
      </article>
    `;
  }

  function renderMore() {
    const views = [
      ["gym", "Gym"],
      ["nutrition", "Nutrition"],
      ["shopping", "Shopping List"],
      ["reminders", "Calendar / Reminders"],
      ["inbox", "Inbox / Quick Capture"],
      ["review", "Weekly Review"],
      ["settings", "Settings"]
    ];
    return `
      <div class="view">
        ${topbar("More", "Additional tools", actionButton("open-quick-add", "", "Quick capture", "plus", "primary"))}
        <section class="subnav">
          ${views.map(([key, label]) => `<button type="button" class="secondary ${ui.moreView === key ? "active" : ""}" data-action="set-more-view" data-view="${key}">${escapeHtml(label)}</button>`).join("")}
        </section>
        ${renderMoreView()}
      </div>
    `;
  }

  function renderMoreView() {
    if (ui.moreView === "gym") return renderGym();
    if (ui.moreView === "nutrition") return renderNutrition();
    if (ui.moreView === "shopping") return renderShopping();
    if (ui.moreView === "reminders") return renderReminders();
    if (ui.moreView === "inbox") return renderInbox();
    if (ui.moreView === "review") return renderWeeklyReview();
    return renderSettings();
  }

  function renderGym() {
    const week = gymStats(calculateDateRange("week"));
    const month = gymStats(calculateDateRange("month"));
    const planText = appData.gym.planDays?.length ? appData.gym.planDays.map(dayName).join(", ") : "No plan days set";
    return `
      <section class="section">
        <div class="section-header">
          <h2>Gym</h2>
          <div class="actions">
            ${actionButton("edit-gym-plan", "", "Plan days", "calendar", "secondary")}
            ${actionButton("add-workout", "", "Add workout", "plus", "primary")}
          </div>
        </div>
        <div class="metric-grid">
          ${metric("Workouts this week", String(week.workouts.length), planText)}
          ${metric("Workouts this month", String(month.workouts.length), "")}
          ${metric("Workout streak", String(week.streak), "Consecutive workout days")}
          ${metric("Total volume", formatNumber(week.volume), "Sets x reps x weight")}
          ${metric("Missed planned", String(week.missedPlanned), "This week")}
          ${metric("Most recent", week.lastWorkout ? formatDate(week.lastWorkout.date) : "None", week.lastWorkout?.split || "")}
        </div>
        <div class="card panel section">
          <h2>Split history</h2>
          ${renderBarChart(week.splitFrequency, Math.max(1, week.workouts.length), false)}
        </div>
        <div class="card panel section">
          <h2>Workout log</h2>
          <div class="list">
            ${appData.gym.workouts.length ? sortByDate(appData.gym.workouts, "date").reverse().map(renderWorkoutItem).join("") : emptyState("Add workouts to track consistency and volume.")}
          </div>
        </div>
      </section>
    `;
  }

  function renderWorkoutItem(workout) {
    const volume = workoutVolume(workout);
    const exerciseText = appData.settings.gymDetails && workout.exercises?.length
      ? workout.exercises.map((ex) => `${ex.name}: ${ex.sets} x ${ex.reps} x ${ex.weight}`).join("; ")
      : "";
    return itemCard({
      title: `${workout.split || "Workout"} · ${formatDate(workout.date)}`,
      meta: [`${workout.duration || 0} min`, `Energy ${workout.energy || "N/A"}`, `Volume ${formatNumber(volume)}`],
      note: [workout.notes, exerciseText].filter(Boolean).join(" "),
      actions: `${actionButton("edit-workout", workout.id, "Edit", "edit")}${actionButton("delete-workout", workout.id, "Delete", "trash")}`
    });
  }

  function renderNutrition() {
    if (!appData.settings.nutrition) {
      return `
        <section class="card panel section">
          <h2>Nutrition</h2>
          <p class="muted">Nutrition is currently turned off in Settings.</p>
          ${actionButton("enable-nutrition", "", "Turn on nutrition", "settings", "primary")}
        </section>
      `;
    }
    const todayStats = nutritionStats(calculateDateRange("today"));
    const weekStats = nutritionStats(calculateDateRange("week"));
    return `
      <section class="section">
        <div class="section-header">
          <h2>Nutrition</h2>
          <div class="actions">
            ${actionButton("edit-nutrition-goals", "", "Goals", "target", "secondary")}
            ${actionButton("add-nutrition", "", "Add meal", "plus", "primary")}
          </div>
        </div>
        <div class="metric-grid">
          ${metric("Calories today", formatNumber(todayStats.calories), `${todayStats.caloriePercent}% of target`)}
          ${metric("Protein today", `${formatNumber(todayStats.protein)}g`, `${todayStats.proteinPercent}% of target`)}
          ${metric("Carbs today", `${formatNumber(todayStats.carbs)}g`, `${todayStats.carbPercent}% of target`)}
          ${metric("Fat today", `${formatNumber(todayStats.fat)}g`, `${todayStats.fatPercent}% of target`)}
          ${metric("Weekly average", formatNumber(weekStats.calories / daysBetween(weekStats.range.start, weekStats.range.end)), "Calories per day")}
        </div>
        <div class="card panel section">
          <h2>Goal progress</h2>
          ${progressRow("Calories", todayStats.caloriePercent, `${formatNumber(todayStats.calories)} / ${formatNumber(appData.nutrition.goals.calories)}`)}
          ${progressRow("Protein", todayStats.proteinPercent, `${formatNumber(todayStats.protein)}g / ${formatNumber(appData.nutrition.goals.protein)}g`)}
          ${progressRow("Carbs", todayStats.carbPercent, `${formatNumber(todayStats.carbs)}g / ${formatNumber(appData.nutrition.goals.carbs)}g`)}
          ${progressRow("Fat", todayStats.fatPercent, `${formatNumber(todayStats.fat)}g / ${formatNumber(appData.nutrition.goals.fat)}g`)}
        </div>
        <div class="card panel section">
          <h2>Meal log</h2>
          <div class="list">
            ${appData.nutrition.entries.length ? sortByDate(appData.nutrition.entries, "date").reverse().map(renderNutritionItem).join("") : emptyState("Add meal entries to track simple macro totals.")}
          </div>
        </div>
      </section>
    `;
  }

  function renderNutritionItem(entry) {
    return itemCard({
      title: entry.mealName || "Meal",
      meta: [`${formatNumber(entry.calories)} cal`, `${formatNumber(entry.protein)}g protein`, `${formatNumber(entry.carbs)}g carbs`, `${formatNumber(entry.fat)}g fat`, formatDate(entry.date)],
      note: entry.notes,
      actions: `${actionButton("edit-nutrition", entry.id, "Edit", "edit")}${actionButton("delete-nutrition", entry.id, "Delete", "trash")}`
    });
  }

  function renderShopping() {
    const stats = shoppingStats();
    const finance = calculateFinance(calculateDateRange("paycheck"));
    const unpurchased = appData.shopping.filter((item) => !item.purchased);
    const purchased = appData.shopping.filter((item) => item.purchased);
    const grouped = groupBy(unpurchased, "store");

    return `
      <section class="section">
        <div class="section-header">
          <h2>Shopping List</h2>
          ${actionButton("add-shopping", "", "Add item", "plus", "primary")}
        </div>
        <div class="metric-grid">
          ${metric("Estimated total", formatCurrency(stats.remainingTotal), `${stats.remainingCount} unpurchased`)}
          ${metric("Purchased total", formatCurrency(stats.purchasedTotal), `${purchased.length} purchased`)}
          ${metric("After shopping", formatCurrency(finance.safeToSpend), "Paycheck cycle safe-to-spend")}
        </div>
        <div class="card panel section">
          <h2>Unpurchased</h2>
          <div class="list">
            ${Object.keys(grouped).length ? Object.entries(grouped).map(([store, items]) => `
              <div class="section">
                <h3>${escapeHtml(store || "No store")}</h3>
                ${items.map(renderShoppingItem).join("")}
              </div>
            `).join("") : emptyState("No open shopping items.")}
          </div>
        </div>
        <div class="card panel section">
          <h2>Purchased</h2>
          <div class="list">
            ${purchased.length ? purchased.map(renderShoppingItem).join("") : emptyState("Purchased items will appear here.")}
          </div>
        </div>
      </section>
    `;
  }

  function renderShoppingItem(item) {
    return itemCard({
      title: item.itemName,
      meta: [formatCurrency(item.estimatedPrice), item.store, item.category, item.priority],
      className: item.purchased ? "purchased" : "",
      actions: `
        ${actionButton("toggle-shopping", item.id, item.purchased ? "Unpurchase" : "Purchased", item.purchased ? "undo" : "check")}
        ${actionButton("edit-shopping", item.id, "Edit", "edit")}
        ${actionButton("delete-shopping", item.id, "Delete", "trash")}
      `
    });
  }

  function renderReminders() {
    const upcoming = sortByDate(appData.reminders.filter((item) => !item.completed && item.date >= today()), "date");
    const todayItems = upcoming.filter((item) => item.date === today());
    const weekRange = calculateDateRange("week");
    const weekItems = upcoming.filter((item) => dateInRange(item.date, weekRange));
    const monthItems = upcoming.filter((item) => dateInRange(item.date, calculateDateRange("month")));
    const grouped = groupBy(upcoming.slice(0, 30), "date");

    return `
      <section class="section">
        <div class="section-header">
          <h2>Calendar / Reminders</h2>
          ${actionButton("add-reminder", "", "Add reminder", "plus", "primary")}
        </div>
        <div class="metric-grid">
          ${metric("Today", String(todayItems.length), "")}
          ${metric("This week", String(weekItems.length), "")}
          ${metric("This month", String(monthItems.length), "")}
        </div>
        <div class="card panel section">
          <h2>Upcoming by date</h2>
          <div class="list">
            ${Object.keys(grouped).length ? Object.entries(grouped).map(([date, items]) => `
              <div class="section">
                <h3>${escapeHtml(formatDate(date))}</h3>
                ${items.map(renderReminderItem).join("")}
              </div>
            `).join("") : emptyState("No upcoming reminders.")}
          </div>
        </div>
        <div class="card panel section">
          <h2>Completed</h2>
          <div class="list">
            ${appData.reminders.filter((item) => item.completed).length ? appData.reminders.filter((item) => item.completed).map(renderReminderItem).join("") : emptyState("Completed reminders will appear here.")}
          </div>
        </div>
      </section>
    `;
  }

  function renderReminderItem(item) {
    return itemCard({
      title: item.title,
      meta: [item.type || "Reminder", formatDate(item.date), item.time || "", item.completed ? "Complete" : "Open"],
      note: item.notes,
      className: item.completed ? "complete" : "",
      actions: `
        ${actionButton("toggle-reminder", item.id, item.completed ? "Uncomplete" : "Complete", item.completed ? "undo" : "check")}
        ${actionButton("edit-reminder", item.id, "Edit", "edit")}
        ${actionButton("delete-reminder", item.id, "Delete", "trash")}
      `
    });
  }

  function renderInbox() {
    const pending = appData.inbox.filter((item) => !item.processed);
    const processed = appData.inbox.filter((item) => item.processed).slice(-10).reverse();
    return `
      <section class="section">
        <div class="card panel section">
          <h2>Inbox / Quick Capture</h2>
          <div class="inline-form">
            <input id="capture-text" type="text" placeholder="Capture a task, reminder, shopping item, school item, or note">
            <select id="capture-type" aria-label="Capture category">
              ${["Task", "Money", "Shopping", "School", "Gym", "Reminder", "Note", "Idea"].map((type) => `<option value="${type}">${type}</option>`).join("")}
            </select>
            <button type="button" class="primary" data-action="capture-inbox">${icon("plus")}<span>Capture</span></button>
          </div>
        </div>
        <div class="card panel section">
          <h2>Open inbox</h2>
          <div class="list">
            ${pending.length ? pending.map(renderInboxItem).join("") : emptyState("Captured items move into their sections when categorized.")}
          </div>
        </div>
        <div class="card panel section">
          <h2>Recent processed</h2>
          <div class="list">
            ${processed.length ? processed.map(renderInboxItem).join("") : emptyState("Processed captures will appear here.")}
          </div>
        </div>
      </section>
    `;
  }

  function renderInboxItem(item) {
    return itemCard({
      title: item.text,
      meta: [item.category || "Uncategorized", item.processed ? "Processed" : "Open"],
      actions: `
        ${item.processed ? "" : actionButton("process-inbox", item.id, "Process", "check")}
        ${actionButton("delete-inbox", item.id, "Delete", "trash")}
      `
    });
  }

  function renderWeeklyReview() {
    if (!appData.settings.weeklyReview) {
      return `
        <section class="card panel section">
          <h2>Weekly Review</h2>
          <p class="muted">Weekly Review is currently turned off in Settings.</p>
          ${actionButton("enable-weekly-review", "", "Turn on weekly review", "settings", "primary")}
        </section>
      `;
    }
    const summary = weeklySummary();
    const best = bestCategory(summary);
    const weakest = weakestCategory(summary);
    return `
      <section class="section">
        <h2>Weekly Review</h2>
        <div class="metric-grid">
          ${metric("Task completion", `${summary.tasks.percent}%`, `${summary.tasks.completed}/${summary.tasks.total}`)}
          ${metric("Habit completion", `${summary.habits.percent}%`, `${summary.habits.completed}/${summary.habits.total}`)}
          ${metric("Money earned", formatCurrency(summary.finance.netIncome), "")}
          ${metric("Money spent", formatCurrency(summary.finance.spending), "")}
          ${metric("Bills paid", String(summary.billsPaid), "")}
          ${metric("Gym sessions", String(summary.gym.workouts.length), "")}
          ${metric("Assignments completed", String(summary.school.completed.length), "")}
          ${metric("Shopping total", formatCurrency(summary.shopping.remainingTotal + summary.shopping.purchasedTotal), "Estimated")}
        </div>
        <div class="card panel section">
          <h2>Analytical summary</h2>
          <p class="muted">This week: ${summary.tasks.percent}% task completion, ${formatCurrency(summary.finance.netIncome)} income logged, ${formatCurrency(summary.finance.spending)} spending, ${summary.gym.workouts.length} gym sessions, and ${summary.school.completed.length} school assignments completed.</p>
          <div class="pill-row">
            <span class="chip active">Best category: ${escapeHtml(best)}</span>
            <span class="chip">Needs attention: ${escapeHtml(weakest)}</span>
          </div>
        </div>
      </section>
    `;
  }

  function renderSettings() {
    const swatches = ["#f7f7ff", "#c8ccd6", "#6f7685", "#25d8ff", "#7c5cff", "#9b8cff", "#32d98f", "#ffd166", "#ff6b8a", "#ff9f43"];
    return `
      <section class="section">
        <h2>Settings</h2>
        <div class="card panel section">
          <h3>Theme accent</h3>
          <div class="swatches">
            ${swatches.map((color) => `<button type="button" class="swatch ${String(appData.settings.accent).toLowerCase() === color ? "active" : ""}" style="background:${color}" data-action="set-accent" data-color="${color}" title="${color}" aria-label="Set accent ${color}"></button>`).join("")}
          </div>
        </div>

        <div class="card panel section">
          <h3>Optional sections</h3>
          <label class="checkbox-row"><input type="checkbox" data-setting="weeklyReview" ${appData.settings.weeklyReview ? "checked" : ""}> Weekly Review</label>
          <label class="checkbox-row"><input type="checkbox" data-setting="nutrition" ${appData.settings.nutrition ? "checked" : ""}> Nutrition</label>
          <label class="checkbox-row"><input type="checkbox" data-setting="gymDetails" ${appData.settings.gymDetails ? "checked" : ""}> Gym exercise details</label>
        </div>

        <div class="card panel section">
          <h3>Tax estimate</h3>
          <label class="checkbox-row"><input type="checkbox" data-tax-setting="autoOhio" ${appData.settings.tax.autoOhio ? "checked" : ""}> Automatic Ohio tax estimate</label>
          <div class="custom-range">
            <label class="field">
              <span>Pay periods per year</span>
              <input type="number" id="tax-pay-periods" min="1" step="1" value="${escapeHtml(appData.settings.tax.payPeriodsPerYear)}">
            </label>
            <label class="field">
              <span>Ohio exemptions</span>
              <input type="number" id="tax-ohio-exemptions" min="0" step="1" value="${escapeHtml(appData.settings.tax.ohioExemptions)}">
            </label>
          </div>
          <label class="field">
            <span>Ohio local tax rate</span>
            <input type="number" id="tax-local-rate" min="0" max="10" step="0.01" value="${escapeHtml(appData.settings.tax.ohioLocalRate)}">
          </label>
          <button type="button" class="primary" data-action="save-tax-settings">${icon("check")}<span>Save tax settings</span></button>
        </div>

        <div class="card panel section">
          <h3>Manage categories</h3>
          <label class="field">
            <span>Task categories</span>
            <textarea id="settings-task-categories">${escapeHtml(appData.settings.taskCategories.join(", "))}</textarea>
          </label>
          <label class="field">
            <span>Finance bill categories</span>
            <textarea id="settings-bill-categories">${escapeHtml(appData.settings.billCategories.join(", "))}</textarea>
          </label>
          <label class="field">
            <span>Spending categories</span>
            <textarea id="settings-spending-categories">${escapeHtml(appData.settings.spendingCategories.join(", "))}</textarea>
          </label>
          <button type="button" class="primary" data-action="save-categories">${icon("check")}<span>Save categories</span></button>
        </div>

        <div class="card panel section">
          <h3>Management shortcuts</h3>
          <div class="actions">
            <button type="button" class="secondary" data-action="go-tasks">${icon("check")}<span>Manage recurring tasks</span></button>
            <button type="button" class="secondary" data-action="go-school">${icon("book")}<span>Manage school classes</span></button>
            <button type="button" class="secondary" data-action="go-finance">${icon("wallet")}<span>Manage finance</span></button>
          </div>
        </div>

        ${renderSyncSettings()}

        <div class="card panel section">
          <h3>Data</h3>
          <div class="actions">
            <button type="button" class="secondary" data-action="export-data">${icon("download")}<span>Export JSON</span></button>
            <label class="secondary">
              ${icon("upload")}<span>Import JSON</span>
              <input id="import-file" class="hidden" type="file" accept="application/json">
            </label>
            <button type="button" class="secondary" data-action="reset-demo">${icon("spark")}<span>Reset demo data</span></button>
            <button type="button" class="danger-btn" data-action="clear-data">${icon("trash")}<span>Clear all data</span></button>
          </div>
        </div>
      </section>
    `;
  }

  function renderSyncSettings() {
    const signedIn = syncConfigured();
    return `
      <div class="card panel section">
        <div class="section-header">
          <h3>Account sync</h3>
          <span class="sync-badge ${signedIn ? "active" : ""}">${signedIn ? "Signed in" : "Local only"}</span>
        </div>
        <div class="sync-status">
          <span>${escapeHtml(syncState.status || "Not signed in")}</span>
          ${syncState.lastSync ? `<span>Last sync ${escapeHtml(formatSyncTime(syncState.lastSync))}</span>` : ""}
        </div>
        <label class="field">
          <span>Sync API endpoint</span>
          <input type="url" id="sync-endpoint" value="${escapeHtml(syncState.endpoint || defaultSyncEndpoint())}" placeholder="http://localhost:4173/api/sync">
        </label>
        <div class="custom-range">
          <label class="field">
            <span>Account name</span>
            <input type="text" id="sync-account" value="${escapeHtml(syncState.account)}" autocomplete="username">
          </label>
          <label class="field">
            <span>Sync key</span>
            <input type="password" id="sync-key" value="${escapeHtml(syncState.key)}" autocomplete="current-password">
          </label>
        </div>
        <div class="actions">
          <button type="button" class="primary" data-action="save-sync-login">${icon("check")}<span>Sign in / save</span></button>
          <button type="button" class="secondary" data-action="pull-sync-data">${icon("download")}<span>Pull</span></button>
          <button type="button" class="secondary" data-action="push-sync-data">${icon("upload")}<span>Push</span></button>
          <button type="button" class="ghost" data-action="sign-out-sync">${icon("undo")}<span>Sign out</span></button>
        </div>
      </div>
    `;
  }

  function renderBarChart(totals, grandTotal, currency = true) {
    const entries = Object.entries(totals || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!entries.length) return "";
    return `
      <div class="chart-bars">
        ${entries.map(([label, value]) => `
          <div class="bar-line">
            <span>${escapeHtml(label || "Other")}</span>
            <div class="bar-track"><span style="width:${clamp((value / Math.max(1, grandTotal)) * 100)}%"></span></div>
            <span>${currency ? formatCurrency(value) : formatNumber(value)}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function isHabitDone(habitId, date) {
    return Boolean(appData.habitCompletions?.[date]?.[habitId]);
  }

  function habitStats(range) {
    const habits = appData.dailyHabits || [];
    const dates = eachDate(range.start, range.end);
    const total = habits.length * dates.length;
    let completed = 0;
    dates.forEach((date) => {
      habits.forEach((habit) => {
        if (isHabitDone(habit.id, date)) completed += 1;
      });
    });
    let streak = 0;
    let cursor = parseDate(today());
    while (habits.length) {
      const d = dateString(cursor);
      const fullDay = habits.every((habit) => isHabitDone(habit.id, d));
      if (!fullDay) break;
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return { total, completed, percent: pct(completed, total), streak };
  }

  function taskStats(range) {
    const tasks = appData.tasks.filter((task) => dateInRange(task.dueDate, range));
    const completed = tasks.filter((task) => task.completed).length;
    return { total: tasks.length, completed, percent: pct(completed, tasks.length) };
  }

  function calculateFinance(range) {
    const currentMoney = sum(appData.finance.accounts, (account) => account.balance);
    const incomeEntries = appData.finance.income.filter((entry) => dateInRange(incomeDate(entry), range));
    const grossIncome = sum(incomeEntries, entryGrossIncome);
    const netIncome = sum(incomeEntries, entryNetIncome);
    const taxTotal = sum(incomeEntries, (entry) => entryTaxEstimate(entry).total);
    const workHours = sum(incomeEntries.filter((entry) => entry.type === "hourly"), (entry) => entry.hours);
    const spendingEntries = appData.finance.spending.filter((entry) => dateInRange(entry.date, range));
    const spending = sum(spendingEntries, (entry) => entry.amount);
    const billOccurrences = appData.finance.bills.flatMap((bill) => billOccurrencesInRange(bill, range)).sort((a, b) => a.date.localeCompare(b.date));
    const billsDue = sum(billOccurrences.filter((bill) => !bill.paid), (bill) => bill.amount);
    const debtPaymentOccurrences = appData.finance.debts.flatMap((debt) => debtPaymentOccurrencesInRange(debt, range)).sort((a, b) => a.date.localeCompare(b.date));
    const debtPayments = sum(debtPaymentOccurrences, (payment) => payment.amount);
    const totalDebt = sum(appData.finance.debts, (debt) => debt.balance);
    const invested = sum(appData.finance.investments, (investment) => investment.amountInvested);
    const investmentValue = sum(appData.finance.investments, (investment) => investment.currentValue);
    const investmentGain = investmentValue - invested;
    const shopping = shoppingStats().remainingTotal;
    const projectedBalance = currentMoney + netIncome - billsDue - debtPayments - spending - shopping;
    const netWorth = currentMoney + investmentValue - totalDebt;
    const lowestBalance = projectedLowestBalance(currentMoney, incomeEntries, billOccurrences, debtPaymentOccurrences, spendingEntries);
    const safeToSpend = Math.max(0, Math.min(currentMoney, projectedBalance, lowestBalance));
    const dailyLimit = Math.max(0, safeToSpend / daysBetween(range.start, range.end));
    return {
      range,
      currentMoney,
      incomeEntries,
      grossIncome,
      netIncome,
      taxTotal,
      workHours,
      spendingEntries,
      spending,
      billOccurrences,
      billsDue,
      debtPaymentOccurrences,
      debtPayments,
      totalDebt,
      invested,
      investmentValue,
      investmentGain,
      shopping,
      projectedBalance,
      safeToSpend,
      netWorth,
      lowestBalance,
      dailyLimit
    };
  }

  function entryGrossIncome(entry) {
    if (entry.type === "hourly") return (Number(entry.hourlyWage) || 0) * (Number(entry.hours) || 0);
    return Number(entry.amount) || 0;
  }

  function entryNetIncome(entry) {
    const gross = entryGrossIncome(entry);
    return Math.max(0, gross - entryTaxEstimate(entry).total);
  }

  function entryTaxEstimate(entry) {
    const gross = entryGrossIncome(entry);
    const mode = entry.taxMode || (Number(entry.deductionPercent) > 0 ? "manual" : "auto");
    if (!gross) return emptyTaxEstimate();
    if (mode === "manual" || !appData.settings.tax?.autoOhio) {
      const deduction = clamp(entry.deductionPercent || 0, 0, 100);
      const total = gross * (deduction / 100);
      return { ...emptyTaxEstimate(), manual: total, total, effectiveRate: deduction };
    }

    const settings = appData.settings.tax || defaultSettings().tax;
    const periods = Math.max(1, Number(settings.payPeriodsPerYear) || 26);
    const annualGross = gross * periods;
    const federal = calculateFederalIncomeTax(annualGross) / periods;
    const fica = calculateFicaTax(gross, annualGross, periods);
    const exemptionCount = Number.isFinite(Number(settings.ohioExemptions)) ? Number(settings.ohioExemptions) : 1;
    const ohio = calculateOhioIncomeTax(annualGross, exemptionCount) / periods;
    const local = gross * (clamp(settings.ohioLocalRate || 0, 0, 10) / 100);
    const total = federal + fica.socialSecurity + fica.medicare + ohio + local;
    return {
      federal,
      socialSecurity: fica.socialSecurity,
      medicare: fica.medicare,
      ohio,
      local,
      manual: 0,
      total,
      effectiveRate: gross ? (total / gross) * 100 : 0
    };
  }

  function emptyTaxEstimate() {
    return {
      federal: 0,
      socialSecurity: 0,
      medicare: 0,
      ohio: 0,
      local: 0,
      manual: 0,
      total: 0,
      effectiveRate: 0
    };
  }

  function calculateFederalIncomeTax(annualGross) {
    const taxable = Math.max(0, (Number(annualGross) || 0) - 16100);
    const brackets = [
      { over: 0, upto: 12400, rate: 0.1 },
      { over: 12400, upto: 50400, rate: 0.12 },
      { over: 50400, upto: 105700, rate: 0.22 },
      { over: 105700, upto: 201775, rate: 0.24 },
      { over: 201775, upto: 256225, rate: 0.32 },
      { over: 256225, upto: 640600, rate: 0.35 },
      { over: 640600, upto: Infinity, rate: 0.37 }
    ];
    return marginalTax(taxable, brackets);
  }

  function calculateFicaTax(gross, annualGross, periods) {
    const socialSecurityWageBase = 184500;
    const socialSecurityTaxableThisPeriod = Math.min(Number(gross) || 0, socialSecurityWageBase / periods);
    const socialSecurity = socialSecurityTaxableThisPeriod * 0.062;
    const medicareBase = (Number(gross) || 0) * 0.0145;
    const additionalMedicare = Math.max(0, (Number(annualGross) || 0) - 200000) * 0.009 / periods;
    return { socialSecurity, medicare: medicareBase + additionalMedicare };
  }

  function calculateOhioIncomeTax(annualGross, exemptions) {
    const exemptionAmount = Number(annualGross) >= 500000 ? 0 : Math.max(0, exemptions) * 1900;
    const taxable = Math.max(0, (Number(annualGross) || 0) - exemptionAmount);
    if (taxable <= 26050) return 0;
    if (taxable <= 100000) return 342 + (taxable - 26050) * 0.0275;
    return 2394.32 + (taxable - 100000) * 0.03125;
  }

  function marginalTax(taxable, brackets) {
    return brackets.reduce((total, bracket) => {
      if (taxable <= bracket.over) return total;
      const amount = Math.min(taxable, bracket.upto) - bracket.over;
      return total + amount * bracket.rate;
    }, 0);
  }

  function incomeDate(entry) {
    return entry.payDate || entry.date;
  }

  function billOccurrencesInRange(bill, range) {
    if (!bill.dueDate) return [];
    const start = parseDate(range.start);
    const end = parseDate(range.end);
    let cursor = parseDate(bill.dueDate);
    if (!cursor || !start || !end) return [];

    const advance = () => {
      if (bill.frequency === "weekly") cursor = addDays(cursor, 7);
      else if (bill.frequency === "yearly") cursor = addYears(cursor, 1);
      else if (bill.frequency === "custom") cursor = addDays(cursor, Math.max(1, Number(bill.customDays) || 30));
      else if (bill.frequency === "one-time") cursor = addYears(cursor, 100);
      else cursor = addMonths(cursor, 1);
    };

    while (cursor < start) advance();

    const occurrences = [];
    while (cursor <= end) {
      occurrences.push({ ...bill, date: dateString(cursor) });
      if (bill.frequency === "one-time") break;
      advance();
    }
    return occurrences;
  }

  function recurringMonthlyAmountInRange(amount, dueDate, range) {
    if (!amount || !dueDate) return 0;
    const billLike = { id: "debt-payment", name: "Debt payment", amount, dueDate, frequency: "monthly", paid: false };
    return sum(billOccurrencesInRange(billLike, range), (item) => item.amount);
  }

  function debtPaymentAmount(debt) {
    if ((Number(debt.balance) || 0) <= 0) return 0;
    const minimum = Number(debt.minimumPayment) || 0;
    const target = monthlyDebtTarget(debt);
    return Math.max(minimum, target);
  }

  function debtPaymentOccurrencesInRange(debt, range) {
    const amount = debtPaymentAmount(debt);
    if (!amount) return [];
    const dueDate = debt.dueDate || range.start;
    return billOccurrencesInRange({
      id: debt.id,
      name: debt.name || "Debt payment",
      amount,
      dueDate,
      frequency: "monthly",
      paid: false
    }, range).map((payment) => ({
      ...payment,
      debtId: debt.id,
      minimumPayment: Number(debt.minimumPayment) || 0,
      targetPayment: monthlyDebtTarget(debt)
    }));
  }

  function projectedLowestBalance(current, incomeEntries, billOccurrences, debtPaymentOccurrences, spendingEntries) {
    const events = [];
    incomeEntries.forEach((entry) => events.push({ date: incomeDate(entry), amount: entryNetIncome(entry) }));
    billOccurrences.filter((bill) => !bill.paid).forEach((bill) => events.push({ date: bill.date, amount: -Number(bill.amount) || 0 }));
    debtPaymentOccurrences.forEach((payment) => events.push({ date: payment.date, amount: -Number(payment.amount) || 0 }));
    spendingEntries.forEach((entry) => events.push({ date: entry.date, amount: -Number(entry.amount) || 0 }));
    events.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    let balance = current;
    let lowest = current;
    events.forEach((event) => {
      balance += event.amount;
      lowest = Math.min(lowest, balance);
    });
    return lowest;
  }

  function schoolStats(range) {
    const assignments = appData.school.assignments || [];
    const openDue = sortByDate(assignments.filter((assignment) => !assignmentComplete(assignment) && dateInRange(assignment.dueDate, range)));
    const overdue = sortByDate(assignments.filter((assignment) => !assignmentComplete(assignment) && isBeforeToday(assignment.dueDate)));
    const completed = assignments.filter(assignmentComplete);
    return { openDue, overdue, completed, percent: pct(completed.length, assignments.length), total: assignments.length };
  }

  function assignmentComplete(assignment) {
    return ["submitted", "graded"].includes(assignment.status);
  }

  function className(classId) {
    return findById(appData.school.classes, classId)?.name || "No class";
  }

  function classStats(classId) {
    const klass = findById(appData.school.classes, classId) || {};
    const assignments = appData.school.assignments.filter((assignment) => assignment.classId === classId);
    const completed = assignments.filter(assignmentComplete).length;
    const points = assignments.filter((assignment) => Number(assignment.pointsPossible) > 0);
    const earned = sum(points, (assignment) => assignment.pointsEarned);
    const possible = sum(points, (assignment) => assignment.pointsPossible);
    return {
      id: classId,
      name: klass.name || "Class",
      color: safeHexColor(klass.accentColor, "#7c5cff"),
      total: assignments.length,
      completed,
      percent: pct(completed, assignments.length),
      grade: possible ? (earned / possible) * 100 : null
    };
  }

  function gymStats(range) {
    const workouts = sortByDate(appData.gym.workouts.filter((workout) => dateInRange(workout.date, range)), "date");
    const monthWorkouts = appData.gym.workouts.filter((workout) => dateInRange(workout.date, calculateDateRange("month")));
    const volume = sum(workouts, workoutVolume);
    const splitFrequency = groupTotals(workouts, "split", () => 1);
    const lastWorkout = sortByDate(appData.gym.workouts, "date").at(-1);
    const streak = workoutStreak();
    const missedPlanned = missedPlannedWorkouts(calculateDateRange("week"));
    return { workouts, monthWorkouts, volume, splitFrequency, lastWorkout, streak, missedPlanned };
  }

  function workoutVolume(workout) {
    return sum(workout.exercises || [], (exercise) => (Number(exercise.sets) || 0) * (Number(exercise.reps) || 0) * (Number(exercise.weight) || 0));
  }

  function workoutStreak() {
    const dates = new Set(appData.gym.workouts.map((workout) => workout.date));
    let cursor = parseDate(today());
    let streak = 0;
    while (dates.has(dateString(cursor))) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  function missedPlannedWorkouts(range) {
    const planDays = appData.gym.planDays || [];
    if (!planDays.length) return 0;
    const workoutDates = new Set(appData.gym.workouts.map((workout) => workout.date));
    return eachDate(range.start, today()).filter((date) => planDays.includes(parseDate(date).getDay()) && !workoutDates.has(date)).length;
  }

  function nutritionStats(range) {
    const entries = appData.nutrition.entries.filter((entry) => dateInRange(entry.date, range));
    const goals = appData.nutrition.goals || {};
    const totals = {
      range,
      calories: sum(entries, (entry) => entry.calories),
      protein: sum(entries, (entry) => entry.protein),
      carbs: sum(entries, (entry) => entry.carbs),
      fat: sum(entries, (entry) => entry.fat)
    };
    totals.caloriePercent = pct(totals.calories, goals.calories || 0);
    totals.proteinPercent = pct(totals.protein, goals.protein || 0);
    totals.carbPercent = pct(totals.carbs, goals.carbs || 0);
    totals.fatPercent = pct(totals.fat, goals.fat || 0);
    return totals;
  }

  function shoppingStats() {
    const remaining = appData.shopping.filter((item) => !item.purchased);
    const purchased = appData.shopping.filter((item) => item.purchased);
    return {
      remainingCount: remaining.length,
      remainingTotal: sum(remaining, (item) => item.estimatedPrice),
      purchasedTotal: sum(purchased, (item) => item.estimatedPrice)
    };
  }

  function remindersInRange(range) {
    return sortByDate(appData.reminders.filter((reminder) => dateInRange(reminder.date, range)), "date");
  }

  function weeklySummary() {
    const range = calculateDateRange("week");
    const tasks = taskStats(range);
    const habits = habitStats(range);
    const finance = calculateFinance(range);
    const school = schoolStats(range);
    const gym = gymStats(range);
    const shopping = shoppingStats();
    const billsPaid = appData.finance.bills.filter((bill) => bill.paid && dateInRange(bill.dueDate, range)).length;
    return { range, tasks, habits, finance, school, gym, shopping, billsPaid };
  }

  function bestCategory(summary) {
    const values = [
      ["Tasks", summary.tasks.percent],
      ["Habits", summary.habits.percent],
      ["School", summary.school.percent],
      ["Gym", Math.min(100, summary.gym.workouts.length * 34)]
    ];
    return values.sort((a, b) => b[1] - a[1])[0][0];
  }

  function weakestCategory(summary) {
    const values = [
      ["Tasks", summary.tasks.total ? summary.tasks.percent : 100],
      ["Habits", summary.habits.total ? summary.habits.percent : 100],
      ["School", summary.school.total ? summary.school.percent : 100],
      ["Gym", Math.min(100, summary.gym.workouts.length * 34)]
    ];
    return values.sort((a, b) => a[1] - b[1])[0][0];
  }

  function groupTotals(list, key, selector) {
    return list.reduce((groups, item) => {
      const label = item[key] || "Other";
      groups[label] = (groups[label] || 0) + (Number(selector(item)) || 0);
      return groups;
    }, {});
  }

  function groupBy(list, key) {
    return list.reduce((groups, item) => {
      const label = item[key] || "";
      groups[label] = groups[label] || [];
      groups[label].push(item);
      return groups;
    }, {});
  }

  function eachDate(start, end) {
    const dates = [];
    let cursor = parseDate(start);
    const last = parseDate(end);
    while (cursor && last && cursor <= last) {
      dates.push(dateString(cursor));
      cursor = addDays(cursor, 1);
    }
    return dates;
  }

  function monthlyDebtTarget(debt) {
    if (!debt.targetPayoffDate || !debt.balance) return 0;
    const months = Math.max(1, Math.ceil(daysBetween(today(), debt.targetPayoffDate) / 30));
    return Number(debt.balance) / months;
  }

  function dayName(index) {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index] || "Day";
  }

  function parsePlanDays(text) {
    const map = {
      sun: 0,
      sunday: 0,
      mon: 1,
      monday: 1,
      tue: 2,
      tuesday: 2,
      wed: 3,
      wednesday: 3,
      thu: 4,
      thursday: 4,
      fri: 5,
      friday: 5,
      sat: 6,
      saturday: 6
    };
    return [...new Set(String(text).split(/[,\s]+/).map((token) => map[token.toLowerCase()]).filter((day) => day !== undefined))];
  }

  function parseExercises(text) {
    return String(text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, sets, reps, weight] = line.split(",").map((part) => part.trim());
        return { name: name || "Exercise", sets: Number(sets) || 0, reps: Number(reps) || 0, weight: Number(weight) || 0 };
      });
  }

  function exercisesToText(exercises) {
    return (exercises || []).map((ex) => `${ex.name}, ${ex.sets}, ${ex.reps}, ${ex.weight}`).join("\n");
  }

  function openForm({ title, fields, initial = {}, submitLabel = "Save", onSubmit }) {
    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <form class="modal" id="active-form">
          <div class="modal-header">
            <h2 class="modal-title">${escapeHtml(title)}</h2>
            ${actionButton("close-modal", "", "Close", "x")}
          </div>
          <div class="modal-body">
            <div class="form-grid">
              ${fields.map((field) => renderField(field, initial[field.name])).join("")}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="secondary" data-action="close-modal">Cancel</button>
            <button type="submit" class="primary">${escapeHtml(submitLabel)}</button>
          </div>
        </form>
      </div>
    `;
    const form = document.getElementById("active-form");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = collectFormValues(form, fields);
      onSubmit(values);
      closeModal();
      saveData();
      render();
    });
  }

  function renderField(field, value) {
    const common = `name="${escapeHtml(field.name)}" id="field-${escapeHtml(field.name)}" ${field.required ? "required" : ""}`;
    const label = `<label class="field" for="field-${escapeHtml(field.name)}"><span>${escapeHtml(field.label)}</span>`;
    const placeholder = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : "";
    const step = field.step ? `step="${escapeHtml(field.step)}"` : "";
    const min = field.min !== undefined ? `min="${escapeHtml(field.min)}"` : "";
    const max = field.max !== undefined ? `max="${escapeHtml(field.max)}"` : "";
    if (field.type === "select") {
      return `${label}<select ${common}>${field.options.map((option) => {
        const opt = typeof option === "string" ? { value: option, label: option } : option;
        return `<option value="${escapeHtml(opt.value)}" ${String(value ?? field.default ?? "") === String(opt.value) ? "selected" : ""}>${escapeHtml(opt.label)}</option>`;
      }).join("")}</select>${field.help ? `<span class="tiny">${escapeHtml(field.help)}</span>` : ""}</label>`;
    }
    if (field.type === "textarea") {
      return `${label}<textarea ${common} ${placeholder}>${escapeHtml(value ?? field.default ?? "")}</textarea>${field.help ? `<span class="tiny">${escapeHtml(field.help)}</span>` : ""}</label>`;
    }
    if (field.type === "checkbox") {
      return `<label class="checkbox-row"><input type="checkbox" name="${escapeHtml(field.name)}" ${value ?? field.default ? "checked" : ""}> ${escapeHtml(field.label)}</label>`;
    }
    return `${label}<input type="${escapeHtml(field.type || "text")}" ${common} ${placeholder} ${step} ${min} ${max} value="${escapeHtml(value ?? field.default ?? "")}">${field.help ? `<span class="tiny">${escapeHtml(field.help)}</span>` : ""}</label>`;
  }

  function collectFormValues(form, fields) {
    const values = {};
    fields.forEach((field) => {
      const input = form.elements[field.name];
      if (!input) return;
      if (field.type === "checkbox") values[field.name] = input.checked;
      else if (field.type === "number") values[field.name] = input.value === "" ? "" : Number(input.value);
      else values[field.name] = input.value;
    });
    return values;
  }

  function closeModal() {
    const backdrop = modalRoot.querySelector(".modal-backdrop");
    if (!backdrop) return;
    backdrop.classList.add("closing");
    window.setTimeout(() => {
      if (backdrop.isConnected) modalRoot.innerHTML = "";
    }, 155);
  }

  function animateCompletionToggle(button, isComplete, completeLabel = "Uncomplete", openLabel = "Complete", completeMeta = "", openMeta = "") {
    const card = button.closest(".item-card");
    if (!card) {
      render();
      return;
    }

    card.classList.remove("just-completed", "just-uncompleted");
    void card.offsetWidth;
    card.classList.toggle("complete", isComplete);
    card.classList.add(isComplete ? "just-completed" : "just-uncompleted");

    const label = isComplete ? completeLabel : openLabel;
    button.innerHTML = icon(isComplete ? "undo" : "check");
    button.title = label;
    button.setAttribute("aria-label", label);

    if (completeMeta || openMeta) {
      const firstMeta = card.querySelector(".item-meta span");
      if (firstMeta) firstMeta.textContent = isComplete ? completeMeta : openMeta;
    }

    window.setTimeout(() => {
      if (card.isConnected) card.classList.remove("just-completed", "just-uncompleted");
    }, 680);
  }

  function habitFields() {
    return [{ name: "title", label: "Daily task name", required: true }];
  }

  function taskFields(initial = {}) {
    return [
      { name: "title", label: "Title", required: true },
      { name: "category", label: "Category", type: "select", options: [{ value: "", label: "No category" }, ...appData.settings.taskCategories.map((category) => ({ value: category, label: category }))], default: initial.category || "" },
      { name: "dueDate", label: "Due date", type: "date", default: initial.dueDate || today() },
      { name: "priority", label: "Priority", type: "select", options: [{ value: "", label: "No priority" }, "Low", "Medium", "High"], default: initial.priority || "" },
      { name: "reminderTime", label: "Reminder time", type: "time" },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function accountFields() {
    return [
      { name: "name", label: "Account name", required: true },
      { name: "type", label: "Type", type: "select", options: ["Checking", "Savings", "Cash", "Other"] },
      { name: "balance", label: "Balance", type: "number", step: "0.01", required: true }
    ];
  }

  function incomeFields() {
    return [
      { name: "type", label: "Entry type", type: "select", options: [{ value: "hourly", label: "Hourly work" }, { value: "manual", label: "Manual income" }] },
      { name: "source", label: "Job/source", type: "select", options: appData.settings.incomeSources },
      { name: "taxMode", label: "Tax calculation", type: "select", options: [{ value: "auto", label: "Automatic Ohio estimate" }, { value: "manual", label: "Manual percentage" }] },
      { name: "hourlyWage", label: "Hourly wage", type: "number", step: "0.01" },
      { name: "hours", label: "Hours worked", type: "number", step: "0.1" },
      { name: "amount", label: "Manual amount", type: "number", step: "0.01" },
      { name: "date", label: "Date", type: "date", default: today(), required: true },
      { name: "payDate", label: "Pay date", type: "date" },
      { name: "deductionPercent", label: "Manual deduction/tax percentage", type: "number", step: "0.1", min: 0, max: 100 },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function billFields() {
    return [
      { name: "name", label: "Bill name", required: true },
      { name: "amount", label: "Amount", type: "number", step: "0.01", required: true },
      { name: "dueDate", label: "Due date", type: "date", default: today(), required: true },
      { name: "frequency", label: "Frequency", type: "select", options: ["weekly", "monthly", "yearly", "custom", "one-time"], default: "monthly" },
      { name: "customDays", label: "Custom frequency days", type: "number", min: 1, default: 30 },
      { name: "category", label: "Category", type: "select", options: [{ value: "", label: "No category" }, ...appData.settings.billCategories.map((category) => ({ value: category, label: category }))] },
      { name: "paid", label: "Paid", type: "checkbox" },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function spendingFields() {
    const cards = creditCardDebts();
    return [
      { name: "amount", label: "Amount", type: "number", step: "0.01", required: true },
      { name: "category", label: "Category", type: "select", options: [{ value: "", label: "No category" }, ...appData.settings.spendingCategories.map((category) => ({ value: category, label: category }))] },
      { name: "date", label: "Date", type: "date", default: today(), required: true },
      { name: "note", label: "Note", type: "text" },
      { name: "necessary", label: "Necessary", type: "checkbox", default: true },
      {
        name: "debtId",
        label: "Charged to credit card",
        type: "select",
        options: [
          { value: "", label: cards.length ? "No linked card" : "No credit cards added" },
          ...cards.map((debt) => ({ value: debt.id, label: debt.name || "Credit card" }))
        ],
        help: cards.length ? "If selected, this spending increases that card balance." : "Add a credit card in Debt repayment to link spending."
      },
      { name: "paymentMethod", label: "Payment method note", type: "text" }
    ];
  }

  function debtFields() {
    return [
      { name: "name", label: "Debt name", required: true },
      { name: "debtType", label: "Debt type", type: "select", options: [{ value: "credit-card", label: "Credit card" }, { value: "loan", label: "Loan" }, { value: "other", label: "Other debt" }], default: "credit-card" },
      { name: "balance", label: "Total balance", type: "number", step: "0.01", required: true },
      { name: "originalBalance", label: "Original balance", type: "number", step: "0.01", help: "Used for payoff progress. If blank, current balance is used." },
      { name: "interestRate", label: "Interest rate", type: "number", step: "0.01" },
      { name: "minimumPayment", label: "Minimum payment", type: "number", step: "0.01" },
      { name: "dueDate", label: "Payment due date", type: "date", default: today() },
      { name: "targetPayoffDate", label: "Target payoff date", type: "date" },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function investmentFields() {
    return [
      { name: "name", label: "Investment name", required: true },
      { name: "type", label: "Type", type: "select", options: ["stock", "crypto", "retirement", "other"] },
      { name: "amountInvested", label: "Amount invested", type: "number", step: "0.01" },
      { name: "currentValue", label: "Current value", type: "number", step: "0.01" },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function classFields() {
    return [
      { name: "name", label: "Class name", required: true },
      { name: "professor", label: "Professor", type: "text" },
      { name: "meetingDays", label: "Meeting days", type: "text" },
      { name: "accentColor", label: "Accent color", type: "color", default: "#7c5cff" },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function assignmentFields() {
    return [
      { name: "title", label: "Assignment title", required: true },
      { name: "classId", label: "Class", type: "select", options: [{ value: "", label: "No class" }, ...appData.school.classes.map((klass) => ({ value: klass.id, label: klass.name }))] },
      { name: "type", label: "Type", type: "select", options: [{ value: "", label: "No type" }, "assignment", "quiz", "exam", "project", "other"] },
      { name: "dueDate", label: "Due date", type: "date", default: today(), required: true },
      { name: "dueTime", label: "Due time", type: "time" },
      { name: "priority", label: "Priority", type: "select", options: [{ value: "", label: "No priority" }, "Low", "Medium", "High"] },
      { name: "status", label: "Status", type: "select", options: ["not started", "in progress", "submitted", "graded"] },
      { name: "grade", label: "Grade", type: "text" },
      { name: "pointsEarned", label: "Points earned", type: "number", step: "0.01" },
      { name: "pointsPossible", label: "Points possible", type: "number", step: "0.01" },
      { name: "link", label: "Link", type: "url" },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function workoutFields(initial = {}) {
    return [
      { name: "date", label: "Date", type: "date", default: today(), required: true },
      { name: "split", label: "Split", type: "select", options: ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body", "Cardio", "Rest", "Custom"] },
      { name: "duration", label: "Duration minutes", type: "number", step: "1" },
      { name: "energy", label: "Energy level", type: "number", min: 1, max: 5, step: "1" },
      { name: "exerciseText", label: "Exercises", type: "textarea", default: exercisesToText(initial.exercises), help: "One per line: Exercise name, sets, reps, weight" },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function nutritionFields() {
    return [
      { name: "mealName", label: "Meal name", required: true },
      { name: "calories", label: "Calories", type: "number", step: "1" },
      { name: "protein", label: "Protein", type: "number", step: "1" },
      { name: "carbs", label: "Carbs", type: "number", step: "1" },
      { name: "fat", label: "Fat", type: "number", step: "1" },
      { name: "date", label: "Date", type: "date", default: today(), required: true },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function shoppingFields() {
    return [
      { name: "itemName", label: "Item name", required: true },
      { name: "estimatedPrice", label: "Estimated price", type: "number", step: "0.01" },
      { name: "store", label: "Store", type: "text" },
      { name: "category", label: "Category", type: "text" },
      { name: "priority", label: "Priority", type: "select", options: [{ value: "", label: "No priority" }, "Low", "Medium", "High"] },
      { name: "purchased", label: "Purchased", type: "checkbox" }
    ];
  }

  function reminderFields() {
    return [
      { name: "title", label: "Reminder title", required: true },
      { name: "date", label: "Date", type: "date", default: today(), required: true },
      { name: "time", label: "Time", type: "time" },
      { name: "type", label: "Type", type: "select", options: ["Reminder", "Event", "Bill", "Task", "School", "Gym", "Other"] },
      { name: "completed", label: "Completed", type: "checkbox" },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function upsert(list, id, values, extra = {}) {
    if (id) {
      const item = findById(list, id);
      Object.assign(item, values, extra);
      return item;
    }
    const item = makeItem({ ...values, ...extra });
    list.push(item);
    return item;
  }

  function spendingDebtAmount(entry) {
    return Number(entry?.amount) || 0;
  }

  function adjustDebtBalance(debtId, amount) {
    if (!debtId || !amount) return;
    const debt = findById(appData.finance.debts, debtId);
    if (!debt) return;
    debt.balance = Math.max(0, (Number(debt.balance) || 0) + amount);
  }

  function applySpendingDebtImpact(entry, direction = 1) {
    if (!entry?.debtId) return;
    adjustDebtBalance(entry.debtId, spendingDebtAmount(entry) * direction);
  }

  function upsertSpending(id, values) {
    const previous = id ? { ...findById(appData.finance.spending, id) } : null;
    const next = { ...(previous || {}), ...values };
    if (previous?.debtId && previous.debtId === next.debtId) {
      const item = upsert(appData.finance.spending, id, values);
      adjustDebtBalance(item.debtId, spendingDebtAmount(item) - spendingDebtAmount(previous));
      return item;
    }
    if (previous) applySpendingDebtImpact(previous, -1);
    const item = upsert(appData.finance.spending, id, values);
    applySpendingDebtImpact(item, 1);
    return item;
  }

  function deleteSpendingItem(id) {
    const removed = removeById(appData.finance.spending, id);
    if (!removed) return false;
    applySpendingDebtImpact(removed.item, -1);
    setUndo("spending entry", () => {
      appData.finance.spending.splice(Math.min(removed.index, appData.finance.spending.length), 0, removed.item);
      applySpendingDebtImpact(removed.item, 1);
    });
    return true;
  }

  function openQuickAdd(initialText = "") {
    openForm({
      title: "Quick capture",
      fields: [
        { name: "text", label: "Capture", type: "textarea", required: true, default: initialText },
        { name: "category", label: "Send to", type: "select", options: ["Task", "Money", "Shopping", "School", "Gym", "Reminder", "Note", "Idea"] }
      ],
      submitLabel: "Capture",
      onSubmit(values) {
        captureToSection(values.text, values.category);
      }
    });
  }

  function captureToSection(text, category) {
    const inboxItem = makeItem({ text, category, processed: true });
    appData.inbox.push(inboxItem);
    const clean = text.trim();
    if (!clean) return;
    if (category === "Shopping") {
      appData.shopping.push(makeItem({ itemName: clean, estimatedPrice: 0, store: "", category: "", priority: "", purchased: false }));
    } else if (category === "School") {
      appData.school.assignments.push(makeItem({ title: clean, classId: "", type: "assignment", dueDate: today(), dueTime: "", priority: "", status: "not started", grade: "", pointsEarned: "", pointsPossible: "", notes: "", link: "" }));
    } else if (category === "Gym") {
      appData.tasks.push(makeItem({ title: clean, category: "Gym", dueDate: today(), priority: "", notes: "", reminderTime: "", completed: false }));
    } else if (category === "Reminder") {
      appData.reminders.push(makeItem({ title: clean, date: today(), time: "", type: "Reminder", notes: "", completed: false }));
    } else if (category === "Money") {
      appData.tasks.push(makeItem({ title: clean, category: "Money", dueDate: today(), priority: "", notes: "", reminderTime: "", completed: false }));
    } else if (category === "Note" || category === "Idea") {
      inboxItem.processed = false;
    } else {
      appData.tasks.push(makeItem({ title: clean, category: "Personal", dueDate: today(), priority: "", notes: "", reminderTime: "", completed: false }));
    }
  }

  function handleAction(action, button) {
    const id = button.dataset.id;
    if (action === "close-modal") return closeModal();
    if (action === "set-dashboard-span") {
      ui.dashboardSpan = button.dataset.span;
      return render({ quiet: true });
    }
    if (action === "set-dashboard-style") {
      ui.dashboardStyle = button.dataset.style;
      return render({ quiet: true });
    }
    if (action === "set-finance-span") {
      ui.financeSpan = button.dataset.span;
      return render({ quiet: true });
    }
    if (action === "set-more-view") {
      ui.moreView = button.dataset.view;
      return render();
    }
    if (action === "set-school-class-filter") {
      ui.schoolClassFilter = button.dataset.classId || id || "all";
      return render();
    }
    if (action === "undo-finance-delete") return undoFinanceDelete();
    if (action === "open-quick-add") return openQuickAdd();

    const rerender = () => {
      saveData();
      render();
    };

    const openEdit = (config) => openForm(config);

    switch (action) {
      case "add-daily-habit":
      case "edit-daily-habit": {
        const item = id ? findById(appData.dailyHabits, id) : {};
        openEdit({ title: id ? "Edit daily habit" : "Add daily habit", fields: habitFields(), initial: item, onSubmit: (values) => upsert(appData.dailyHabits, id, values) });
        break;
      }
      case "toggle-daily-habit": {
        appData.habitCompletions[today()] = appData.habitCompletions[today()] || {};
        appData.habitCompletions[today()][id] = !appData.habitCompletions[today()][id];
        saveData();
        animateCompletionToggle(button, Boolean(appData.habitCompletions[today()][id]), "Uncheck", "Complete", "Complete today", "Open today");
        break;
      }
      case "delete-daily-habit": {
        if (confirm("Delete this daily habit?")) {
          deleteById(appData.dailyHabits, id);
          Object.values(appData.habitCompletions).forEach((day) => delete day[id]);
          rerender();
        }
        break;
      }
      case "add-task":
      case "edit-task": {
        const item = id ? findById(appData.tasks, id) : {};
        openEdit({ title: id ? "Edit task" : "Add task", fields: taskFields(item), initial: item, onSubmit: (values) => upsert(appData.tasks, id, { ...values, completed: item.completed || false }) });
        break;
      }
      case "toggle-task": {
        const item = findById(appData.tasks, id);
        if (!item) break;
        item.completed = !item.completed;
        saveData();
        animateCompletionToggle(button, Boolean(item.completed), "Uncomplete", "Complete");
        break;
      }
      case "delete-task":
        if (confirm("Delete this task?")) {
          deleteById(appData.tasks, id);
          rerender();
        }
        break;
      case "add-task-category":
        openEdit({
          title: "Add task category",
          fields: [{ name: "category", label: "Category name", required: true }],
          submitLabel: "Add category",
          onSubmit(values) {
            const category = values.category.trim();
            if (!category) return;
            if (!appData.settings.taskCategories.includes(category)) appData.settings.taskCategories.push(category);
            ui.taskFilter = category;
          }
        });
        break;
      case "add-account":
      case "edit-account": {
        const item = id ? findById(appData.finance.accounts, id) : {};
        openEdit({ title: id ? "Edit account" : "Add account", fields: accountFields(), initial: item, onSubmit: (values) => upsert(appData.finance.accounts, id, values) });
        break;
      }
      case "delete-account":
        if (confirm("Delete this account?")) {
          deleteFinanceItem(appData.finance.accounts, id, "account");
          rerender();
          showToast("Account deleted.");
        }
        break;
      case "add-income":
      case "edit-income": {
        const item = id ? findById(appData.finance.income, id) : { type: "hourly", source: "Job", taxMode: "auto", deductionPercent: "" };
        openEdit({ title: id ? "Edit income" : "Add income", fields: incomeFields(), initial: item, onSubmit: (values) => upsert(appData.finance.income, id, values) });
        break;
      }
      case "delete-income":
        if (confirm("Delete this income entry?")) {
          deleteFinanceItem(appData.finance.income, id, "income entry");
          rerender();
          showToast("Income deleted.");
        }
        break;
      case "add-bill":
      case "edit-bill": {
        const item = id ? findById(appData.finance.bills, id) : { frequency: "monthly", paid: false };
        openEdit({ title: id ? "Edit bill" : "Add bill", fields: billFields(), initial: item, onSubmit: (values) => upsert(appData.finance.bills, id, values) });
        break;
      }
      case "toggle-bill-paid": {
        const item = findById(appData.finance.bills, id);
        item.paid = !item.paid;
        rerender();
        break;
      }
      case "delete-bill":
        if (confirm("Delete this bill?")) {
          deleteFinanceItem(appData.finance.bills, id, "bill");
          rerender();
          showToast("Bill deleted.");
        }
        break;
      case "add-spending":
      case "edit-spending": {
        const item = id ? findById(appData.finance.spending, id) : { necessary: true };
        openEdit({ title: id ? "Edit spending" : "Add spending", fields: spendingFields(), initial: item, onSubmit: (values) => upsertSpending(id, values) });
        break;
      }
      case "delete-spending":
        if (confirm("Delete this spending entry?")) {
          deleteSpendingItem(id);
          rerender();
          showToast("Spending deleted.");
        }
        break;
      case "add-debt":
      case "edit-debt": {
        const item = id ? findById(appData.finance.debts, id) : { paymentHistory: [] };
        openEdit({
          title: id ? "Edit debt" : "Add debt",
          fields: debtFields(),
          initial: item,
          onSubmit(values) {
            const originalBalance = values.originalBalance || values.balance;
            upsert(appData.finance.debts, id, { ...values, debtType: normalizedDebtType(values), originalBalance, paymentHistory: item.paymentHistory || [] });
          }
        });
        break;
      }
      case "make-debt-payment": {
        const debt = findById(appData.finance.debts, id);
        openEdit({
          title: "Make debt payment",
          fields: [
            { name: "amount", label: "Payment amount", type: "number", step: "0.01", required: true },
            { name: "date", label: "Payment date", type: "date", default: today() },
            { name: "notes", label: "Notes", type: "textarea" }
          ],
          onSubmit(values) {
            debt.balance = Math.max(0, (Number(debt.balance) || 0) - (Number(values.amount) || 0));
            debt.paymentHistory = debt.paymentHistory || [];
            debt.paymentHistory.push(makeItem(values));
          }
        });
        break;
      }
      case "delete-debt":
        if (confirm("Delete this debt?")) {
          deleteFinanceItem(appData.finance.debts, id, "debt");
          rerender();
          showToast("Debt deleted.");
        }
        break;
      case "add-investment":
      case "edit-investment": {
        const item = id ? findById(appData.finance.investments, id) : {};
        openEdit({ title: id ? "Edit investment" : "Add investment", fields: investmentFields(), initial: item, onSubmit: (values) => upsert(appData.finance.investments, id, values) });
        break;
      }
      case "delete-investment":
        if (confirm("Delete this investment?")) {
          deleteFinanceItem(appData.finance.investments, id, "investment");
          rerender();
          showToast("Investment deleted.");
        }
        break;
      case "add-class":
      case "edit-class": {
        const item = id ? findById(appData.school.classes, id) : {};
        openEdit({ title: id ? "Edit class" : "Add class", fields: classFields(), initial: item, onSubmit: (values) => upsert(appData.school.classes, id, values) });
        break;
      }
      case "delete-class":
        if (confirm("Delete this class? Assignments will stay but lose the class link.")) {
          deleteById(appData.school.classes, id);
          appData.school.assignments.forEach((assignment) => {
            if (assignment.classId === id) assignment.classId = "";
          });
          rerender();
        }
        break;
      case "add-assignment":
      case "edit-assignment": {
        const item = id ? findById(appData.school.assignments, id) : { status: "not started", type: "assignment" };
        openEdit({ title: id ? "Edit assignment" : "Add assignment", fields: assignmentFields(), initial: item, onSubmit: (values) => upsert(appData.school.assignments, id, values) });
        break;
      }
      case "delete-assignment":
        if (confirm("Delete this assignment?")) {
          deleteById(appData.school.assignments, id);
          rerender();
        }
        break;
      case "edit-gym-plan":
        openEdit({
          title: "Workout plan days",
          fields: [{ name: "planDays", label: "Plan days", type: "text", default: (appData.gym.planDays || []).map(dayName).join(", "), help: "Example: Mon, Wed, Fri" }],
          onSubmit(values) {
            appData.gym.planDays = parsePlanDays(values.planDays);
          }
        });
        break;
      case "add-workout":
      case "edit-workout": {
        const item = id ? findById(appData.gym.workouts, id) : {};
        openEdit({
          title: id ? "Edit workout" : "Add workout",
          fields: workoutFields(item),
          initial: { ...item, exerciseText: exercisesToText(item.exercises) },
          onSubmit(values) {
            const { exerciseText, ...rest } = values;
            upsert(appData.gym.workouts, id, { ...rest, exercises: parseExercises(exerciseText) });
          }
        });
        break;
      }
      case "delete-workout":
        if (confirm("Delete this workout?")) {
          deleteById(appData.gym.workouts, id);
          rerender();
        }
        break;
      case "enable-nutrition":
        appData.settings.nutrition = true;
        rerender();
        break;
      case "edit-nutrition-goals":
        openEdit({
          title: "Nutrition goals",
          fields: [
            { name: "calories", label: "Calories target", type: "number", step: "1" },
            { name: "protein", label: "Protein target", type: "number", step: "1" },
            { name: "carbs", label: "Carbs target", type: "number", step: "1" },
            { name: "fat", label: "Fat target", type: "number", step: "1" }
          ],
          initial: appData.nutrition.goals,
          onSubmit(values) {
            appData.nutrition.goals = values;
          }
        });
        break;
      case "add-nutrition":
      case "edit-nutrition": {
        const item = id ? findById(appData.nutrition.entries, id) : {};
        openEdit({ title: id ? "Edit nutrition entry" : "Add nutrition entry", fields: nutritionFields(), initial: item, onSubmit: (values) => upsert(appData.nutrition.entries, id, values) });
        break;
      }
      case "delete-nutrition":
        if (confirm("Delete this nutrition entry?")) {
          deleteById(appData.nutrition.entries, id);
          rerender();
        }
        break;
      case "add-shopping":
      case "edit-shopping": {
        const item = id ? findById(appData.shopping, id) : {};
        openEdit({ title: id ? "Edit shopping item" : "Add shopping item", fields: shoppingFields(), initial: item, onSubmit: (values) => upsert(appData.shopping, id, values) });
        break;
      }
      case "toggle-shopping": {
        const item = findById(appData.shopping, id);
        item.purchased = !item.purchased;
        rerender();
        break;
      }
      case "delete-shopping":
        if (confirm("Delete this shopping item?")) {
          deleteById(appData.shopping, id);
          rerender();
        }
        break;
      case "add-reminder":
      case "edit-reminder": {
        const item = id ? findById(appData.reminders, id) : {};
        openEdit({ title: id ? "Edit reminder" : "Add reminder", fields: reminderFields(), initial: item, onSubmit: (values) => upsert(appData.reminders, id, values) });
        break;
      }
      case "toggle-reminder": {
        const item = findById(appData.reminders, id);
        item.completed = !item.completed;
        rerender();
        break;
      }
      case "delete-reminder":
        if (confirm("Delete this reminder?")) {
          deleteById(appData.reminders, id);
          rerender();
        }
        break;
      case "capture-inbox": {
        const text = document.getElementById("capture-text")?.value || "";
        const category = document.getElementById("capture-type")?.value || "Task";
        if (!text.trim()) return showToast("Capture field is empty.");
        captureToSection(text, category);
        rerender();
        showToast("Captured.");
        break;
      }
      case "process-inbox": {
        const item = findById(appData.inbox, id);
        if (item) {
          captureToSection(item.text, item.category || "Task");
          item.processed = true;
          rerender();
        }
        break;
      }
      case "delete-inbox":
        if (confirm("Delete this inbox item?")) {
          deleteById(appData.inbox, id);
          rerender();
        }
        break;
      case "enable-weekly-review":
        appData.settings.weeklyReview = true;
        rerender();
        break;
      case "set-accent":
        appData.settings.accent = button.dataset.color;
        applyAccent();
        saveData();
        render();
        break;
      case "save-categories": {
        appData.settings.taskCategories = parseCategoryList(document.getElementById("settings-task-categories").value);
        appData.settings.billCategories = parseCategoryList(document.getElementById("settings-bill-categories").value);
        appData.settings.spendingCategories = parseCategoryList(document.getElementById("settings-spending-categories").value);
        rerender();
        showToast("Categories saved.");
        break;
      }
      case "save-tax-settings": {
        appData.settings.tax.payPeriodsPerYear = Math.max(1, Number(document.getElementById("tax-pay-periods").value) || 26);
        appData.settings.tax.ohioExemptions = Math.max(0, Number(document.getElementById("tax-ohio-exemptions").value) || 0);
        appData.settings.tax.ohioLocalRate = clamp(document.getElementById("tax-local-rate").value || 0, 0, 10);
        rerender();
        showToast("Tax settings saved.");
        break;
      }
      case "go-tasks":
        ui.activeTab = "tasks";
        render();
        break;
      case "go-school":
        ui.activeTab = "school";
        render();
        break;
      case "go-finance":
        ui.activeTab = "finance";
        render();
        break;
      case "save-sync-login": {
        const endpoint = document.getElementById("sync-endpoint")?.value.trim() || defaultSyncEndpoint();
        const account = document.getElementById("sync-account")?.value.trim() || "";
        const key = document.getElementById("sync-key")?.value || "";
        syncState = {
          ...syncState,
          enabled: Boolean(endpoint && account && key),
          endpoint,
          account,
          key,
          status: endpoint && account && key ? "Signing in..." : "Missing sync details"
        };
        saveSync();
        render();
        connectSync();
        break;
      }
      case "pull-sync-data":
        pullSyncData(true);
        break;
      case "push-sync-data":
        pushSyncData(true);
        break;
      case "sign-out-sync":
        syncState = {
          ...syncState,
          enabled: false,
          account: "",
          key: "",
          status: "Signed out"
        };
        saveSync();
        render();
        showToast("Signed out of sync.");
        break;
      case "export-data":
        exportData();
        break;
      case "reset-demo":
        if (confirm("Replace current data with demo data?")) {
          appData = demoData();
          normalizeData();
          applyAccent();
          rerender();
        }
        break;
      case "clear-data":
        if (confirm("Clear all saved planner data?")) {
          appData = emptyData(false);
          normalizeData();
          applyAccent();
          rerender();
        }
        break;
      default:
        break;
    }
  }

  function parseCategoryList(value) {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(appData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `planner-data-${today()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  document.addEventListener("click", (event) => {
    if (event.target.classList?.contains("modal-backdrop")) {
      closeModal();
      return;
    }
    const nav = event.target.closest("[data-tab]");
    if (nav) {
      ui.activeTab = nav.dataset.tab;
      render();
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    handleAction(button.dataset.action, button);
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.id === "task-filter") {
      ui.taskFilter = target.value;
      render();
      return;
    }
    if (target.dataset.dashboardCustom) {
      ui.dashboardCustom[target.dataset.dashboardCustom] = target.value;
      render({ quiet: true });
      return;
    }
    if (target.dataset.financeCustom) {
      ui.financeCustom[target.dataset.financeCustom] = target.value;
      render({ quiet: true });
      return;
    }
    if (target.dataset.assignmentStatus) {
      const item = findById(appData.school.assignments, target.dataset.assignmentStatus);
      if (item) {
        item.status = target.value;
        saveData();
        render();
      }
      return;
    }
    if (target.dataset.setting) {
      appData.settings[target.dataset.setting] = target.checked;
      saveData();
      render();
      return;
    }
    if (target.dataset.taxSetting) {
      appData.settings.tax[target.dataset.taxSetting] = target.checked;
      saveData();
      render();
      return;
    }
    if (target.id === "import-file" && target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          appData = JSON.parse(reader.result);
          normalizeData();
          applyAccent();
          saveData();
          render();
          showToast("Data imported.");
        } catch {
          showToast("Import failed. Choose a valid planner JSON file.");
        }
      };
      reader.readAsText(target.files[0]);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }

  setupNavIcons();
  render();
  finishAppLoad();
  if (syncConfigured()) {
    window.setTimeout(() => pullSyncData(false), 500);
  }
})();
