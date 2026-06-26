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
  const taxConfig = {
    federal: {
      standardDeductionSingle: 16100,
      bracketsSingle: [
        { min: 0, max: 12400, rate: 0.1 },
        { min: 12400, max: 50400, rate: 0.12 },
        { min: 50400, max: 105700, rate: 0.22 },
        { min: 105700, max: 201775, rate: 0.24 },
        { min: 201775, max: 256225, rate: 0.32 },
        { min: 256225, max: 640600, rate: 0.35 },
        { min: 640600, max: Infinity, rate: 0.37 }
      ]
    },
    fica: {
      socialSecurityRate: 0.062,
      socialSecurityCap: 184500,
      medicareRate: 0.0145
    },
    ohio: {
      exemptionThreshold: 26050,
      flatRateAboveThreshold: 0.0275
    },
    paycheckFrequencies: {
      weekly: 52,
      biweekly: 26,
      semimonthly: 24,
      monthly: 12,
      annual: 1
    }
  };
  const colorSwatches = ["#f7f7ff", "#c8ccd6", "#6f7685", "#25d8ff", "#7c5cff", "#9b8cff", "#32d98f", "#ffd166", "#ff6b8a", "#ff9f43"];

  const defaultSettings = () => ({
    accent: "#f7f7ff",
    weeklyReview: true,
    nutrition: true,
    gymDetails: true,
    schoolProgressShape: "halfring",
    schoolProgressLegend: false,
    schoolProgressLegendCounts: true,
    tax: {
      autoOhio: true,
      annualGrossIncome: 0,
      filingStatus: "single",
      paycheckFrequency: "biweekly",
      payPeriodsPerYear: 26,
      w2Income: true,
      municipalTaxRate: 0,
      schoolDistrictTaxRate: 0,
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
    goals: [],
    finance: {
      accounts: [],
      income: [],
      bills: [],
      spending: [],
      debts: [],
      investments: [],
      savings: [],
      savingsGoals: [],
      budgets: []
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
    inbox: [],
    notes: {
      items: [],
      folders: []
    },
    travel: {
      countries: {},
      cities: {},
      states: {}
    },
    bucketList: []
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
      makeItem({ name: "Phone", amount: 62, dueDate: d2, frequency: "monthly", category: "Phone", billType: "bill", paid: false, notes: "" }),
      makeItem({ name: "Streaming", amount: 15, dueDate: d5, frequency: "monthly", category: "Subscriptions", billType: "subscription", paid: false, notes: "" })
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
    const emergencyGoal = makeItem({ name: "Emergency fund", targetAmount: 1000, initialAmount: 420, targetDate: dateString(addDays(new Date(), 180)), notes: "" });
    data.finance.savingsGoals = [emergencyGoal];
    data.finance.savings = [
      makeItem({ amount: 60, date: d0, accountId: data.finance.accounts[1]?.id || "", goalId: emergencyGoal.id, note: "Automatic savings" })
    ];
    data.goals = [
      makeItem({ title: "Build emergency fund", category: "Money", targetDate: emergencyGoal.targetDate, linkedSavingsGoalId: emergencyGoal.id, progressPercent: 0, completed: false, notes: "" })
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
  let recentCompletion = null;
  let recentPinId = null;
  let lastTravelViewBox = null;
  let travelManualVB = null;
  let travelTweenRAF = null;
  let recentVisitKey = null;
  let moreSwitchTimer = null;
  let morePendingView = null;
  let lastScrollY = window.scrollY || 0;
  let financeShortcutScrollTicking = false;
  let financeShortcutHoldUntil = 0;
  const progressAnimationState = new Map();
  const numberAnimationState = new Map();
  const numberAnimationTokens = new Map();
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
      const stored = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
      // Gym + Nutrition moved into the Health tab and Reminders/Inbox were removed;
      // migrate any stale More views back to the shopping list.
      if (["gym", "nutrition", "reminders", "inbox"].includes(stored.moreView)) stored.moreView = "shopping";
      return {
        activeTab: "dashboard",
        moreView: "shopping",
        healthView: "workouts",
        workoutMode: "lift",
        habitDay: "today",
        notesFolderId: "all",
        notesSearch: "",
        dashboardSearch: "",
        notesEditingId: "",
        noteEditMode: false,
        travelFocus: "",
        travelStateFocus: "",
        travelView: "map",
        dashboardSpan: "today",
        dashboardStyle: "cards",
        financeSpan: "30",
        financeSection: "current-money",
        incomeHistorySpan: "month",
        spendingHistorySpan: "month",
        incomeChartGran: "month",
        incomeCompareOn: false,
        incomeCompareA: "",
        incomeCompareB: "",
        financeBarCollapsed: true,
        taskFilter: "All",
        schoolClassFilter: "all",
        schoolAssignmentFilter: "active",
        schoolSpan: "all",
        schoolView: "overview",
        selectedClassId: "",
        calendarMonth: "",
        calendarView: "month",
        calendarClasses: [],
        calendarSelectedDate: "",
        calendarKindFilter: "all",
        dashboardCustom: { start: today(), end: today() },
        financeCustom: { start: today(), end: dateString(addDays(new Date(), 30)) },
        schoolCustom: { start: today(), end: dateString(addDays(new Date(), 30)) },
        ...stored
      };
    } catch {
      return {
        activeTab: "dashboard",
        moreView: "shopping",
        healthView: "workouts",
        calendarView: "month",
        dashboardSpan: "today",
        dashboardStyle: "cards",
        financeSpan: "30",
        financeSection: "current-money",
        incomeHistorySpan: "month",
        spendingHistorySpan: "month",
        financeBarCollapsed: true,
        taskFilter: "All",
        schoolClassFilter: "all",
        schoolAssignmentFilter: "active",
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
    const incomingTax = appData.settings.tax || {};
    appData.settings.tax = { ...defaultSettings().tax, ...incomingTax };
    if (incomingTax.municipalTaxRate === undefined && incomingTax.ohioLocalRate !== undefined) {
      appData.settings.tax.municipalTaxRate = incomingTax.ohioLocalRate;
    }
    appData.settings.tax.paycheckFrequency = normalizePaycheckFrequency(appData.settings.tax.paycheckFrequency, appData.settings.tax.payPeriodsPerYear);
    appData.settings.tax.payPeriodsPerYear = payPeriodsForFrequency(appData.settings.tax.paycheckFrequency);
    appData.settings.tax.annualGrossIncome = Math.max(0, Number(appData.settings.tax.annualGrossIncome) || 0);
    appData.settings.tax.municipalTaxRate = normalizePercentInput(appData.settings.tax.municipalTaxRate);
    appData.settings.tax.schoolDistrictTaxRate = normalizePercentInput(appData.settings.tax.schoolDistrictTaxRate);
    appData.settings.tax.ohioLocalRate = appData.settings.tax.municipalTaxRate;
    appData.finance = deepMerge(fresh.finance, appData.finance || {});
    appData.school = deepMerge(fresh.school, appData.school || {});
    appData.gym = deepMerge(fresh.gym, appData.gym || {});
    appData.nutrition = deepMerge(fresh.nutrition, appData.nutrition || {});
    appData.dailyHabits = appData.dailyHabits || [];
    appData.habitCompletions = appData.habitCompletions || {};
    appData.tasks = appData.tasks || [];
    appData.tasks.forEach((task) => {
      if (task.startTime === undefined) task.startTime = task.reminderTime || "";
      if (task.endTime === undefined) task.endTime = "";
      if (task.classId === undefined) task.classId = "";
      if (task.classId && !findById(appData.school.classes, task.classId)) task.classId = "";
    });
    appData.goals = appData.goals || [];
    appData.goals.forEach((goal) => normalizeGoal(goal));
    appData.shopping = appData.shopping || [];
    appData.reminders = appData.reminders || [];
    appData.inbox = appData.inbox || [];
    appData.travel = appData.travel || { countries: {}, cities: {}, states: {} };
    appData.travel.countries = appData.travel.countries || {};
    appData.travel.cities = appData.travel.cities || {};
    appData.travel.states = appData.travel.states || {};
    appData.travel.trips = appData.travel.trips || [];
    appData.bucketList = Array.isArray(appData.bucketList) ? appData.bucketList : [];
    appData.orders = Array.isArray(appData.orders) ? appData.orders : [];
    appData.notes = appData.notes || { items: [], folders: [] };
    appData.notes.items = appData.notes.items || [];
    appData.notes.folders = appData.notes.folders || [];
    appData.notes.folders.forEach((folder) => {
      folder.name = folder.name || "Folder";
      folder.color = safeHexColor(folder.color, "");
    });
    appData.notes.items.forEach((note) => {
      note.title = note.title || "";
      note.body = note.body || "";
      note.color = safeHexColor(note.color, "");
      note.pinned = Boolean(note.pinned);
      if (note.folderId && !findById(appData.notes.folders, note.folderId)) note.folderId = "";
      note.folderId = note.folderId || "";
      note.updatedAt = note.updatedAt || note.createdAt || nowIso();
    });
    appData.finance.income.forEach((entry) => {
      if (!entry.taxMode) entry.taxMode = Number(entry.deductionPercent) > 0 ? "manual" : "auto";
    });
    appData.finance.bills.forEach((bill) => normalizeBill(bill));
    appData.finance.debts.forEach((debt) => {
      debt.debtType = normalizedDebtType(debt);
      debt.color = safeHexColor(debt.color, "");
      debt.paymentHistory = debt.paymentHistory || [];
      debt.paymentHistory.forEach((payment) => {
        payment.amount = Math.max(0, Number(payment.amount) || 0);
        payment.date = paymentHistoryDate(payment);
        if (!findById(appData.finance.accounts, payment.accountId)) {
          payment.accountId = defaultSpendingAccountId("Debit card");
        }
      });
    });
    appData.finance.spending.forEach((entry) => {
      entry.paymentMethod = normalizedPaymentMethod(entry.paymentMethod, entry.debtId);
      if (entry.necessary === undefined) entry.necessary = true;
      if (entry.paymentMethod === "Credit card") {
        entry.accountId = "";
      } else {
        entry.debtId = "";
        if (!findById(appData.finance.accounts, entry.accountId)) {
          entry.accountId = defaultSpendingAccountId(entry.paymentMethod);
        }
      }
    });
    appData.finance.savings.forEach((entry) => normalizeSavingEntry(entry));
    appData.finance.savingsGoals.forEach((goal) => normalizeSavingsGoal(goal));
    appData.school.classes.forEach((klass) => {
      // Migrate any old percentage grade to the nearest letter, then use letters.
      if (typeof klass.gradeLetter !== "string") {
        const oldPct = Number(klass.gradeManual);
        klass.gradeLetter = (klass.gradeManual !== "" && klass.gradeManual != null && !isNaN(oldPct)) ? pctToLetter(oldPct) : "";
      }
      klass.notes = klass.notes || "";
    });
    appData.school.assignments.forEach((assignment) => {
      assignment.status = normalizedAssignmentStatus(assignment.status);
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
    // Weeks run Monday–Sunday everywhere in the app.
    const d = new Date(date);
    const diff = (d.getDay() + 6) % 7; // days since Monday (Sunday=6)
    d.setDate(d.getDate() - diff);
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
    if (span === "year") return currentYearRange();
    if (span === "all") return { start: "1900-01-01", end: "2999-12-31", label: "All" };
    if (span === "paycheck") return { start: startToday, end: dateString(addDays(now, 13)), label: "Paycheck cycle" };
    if (span === "7") return { start: startToday, end: dateString(addDays(now, 6)), label: "7 days" };
    if (span === "14") return { start: startToday, end: dateString(addDays(now, 13)), label: "14 days" };
    if (span === "30") return { start: startToday, end: dateString(addDays(now, 29)), label: "30 days" };
    const start = custom?.start || startToday;
    const end = custom?.end || start;
    return start <= end ? { start, end, label: "Custom range" } : { start: end, end: start, label: "Custom range" };
  }

  function currentYearRange() {
    const now = new Date();
    const year = now.getFullYear();
    return { start: `${year}-01-01`, end: `${year}-12-31`, label: "This year" };
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

  function formatTime(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return "";
    let hour = Number(match[1]);
    const minute = match[2];
    const period = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${period}`;
  }

  function taskTimeLabel(task = {}) {
    const start = formatTime(task.startTime);
    const end = formatTime(task.endTime);
    if (start && end) return `${start} – ${end}`;
    if (start) return start;
    return "";
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

  function savingsAccounts() {
    return (appData.finance?.accounts || []).filter((account) => String(account.type || account.name || "").toLowerCase().includes("saving"));
  }

  function defaultSavingsAccountId() {
    const savings = savingsAccounts();
    return (savings[0] || appData.finance.accounts?.[0] || {}).id || "";
  }

  function defaultSpendingAccountId(method = "Debit card") {
    const accounts = appData.finance?.accounts || [];
    if (!accounts.length) return "";
    const normalized = normalizedPaymentMethod(method);
    const preferredType = normalized === "Cash" ? "cash" : "checking";
    const preferred = accounts.find((account) => String(account.type || account.name || "").toLowerCase().includes(preferredType));
    return (preferred || accounts[0]).id || "";
  }

  function normalizedPaymentMethod(value = "", debtId = "") {
    if (debtId) return "Credit card";
    const method = String(value || "").toLowerCase();
    if (method.includes("credit")) return "Credit card";
    if (method.includes("cash")) return "Cash";
    return "Debit card";
  }

  function spendingUsesCredit(entry = {}) {
    return normalizedPaymentMethod(entry.paymentMethod, entry.debtId) === "Credit card";
  }

  function normalizedBillType(bill = {}) {
    const value = String(bill.billType || bill.type || "").toLowerCase();
    if (["subscription", "subscriptions", "optional"].includes(value)) return "subscription";
    if (["bill", "mandatory", "required"].includes(value)) return "bill";
    const category = String(bill.category || "").toLowerCase();
    const name = String(bill.name || "").toLowerCase();
    if (category.includes("subscription") || /\b(netflix|streaming|prime|amazon|doordash|door dash|chatgpt|spotify|hulu|disney|youtube|apple|membership)\b/.test(name)) {
      return "subscription";
    }
    return "bill";
  }

  function billTypeLabel(bill = {}) {
    return normalizedBillType(bill) === "subscription" ? "Subscription" : "Bill";
  }

  function normalizeBill(bill = {}) {
    bill.name = bill.name || "Bill";
    bill.amount = Math.max(0, Number(bill.amount) || 0);
    bill.dueDate = bill.dueDate || today();
    bill.frequency = bill.frequency || "monthly";
    bill.customDays = Math.max(1, Number(bill.customDays) || 30);
    bill.category = bill.category || "";
    bill.billType = normalizedBillType(bill);
    bill.color = safeHexColor(bill.color, "");
    bill.paid = Boolean(bill.paid);
    bill.notes = bill.notes || "";
    return bill;
  }

  function normalizeSpendingValues(values = {}) {
    const cards = creditCardDebts();
    const next = { ...values };
    next.paymentMethod = normalizedPaymentMethod(next.paymentMethod, next.debtId);
    if (next.paymentMethod === "Credit card" && !next.debtId && cards.length === 1) {
      next.debtId = cards[0].id;
    }
    if (next.debtId) next.paymentMethod = "Credit card";
    if (next.paymentMethod === "Credit card") {
      next.accountId = "";
    } else {
      next.debtId = "";
      if (!findById(appData.finance.accounts, next.accountId)) {
        next.accountId = defaultSpendingAccountId(next.paymentMethod);
      }
    }
    return next;
  }

  function normalizeSavingEntry(entry = {}) {
    entry.amount = Math.max(0, Number(entry.amount) || 0);
    entry.date = entry.date || today();
    if (!findById(appData.finance.accounts, entry.accountId)) entry.accountId = defaultSavingsAccountId();
    if (!findById(appData.finance.savingsGoals, entry.goalId)) entry.goalId = "";
    entry.note = entry.note || "";
    return entry;
  }

  function normalizeSavingsGoal(goal = {}) {
    goal.name = goal.name || "Savings goal";
    goal.targetAmount = Math.max(0, Number(goal.targetAmount) || 0);
    goal.initialAmount = Math.max(0, Number(goal.initialAmount) || 0);
    goal.targetDate = goal.targetDate || "";
    goal.notes = goal.notes || "";
    return goal;
  }

  function normalizeGoal(goal = {}) {
    goal.title = goal.title || "Goal";
    goal.category = goal.category || "Personal";
    goal.targetDate = goal.targetDate || "";
    goal.linkedSavingsGoalId = findById(appData.finance.savingsGoals, goal.linkedSavingsGoalId) ? goal.linkedSavingsGoalId : "";
    goal.progressPercent = clamp(goal.progressPercent);
    goal.completed = Boolean(goal.completed);
    goal.notes = goal.notes || "";
    return goal;
  }

  function debtPaymentHistoryEntries() {
    return appData.finance.debts.flatMap((debt) => (debt.paymentHistory || []).map((payment) => ({
      ...payment,
      debtId: debt.id,
      debtName: debt.name || "Debt payment",
      debtType: normalizedDebtType(debt)
    })));
  }

  function paymentHistoryDate(payment = {}) {
    return payment.date || String(payment.createdAt || "").slice(0, 10) || today();
  }

  function normalizePercentInput(value) {
    if (value === "" || value === null || value === undefined) return 0;
    return clamp(Number(value) || 0, 0, 100);
  }

  function percentToRate(value) {
    return normalizePercentInput(value) / 100;
  }

  function normalizePaycheckFrequency(value, legacyPeriods = 26) {
    if (taxConfig.paycheckFrequencies[value]) return value;
    const periods = Number(legacyPeriods) || 26;
    if (periods >= 50) return "weekly";
    if (periods === 24) return "semimonthly";
    if (periods <= 12) return "monthly";
    return "biweekly";
  }

  function payPeriodsForFrequency(value) {
    return taxConfig.paycheckFrequencies[normalizePaycheckFrequency(value)] || 26;
  }

  function taxSettings() {
    return { ...defaultSettings().tax, ...(appData.settings.tax || {}) };
  }

  function localTaxRates(settings = taxSettings()) {
    return {
      municipalRate: percentToRate(settings.municipalTaxRate),
      schoolDistrictRate: percentToRate(settings.schoolDistrictTaxRate)
    };
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
      chevron: '<path d="m9 18 6-6-6-6" />',
      calendar: '<path d="M8 2v4M16 2v4M3 10h18" /><path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />',
      chart: '<path d="M3 3v18h18" /><path d="M7 15v-5M12 15V7M17 15v-9" />',
      upload: '<path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M20 16v4H4v-4" />',
      download: '<path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M20 20H4" />',
      settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.05.05a2 2 0 0 1-2.83 2.83l-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.03.04a2 2 0 0 1-3.94 0L10 20a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.05.05a2 2 0 0 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.04-.03a2 2 0 0 1 0-3.94L4 10a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.05-.05a2 2 0 0 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.03-.04a2 2 0 0 1 3.94 0L14 4a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.05-.05a2 2 0 0 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.4 9c.18.35.38.67.6 1l.04.03a2 2 0 0 1 0 3.94L20 14a1.7 1.7 0 0 0-.6 1z" />',
      circle: '<circle cx="12" cy="12" r="9" />',
      target: '<circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" />',
      spark: '<path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />',
      heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />',
      clock: '<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />',
      dumbbell: '<path d="M6.5 6.5 17.5 17.5M3 8v8M8 4v16M16 4v16M21 8v8" />',
      flame: '<path d="M12 2c1 4-2 5-2 8a4 4 0 0 0 8 0c0-1-1-2-1-2 0 2-1.5 2.5-1.5 2.5C16 6 12 5 12 2Z" /><path d="M8.5 11c-.5 1-1 2-1 3a4.5 4.5 0 0 0 9 0" />',
      note: '<path d="M5 3h10l4 4v14a0 0 0 0 1 0 0H5a0 0 0 0 1 0 0V3z" /><path d="M14 3v5h5" /><path d="M8 13h8M8 17h5" />',
      folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />',
      pin: '<path d="M9 3h6l-1 6 3 3v2h-4v5l-1 2-1-2v-5H6v-2l3-3-1-6z" />',
      globe: '<circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><ellipse cx="12" cy="12" rx="4" ry="9" />',
      activity: '<path d="M3 12h4l2.5 7 5-16 2.5 9h4" />',
      search: '<circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />',
      repeat: '<path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" />',
      list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />',
      package: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />',
      plane: '<path d="M17.8 19.2 16 11l3.5-3.5a2.12 2.12 0 0 0-3-3L13 8 4.8 6.2a1 1 0 0 0-.9 1.7l5.1 3.5-2 2-2.5-.5a1 1 0 0 0-.9 1.6l2.4 2.4 2.4 2.4a1 1 0 0 0 1.6-.9l-.5-2.5 2-2 3.5 5.1a1 1 0 0 0 1.7-.9z" />',
      pin2: '<path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" />'
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
    const periodTransition = options.transition === "period";
    const schoolFilterTransition = options.transition === "school-filter";
    app.classList.toggle("is-soft-render", quiet);
    app.classList.toggle("is-period-render", periodTransition);
    app.classList.toggle("is-school-filter-render", schoolFilterTransition);
    saveUi();
    document.querySelectorAll(".nav-item").forEach((button) => {
      const isActive = button.dataset.tab === ui.activeTab;
      button.classList.toggle("active", isActive);
      if (isActive && button.scrollIntoView) {
        try { button.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); } catch {}
      }
    });

    if (ui.activeTab === "dashboard") app.innerHTML = renderDashboard();
    if (ui.activeTab === "tasks") app.innerHTML = renderTasks();
    if (ui.activeTab === "finance") app.innerHTML = renderFinance();
    if (ui.activeTab === "school") app.innerHTML = renderSchool();
    if (ui.activeTab === "calendar") app.innerHTML = renderCalendarPage();
    if (ui.activeTab === "health") app.innerHTML = renderHealth();
    if (ui.activeTab === "notes") app.innerHTML = renderNotes();
    if (ui.activeTab === "travel") app.innerHTML = renderTravel();
    if (ui.activeTab === "more") app.innerHTML = renderMore();
    if (ui.activeTab === "calendar") scrollCalendarTimeline();
    if (ui.activeTab === "tasks") restoreHabitSwipe();
    if (ui.activeTab === "notes") setupNotesEditor();
    if (ui.activeTab === "travel") setupTravelMap();
    if (ui.activeTab === "finance") {
      setupFinanceHistory();
      setupFinanceChart();
      app.querySelector(".fin-tab.active")?.scrollIntoView({ inline: "center", block: "nearest" });
    }
    animateProgressIndicators();
    animateCountElements(app, { force: periodTransition });
    if (ui.activeTab !== "finance") app.classList.remove("finance-shortcuts-hidden");
    lastScrollY = window.scrollY || 0;
    restoreSchoolFilterState(options.schoolFilterState, { keepSelectedClass: options.keepSelectedClassFilter });
    if (periodTransition) {
      window.setTimeout(() => {
        app.classList.remove("is-period-render");
      }, 260);
    }
    if (schoolFilterTransition) {
      window.setTimeout(() => {
        app.classList.remove("is-school-filter-render");
      }, 260);
    }
  }

  function captureSchoolFilterState() {
    return {
      classScrollLeft: app.querySelector(".class-filter")?.scrollLeft || 0,
      statusScrollLeft: app.querySelector(".assignment-status-filter")?.scrollLeft || 0
    };
  }

  function restoreSchoolFilterState(state, options = {}) {
    if (!state || ui.activeTab !== "school") return;
    window.requestAnimationFrame(() => {
      const classFilter = app.querySelector(".class-filter");
      const statusFilter = app.querySelector(".assignment-status-filter");
      if (classFilter) classFilter.scrollLeft = Number(state.classScrollLeft) || 0;
      if (statusFilter) statusFilter.scrollLeft = Number(state.statusScrollLeft) || 0;
      if (options.keepSelectedClass) {
        const selectedClass = classFilter?.querySelector(".class-chip.active");
        selectedClass?.scrollIntoView({ block: "nearest", inline: "center", behavior: "auto" });
      }
    });
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
    const iconOnly = className.split(/\s+/).includes("icon-btn");
    const text = iconOnly ? "" : `<span>${escapeHtml(label)}</span>`;
    // Delete / trash actions get a subtle red treatment everywhere in the app.
    const dangerClass = iconName === "trash" ? " danger-action" : "";
    return `<button type="button" class="${className}${dangerClass}" data-action="${action}" data-id="${escapeHtml(id || "")}" ${attrs} title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${icon(iconName)}${text}</button>`;
  }

  function countableValueHtml(key, value) {
    const text = String(value ?? "").trim();
    if (!text || text.includes("<") || text.includes("/")) return value;
    const plain = text.replaceAll(",", "");
    const compactCurrencyMatch = plain.match(/^(-?)\$([0-9]+(?:\.[0-9]+)?)([KMB])$/i);
    if (compactCurrencyMatch) {
      const multiplier = { k: 1000, m: 1000000, b: 1000000000 }[compactCurrencyMatch[3].toLowerCase()] || 1;
      const amount = (Number(`${compactCurrencyMatch[1]}${compactCurrencyMatch[2]}`) || 0) * multiplier;
      return countSpan(key, amount, { format: "compact-currency" });
    }
    if (/[a-z]/i.test(plain)) return value;
    const currencyMatch = plain.match(/^(-?)\$([0-9]+(?:\.[0-9]+)?)$/);
    if (currencyMatch) {
      const amount = Number(`${currencyMatch[1]}${currencyMatch[2]}`) || 0;
      return countSpan(key, amount, { format: "currency" });
    }
    const percentMatch = plain.match(/^(-?[0-9]+(?:\.[0-9]+)?)%$/);
    if (percentMatch) {
      const amount = Number(percentMatch[1]) || 0;
      const decimals = percentMatch[1].split(".")[1]?.length || 0;
      return countSpan(key, amount, { format: decimals ? "decimal" : "integer", digits: decimals, suffix: "%" });
    }
    const numberMatch = plain.match(/^-?[0-9]+(?:\.[0-9]+)?$/);
    if (numberMatch) {
      const decimals = plain.split(".")[1]?.length || 0;
      return countSpan(key, Number(plain) || 0, { format: decimals ? "decimal" : "integer", digits: decimals });
    }
    return value;
  }

  function metric(label, value, note = "", animation = null) {
    const valueHtml = animation?.value
      ? countSpan(animation.value.key, animation.value.value, animation.value)
      : countableValueHtml(`${ui.activeTab}:metric:${slugKey(label)}`, value);
    const noteHtml = escapeHtml(note);
    return `
      <article class="card metric-card">
        <div class="metric-label">${escapeHtml(label)}</div>
        <div>
          <div class="metric-value">${valueHtml}</div>
          ${note ? `<div class="metric-note">${noteHtml}</div>` : ""}
        </div>
      </article>
    `;
  }

  function ringMetric(label, value, percent, note = "") {
    return `
      <article class="card ring-card">
        <div class="ring" style="--value:${clamp(percent)}">
          <span class="ring-value">${countableValueHtml(`${ui.activeTab}:ring:${slugKey(label)}`, value)}</span>
        </div>
        <div>
          <p class="ring-label">${escapeHtml(label)}</p>
          ${note ? `<p class="ring-note">${escapeHtml(note)}</p>` : ""}
        </div>
      </article>
    `;
  }

  function slugKey(value) {
    return String(value || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
  }

  function animatedDisplay(scope, label, value) {
    return countableValueHtml(`${ui.activeTab}:${scope}:${slugKey(label)}`, value);
  }

  function animatedRangeLabel(scope, label, value) {
    const text = String(value || "");
    const days = text.match(/^(\d+)\s+days$/i);
    if (days) return countSpan(`${ui.activeTab}:${scope}:${slugKey(label)}:days`, Number(days[1]) || 0, { suffix: " days" });
    return escapeHtml(text);
  }

  function countSpan(key, value, options = {}) {
    const numeric = Number(value) || 0;
    const format = options.format || "integer";
    const digits = options.digits ?? 0;
    const prefix = options.prefix || "";
    const suffix = options.suffix || "";
    return `<span class="count-value" data-count-key="${escapeHtml(key)}" data-count-value="${escapeHtml(numeric)}" data-count-format="${escapeHtml(format)}" data-count-digits="${escapeHtml(digits)}" data-count-prefix="${escapeHtml(prefix)}" data-count-suffix="${escapeHtml(suffix)}">${escapeHtml(formatAnimatedNumber(numeric, { format, digits, prefix, suffix }))}</span>`;
  }

  function progressDetailHtml(key, detail) {
    return escapeHtml(String(detail || ""));
  }

  function progressRow(label, percent, detail = "", key = "") {
    const progressKey = `${ui.activeTab}:${slugKey(key || label)}`;
    const value = clamp(percent);
    return `
      <div class="progress-row" data-progress-key="${escapeHtml(progressKey)}" data-progress-percent="${escapeHtml(value)}">
        <div class="progress-label"><span>${escapeHtml(label)}</span><span class="progress-value">${countSpan(`${progressKey}:percent`, value, { suffix: "%" })}${detail ? ` · ${progressDetailHtml(progressKey, detail)}` : ""}</span></div>
        <div class="progress"><span style="width:${value}%"></span></div>
      </div>
    `;
  }

  function animateProgressIndicators(root = app) {
    root.querySelectorAll("[data-progress-key][data-progress-percent]").forEach((element) => {
      const key = element.dataset.progressKey;
      const target = clamp(element.dataset.progressPercent);
      const bar = element.querySelector(".progress > span");
      const previous = progressAnimationState.has(key) ? progressAnimationState.get(key) : target;
      progressAnimationState.set(key, target);
      if (!bar || previous === target) return;
      element.classList.add("is-progress-animating");
      bar.style.width = `${previous}%`;
      window.requestAnimationFrame(() => {
        if (!bar.isConnected) return;
        bar.style.width = `${target}%`;
      });
      window.setTimeout(() => {
        if (element.isConnected) element.classList.remove("is-progress-animating");
      }, 760);
    });
  }

  function animateCountElements(root = app, options = {}) {
    root.querySelectorAll("[data-count-key]").forEach((element) => {
      const key = element.dataset.countKey;
      const target = Number(element.dataset.countValue) || 0;
      const previous = numberAnimationState.has(key) ? numberAnimationState.get(key) : target;
      numberAnimationState.set(key, target);
      if (previous === target) {
        element.textContent = formatAnimatedNumber(target, countOptions(element));
        if (options.force) {
          element.classList.remove("is-counting");
          void element.offsetWidth;
          element.classList.add("is-counting");
          window.setTimeout(() => {
            if (element.isConnected) element.classList.remove("is-counting");
          }, 420);
        }
        return;
      }
      animateCountElement(element, previous, target);
    });
  }

  function animateCountElement(element, start, end) {
    const key = element.dataset.countKey;
    const token = `${Date.now()}-${Math.random()}`;
    numberAnimationTokens.set(key, token);
    const distance = Math.abs(end - start);
    const duration = Math.min(950, Math.max(420, 360 + distance * 28));
    const startedAt = performance.now();
    element.classList.add("is-counting");

    const tick = (now) => {
      if (!element.isConnected || numberAnimationTokens.get(key) !== token) return;
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      element.textContent = formatAnimatedNumber(current, countOptions(element));
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        element.textContent = formatAnimatedNumber(end, countOptions(element));
        element.classList.remove("is-counting");
      }
    };

    window.requestAnimationFrame(tick);
  }

  // The bar lives in normal flow after the headline metrics, then pins. We track
  // a zero-height sentinel at its natural position so the bar stays visible
  // through the whole top region and only hides once you've scrolled well past it.
  const FINANCE_BAR_SHOW_AT = -32; // sentinel still at/near the top of the viewport -> visible
  const FINANCE_BAR_HIDE_AT = -260; // scrolled well past the bar's anchor -> hide
  const FINANCE_BAR_TOP_ZONE = 110; // px from top of the viewport that counts as "reaching for the bar"

  function updateFinanceShortcutVisibility() {
    financeShortcutScrollTicking = false;
    if (ui.activeTab !== "finance" || !app.querySelector(".finance-shortcuts")) {
      app.classList.remove("finance-shortcuts-hidden");
      lastScrollY = window.scrollY || 0;
      return;
    }
    const currentMoney = app.querySelector("#finance-section-current-money");
    if (!currentMoney) {
      app.classList.remove("finance-shortcuts-hidden");
      return;
    }
    // Show the bar while the Current money section is still in view; hide once
    // you've scrolled past it, and bring it straight back when it re-enters.
    const bottom = currentMoney.getBoundingClientRect().bottom;
    if (bottom > 90) {
      app.classList.remove("finance-shortcuts-hidden");
      app.querySelector(".finance-jump")?.classList.remove("is-open");
    } else {
      app.classList.add("finance-shortcuts-hidden");
    }
    lastScrollY = window.scrollY || 0;
  }

  // Deliberately reaching toward the top edge of the screen (or the bar area)
  // brings the bar back, even when scrolled down into content.
  function revealFinanceShortcutsFromTop(event) {
    if (ui.activeTab !== "finance" || !app.querySelector(".finance-shortcuts")) return;
    if (!app.classList.contains("finance-shortcuts-hidden")) return;
    const point = event.touches && event.touches[0] ? event.touches[0] : event;
    const y = typeof point.clientY === "number" ? point.clientY : null;
    if (y === null || y > FINANCE_BAR_TOP_ZONE) return;
    financeShortcutHoldUntil = Date.now() + 1100; // brief hold so scroll jitter can't re-hide it
    app.classList.remove("finance-shortcuts-hidden");
  }

  function scheduleFinanceShortcutVisibility() {
    if (financeShortcutScrollTicking) return;
    financeShortcutScrollTicking = true;
    window.requestAnimationFrame(updateFinanceShortcutVisibility);
  }

  function countOptions(element) {
    return {
      format: element.dataset.countFormat || "integer",
      digits: Number(element.dataset.countDigits) || 0,
      prefix: element.dataset.countPrefix || "",
      suffix: element.dataset.countSuffix || ""
    };
  }

  function formatAnimatedNumber(value, options = {}) {
    const format = options.format || "integer";
    const digits = Number(options.digits) || 0;
    let body;
    if (format === "currency") body = formatCurrency(value);
    else if (format === "compact-currency") body = formatCompactCurrency(value);
    else if (format === "decimal") body = formatNumber(value, digits);
    else body = formatNumber(Math.round(value), 0);
    if (format === "currency" || format === "compact-currency") return body;
    return `${options.prefix || ""}${body}${options.suffix || ""}`;
  }

  function itemCard({ title, meta = [], note = "", actions = "", className = "", style = "", attrs = "" }) {
    const metaHtml = meta.filter(Boolean).map((m) => `<span>${escapeHtml(m)}</span>`).join("");
    return `
      <article class="item-card ${className}"${style ? ` style="${escapeHtml(style)}"` : ""}${attrs ? ` ${attrs}` : ""}>
        <div class="item-main">
          <p class="item-title">${escapeHtml(title)}</p>
          ${metaHtml ? `<div class="item-meta">${metaHtml}</div>` : ""}
          ${note ? `<p class="tiny">${escapeHtml(note)}</p>` : ""}
        </div>
        <div class="item-actions">${actions}</div>
      </article>
    `;
  }

  // Collapsible finance history entry. Collapsed view shows just the colored
  // amount headline (green for income, red for spending) with the source/date
  // underneath; expanding reveals the full breakdown and actions.
  function financeEntryCard({ sign = "income", amount, name, date, details = [], note = "", actions = "", attrs = "" }) {
    const signSymbol = sign === "expense" ? "−" : "+";
    const sub = [name, date].filter(Boolean).join(" · ");
    const detailHtml = details.filter(Boolean).map((d) => `
      <div class="fin-entry-detail">
        <span class="fin-entry-detail-label">${escapeHtml(d.label)}</span>
        <span class="fin-entry-detail-value ${d.money ? `fin-num ${sign}` : ""}">${escapeHtml(d.value)}</span>
      </div>`).join("");
    return `
      <details class="fin-entry fin-entry-${escapeHtml(sign)}"${attrs ? ` ${attrs}` : ""}>
        <summary class="fin-entry-summary">
          <span class="fin-entry-headline">
            <span class="fin-entry-amount fin-num ${escapeHtml(sign)}">${signSymbol}${escapeHtml(amount)}</span>
            ${sub ? `<span class="fin-entry-sub">${escapeHtml(sub)}</span>` : ""}
          </span>
        </summary>
        <div class="fin-entry-body details-body">
          ${detailHtml ? `<div class="fin-entry-details">${detailHtml}</div>` : ""}
          ${note ? `<p class="fin-entry-note">${escapeHtml(note)}</p>` : ""}
          ${actions ? `<div class="fin-entry-actions">${actions}</div>` : ""}
        </div>
      </details>
    `;
  }

  function recentCompletionClass(id, isComplete) {
    if (recentCompletion?.id !== id) return "";
    return isComplete ? "just-completed" : "just-uncompleted";
  }

  function emptyState(message) {
    return `<div class="empty">${escapeHtml(message)}</div>`;
  }

  function topbar(title, eyebrow, action = "") {
    return `
      <section class="topbar">
        <div>
          ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
          <h1>${escapeHtml(title)}</h1>
        </div>
        ${action ? `<div class="actions">${action}</div>` : ""}
      </section>
    `;
  }

  function rangeToggle(kind, active) {
    const spans = kind === "school"
      ? [
          ["today", "Today"],
          ["week", "This week"],
          ["month", "This month"],
          ["year", "This year"],
          ["all", "All"],
          ["custom", "Custom"]
        ]
      : kind === "dashboard"
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
    if (
      (kind === "dashboard" && ui.dashboardSpan !== "custom") ||
      (kind === "finance" && ui.financeSpan !== "custom") ||
      (kind === "school" && ui.schoolSpan !== "custom")
    ) return "";
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
    const todayFocusList = getTodayFocus(true);
    const weekly = weeklySummary();
    const openBills = safeFinance.billOccurrences.filter((bill) => !bill.paid);
    const obligationCount = openBills.length + safeFinance.debtPaymentOccurrences.length;
    const obligationTotal = safeFinance.billsDue + safeFinance.debtPayments;
    const moneyTrend = moneyTrendMonths(6);
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

    // ---- mockup-A hero values (fixed semantics: today + this month) ----
    const monthFinance = calculateFinance(calculateDateRange("month"));
    const habitToday = habitStats(calculateDateRange("today"));
    const weekGym = gymStats(calculateDateRange("week"));
    const dayTotal = todayFocusList.length;
    const dayDone = dayTotal - todayFocus.length;
    const dayPct = dayTotal ? Math.round((dayDone / dayTotal) * 100) : 100;
    const nextEv = scheduleHorizonEvents(45).find((e) => e.date === today() && e.start);
    const sublineParts = [`${todayFocus.length} ${todayFocus.length === 1 ? "thing" : "things"} to do today`];
    if (nextEv) sublineParts.push(`next at ${formatTime(nextEv.start)}`);

    const searchQuery = String(ui.dashboardSearch || "").trim();
    const dashSearchBar = `
      <div class="notes-search dash-search">
        <span class="notes-search-ic">${icon("search")}</span>
        <input type="search" class="notes-search-input" data-dash-search placeholder="Search tasks, notes, money…" value="${escapeHtml(ui.dashboardSearch || "")}" aria-label="Search everything">
      </div>`;
    return `
      <div class="view dashboard-view">
        ${topbar("Today", formatLongDate(today()), actionButton("open-quick-add", "", "Quick add", "plus", "primary"))}
        ${dashSearchBar}
        ${searchQuery ? renderSearchResults(searchQuery) : `
        <section class="card panel dash-hero">
          <div class="dash-hero-top">
            <div class="dash-hero-text">
              <p class="dash-hero-greet">${escapeHtml(dashGreeting())}</p>
              <p class="dash-hero-sub">${escapeHtml(sublineParts.join(" · "))}</p>
            </div>
            ${dashRing(dayPct, "var(--green)")}
          </div>
          <div class="dash-chips">
            <div class="dash-chip"><span class="dash-chip-n">${todayFocus.length}</span><span class="dash-chip-l">Tasks left</span></div>
            <div class="dash-chip"><span class="dash-chip-n">${animatedDisplay("chip", "month", formatCompactCurrency(monthFinance.netIncome))}</span><span class="dash-chip-l">This month</span></div>
            <div class="dash-chip"><span class="dash-chip-n">${habitToday.percent}%</span><span class="dash-chip-l">Habits</span></div>
          </div>
        </section>

        ${renderDashboardUpNext()}

        <div class="sec-head"><span class="sec-title">Snapshot</span></div>
        <section class="snap-grid">
          ${snapTile("Money", formatCompactCurrency(safeFinance.safeToSpend), "Safe to spend", "wallet", "var(--green)", "finance")}
          ${snapTile("Tasks", String(todayFocus.length), "Open today", "check", "var(--purple)", "tasks")}
          ${snapTile("School", String(school.openDue.length), `${school.overdue.length} overdue`, "book", "var(--blue)", "school")}
          ${snapTile("Health", String(weekGym.workouts.length), "Workouts this week", "heart", "var(--pink)", "health")}
        </section>

        <div class="sec-head"><span class="sec-title">Today focus</span>${actionButton("add-task", "", "Add task", "plus", "secondary")}</div>
        <section class="card panel">
          <div class="list ${todayFocusList.length ? "grouped" : ""}">
            ${todayFocusList.length ? todayFocusList.map(renderFocusItem).join("") : emptyState("No items due today.")}
          </div>
        </section>

        ${renderDashboardMoneyGraph(moneyTrend)}

        <details class="card panel section dash-detail">
          <summary>
            <span class="finance-section-heading"><span class="finance-section-title">Overview &amp; metrics</span></span>
            <span class="tiny">${escapeHtml(range.label)}</span>
          </summary>
          <div class="details-body">
            ${rangeToggle("dashboard", ui.dashboardSpan)}
            ${customRangeControls("dashboard", range)}
            ${dashboardViewToggle()}
            <section class="${ui.dashboardStyle === "rings" ? "ring-grid" : "metric-grid"}" style="margin-top:12px">
              ${ui.dashboardStyle === "rings" ? ringMetrics : dashboardMetrics}
            </section>
          </div>
        </details>

        <section class="card panel section">
          <div class="section-header">
            <h2>Weekly progress</h2>
            <span class="tiny">${escapeHtml(formatDate(weekly.range.start))} to ${escapeHtml(formatDate(weekly.range.end))}</span>
          </div>
          ${progressRow("Tasks", weekly.tasks.percent, `${weekly.tasks.completed}/${weekly.tasks.total}`)}
          ${progressRow("Habits", weekly.habits.percent, `${weekly.habits.completed}/${weekly.habits.total}`)}
          ${progressRow("School", weekly.school.percent, `${weekly.school.completed.length}/${weekly.school.total}`)}
        </section>

        ${renderDashboardGoals()}
        `}
      </div>
    `;
  }

  const SEARCH_GROUPS = [
    { type: "task", label: "Tasks", icon: "check", color: "var(--purple)" },
    { type: "assignment", label: "Assignments", icon: "book", color: "var(--blue)" },
    { type: "note", label: "Notes", icon: "note", color: "#ffd166" },
    { type: "spending", label: "Spending", icon: "wallet", color: "var(--green)" },
    { type: "income", label: "Income", icon: "wallet", color: "var(--green)" },
    { type: "bill", label: "Bills", icon: "calendar", color: "var(--orange)" }
  ];

  // Search across tasks, assignments, notes, and money in one place.
  function globalSearchResults(query) {
    const q = query.toLowerCase();
    const has = (...vals) => vals.some((v) => String(v || "").toLowerCase().includes(q));
    const out = [];
    appData.tasks.filter((t) => has(t.title, t.notes, t.category)).forEach((t) => out.push({ type: "task", id: t.id, title: t.title || "Task", sub: [t.category, t.dueDate ? formatDate(t.dueDate) : ""].filter(Boolean).join(" · "), done: !!t.completed }));
    (appData.school.assignments || []).filter((a) => has(a.title, a.type)).forEach((a) => out.push({ type: "assignment", id: a.id, title: a.title || "Assignment", sub: [a.classId ? className(a.classId) : "", a.dueDate ? formatDate(a.dueDate) : ""].filter(Boolean).join(" · ") }));
    (appData.notes.items || []).filter((n) => has(n.title, n.body)).forEach((n) => out.push({ type: "note", id: n.id, title: n.title || "Untitled note", sub: noteSnippet(n) }));
    appData.finance.spending.filter((s) => has(s.note, s.category)).forEach((s) => out.push({ type: "spending", id: s.id, title: s.note || s.category || "Spending", sub: [formatCurrency(s.amount), s.date ? formatDate(s.date) : ""].filter(Boolean).join(" · ") }));
    appData.finance.income.filter((i) => has(i.source, i.notes)).forEach((i) => out.push({ type: "income", id: i.id, title: i.source || "Income", sub: incomeDate(i) ? formatDate(incomeDate(i)) : "" }));
    appData.finance.bills.filter((b) => has(b.name, b.category)).forEach((b) => out.push({ type: "bill", id: b.id, title: b.name || "Bill", sub: [formatCurrency(b.amount), b.category].filter(Boolean).join(" · ") }));
    return out;
  }

  function renderSearchResults(query) {
    const results = globalSearchResults(query);
    if (!results.length) return `<section class="card panel">${emptyState(`No results for “${query}”.`)}</section>`;
    return `
      <section class="search-results">
        ${SEARCH_GROUPS.map((g) => {
          const rows = results.filter((r) => r.type === g.type);
          if (!rows.length) return "";
          return `
            <div class="sec-head"><span class="sec-title">${g.label}</span><span class="sec-hint">${rows.length}</span></div>
            <div class="search-group">
              ${rows.map((r) => `
                <button type="button" class="search-row" data-action="search-open" data-type="${escapeHtml(r.type)}" data-id="${escapeHtml(r.id)}">
                  <span class="search-ic" style="--ic:${g.color}">${icon(g.icon)}</span>
                  <span class="search-main">
                    <span class="search-title ${r.done ? "is-done" : ""}">${escapeHtml(r.title)}</span>
                    ${r.sub ? `<span class="search-sub">${escapeHtml(r.sub)}</span>` : ""}
                  </span>
                  <span class="search-go">${icon("chevron")}</span>
                </button>
              `).join("")}
            </div>
          `;
        }).join("")}
      </section>
    `;
  }

  function dashGreeting() {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }

  function dashRing(percent, color) {
    const p = clamp(Math.round(Number(percent) || 0), 0, 100);
    const r = 26;
    const c = 2 * Math.PI * r;
    const off = c * (1 - p / 100);
    return `
      <div class="dash-ring">
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="${r}" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="6"></circle>
          <circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"
            stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 32 32)"></circle>
        </svg>
        <span class="dash-ring-val">${p}%</span>
      </div>
    `;
  }

  const DASH_KIND_ICON = { assignment: "book", task: "check", meeting: "clock", reminder: "clock", bill: "wallet", workout: "heart" };

  function renderDashboardUpNext() {
    const events = scheduleHorizonEvents(45);
    const todayStr = today();
    const todayItems = events.filter((e) => e.date === todayStr);
    const shown = (todayItems.length ? todayItems : events).slice(0, 4);
    const label = todayItems.length ? "Today's schedule" : "Up next";
    const head = `<div class="sec-head"><span class="sec-title">${label}</span><button type="button" class="sec-action" data-action="go-calendar">Calendar ${icon("chevron")}</button></div>`;
    if (!shown.length) {
      return `${head}<section class="card panel"><p class="tiny">Nothing scheduled. Add a task with a time or an assignment to see it here.</p></section>`;
    }
    const rows = shown.map((ev) => {
      const time = formatTime(ev.start);
      const when = ev.date === todayStr ? (time || "Today") : `${formatDate(ev.date)}${time ? ` · ${time}` : ""}`;
      const color = ev.color || CALENDAR_KIND_COLORS[ev.kind] || "var(--accent)";
      return `
        <button type="button" class="item-card upnext-item" data-action="show-up-next" data-id="${escapeHtml(ev.id)}" data-kind="${escapeHtml(ev.kind)}">
          <span class="upnext-main">
            <span class="upnext-ic" style="--ic:${escapeHtml(color)}">${icon(DASH_KIND_ICON[ev.kind] || "calendar")}</span>
            <span class="upnext-tt">
              <span class="upnext-title">${escapeHtml(ev.title)}</span>
              <span class="upnext-meta">${escapeHtml(ev.meta || UP_NEXT_KIND_LABEL[ev.kind] || "")}</span>
            </span>
          </span>
          <span class="upnext-when">${escapeHtml(when)}</span>
        </button>
      `;
    }).join("");
    return `${head}<section class="list grouped">${rows}</section>`;
  }

  function snapTile(label, value, sub, iconName, color, tab) {
    return `
      <button type="button" class="snap-tile" data-action="dash-go" data-tab="${escapeHtml(tab)}">
        <span class="snap-head"><span class="snap-ic" style="--ic:${color}">${icon(iconName)}</span>${escapeHtml(label)}</span>
        <span class="snap-val">${value}</span>
        <span class="snap-sub">${escapeHtml(sub)}</span>
      </button>
    `;
  }

  function renderDashboardMoneyGraph(months) {
    const current = months[months.length - 1] || { income: 0, spending: 0, savings: 0, net: 0 };
    const maxValue = Math.max(1, ...months.flatMap((month) => [month.income, month.spending, month.savings]));
    return `
      <section class="card panel section money-trend-card">
        <div class="section-header">
          <div>
            <h2>Money trend</h2>
            <span class="tiny">Monthly income, spending, and savings</span>
          </div>
          <span class="money-net ${current.net >= 0 ? "positive" : "negative"}">${formatCompactCurrency(current.net)}</span>
        </div>
        <div class="money-trend-summary">
          <span><b>${formatCompactCurrency(current.income)}</b> income</span>
          <span><b>${formatCompactCurrency(current.spending)}</b> spent</span>
          <span><b>${formatCompactCurrency(current.savings)}</b> saved</span>
        </div>
        <div class="money-trend-chart" aria-label="Six month money trend">
          ${months.map((month) => `
            <div class="money-month">
              <div class="money-bars">
                <span class="income" title="Income ${formatCurrency(month.income)}" style="--level:${moneyBarHeight(month.income, maxValue)}%"></span>
                <span class="spending" title="Spending ${formatCurrency(month.spending)}" style="--level:${moneyBarHeight(month.spending, maxValue)}%"></span>
                <span class="savings" title="Savings ${formatCurrency(month.savings)}" style="--level:${moneyBarHeight(month.savings, maxValue)}%"></span>
              </div>
              <span>${escapeHtml(month.label)}</span>
            </div>
          `).join("")}
        </div>
        <div class="money-legend">
          <span><i class="income"></i>Income</span>
          <span><i class="spending"></i>Spending</span>
          <span><i class="savings"></i>Savings</span>
        </div>
      </section>
    `;
  }

  function moneyBarHeight(value, maxValue) {
    const amount = Math.max(0, Number(value) || 0);
    if (!amount) return 0;
    return clamp((amount / Math.max(1, maxValue)) * 100, 3, 100);
  }

  function renderDashboardGoals() {
    const goals = (appData.goals || []).map(generalGoalStats);
    const completeCount = goals.filter((goal) => goal.percent >= 100 || goal.goal.completed).length;
    return `
      <section class="card panel section dashboard-goals-card">
        <div class="section-header">
          <div>
            <h2>Goals</h2>
            <span class="tiny">${goals.length ? `${completeCount}/${goals.length} complete` : "Personal goals and linked savings targets"}</span>
          </div>
          ${actionButton("add-goal", "", "Add goal", "target", "secondary")}
        </div>
        <div class="dashboard-goals-grid">
          ${goals.length ? goals.map(renderGoalItem).join("") : emptyState("Add a goal, then link it to a savings goal if money is part of the plan.")}
        </div>
      </section>
    `;
  }

  function renderGoalItem(goalStats) {
    const { goal, linkedGoal, linkedStats, percent } = goalStats;
    const progressKey = `dashboard:goal-${goal.id}`;
    const isComplete = goal.completed || percent >= 100;
    const meta = [
      goal.category || "Personal",
      goal.targetDate ? `Target ${formatDate(goal.targetDate)}` : "",
      linkedGoal ? `Linked to ${linkedGoal.name}` : ""
    ].filter(Boolean);
    const amountLine = linkedStats ? `${formatCurrency(linkedStats.saved)} of ${formatCurrency(linkedStats.target || linkedStats.saved)} saved` : `${percent}% complete`;
    return `
      <article class="goal-card ${isComplete ? "complete" : ""}" data-progress-key="${escapeHtml(progressKey)}" data-progress-percent="${escapeHtml(percent)}">
        <div class="goal-card-top">
          <div>
            <span class="goal-category">${escapeHtml(goal.category || "Personal")}</span>
            <h3>${escapeHtml(goal.title)}</h3>
          </div>
          <button class="goal-check ${isComplete ? "active" : ""}" data-action="toggle-goal-complete" data-id="${escapeHtml(goal.id)}" aria-label="${goal.completed ? "Mark goal active" : "Mark goal complete"}">
            ${icon(isComplete ? "check" : "circle")}
          </button>
        </div>
        <div class="item-meta">${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
        <div class="goal-progress-row">
          <div class="progress"><span style="width:${clamp(percent)}%"></span></div>
          <strong>${percent}%</strong>
        </div>
        <p class="tiny">${escapeHtml(amountLine)}</p>
        <div class="item-actions">
          ${actionButton("edit-goal", goal.id, "Edit", "edit")}
          ${actionButton("delete-goal", goal.id, "Delete", "trash")}
        </div>
      </article>
    `;
  }

  function getTodayFocus(includeCompleted = false) {
    const habitItems = habitsForDate(today())
      .filter((habit) => includeCompleted || !isHabitDone(habit.id, today()))
      .map((habit) => ({ ...habit, type: "habit", done: isHabitDone(habit.id, today()) }));
    const taskItems = appData.tasks
      .filter((task) => task.dueDate === today() && (includeCompleted || !task.completed))
      .map((task) => ({ ...task, type: "task", done: Boolean(task.completed) }));
    const assignmentItems = appData.school.assignments
      .filter((assignment) => assignment.dueDate === today() && (includeCompleted || !assignmentComplete(assignment)))
      .map((assignment) => ({ ...assignment, type: "assignment", done: assignmentComplete(assignment) }));
    return [...habitItems, ...taskItems, ...assignmentItems].slice(0, 6);
  }

  function renderFocusItem(item) {
    const done = Boolean(item.done);
    const cardClass = `${done ? "complete" : ""} ${recentCompletionClass(item.id, done)}`.trim();
    if (item.type === "habit") {
      return itemCard({
        title: item.title,
        meta: ["Daily habit"],
        className: cardClass,
        actions: actionButton("toggle-daily-habit", item.id, done ? "Uncheck" : "Complete", done ? "undo" : "check", "icon-btn", { date: today() })
      });
    }
    if (item.type === "assignment") {
      return itemCard({
        title: item.title,
        meta: ["School", item.classId ? className(item.classId) : "", item.priority],
        className: cardClass,
        actions: actionButton("edit-assignment", item.id, "Edit", "edit")
      });
    }
    return itemCard({
      title: item.title,
      meta: [item.category, item.priority],
      className: cardClass,
      actions: actionButton("toggle-task", item.id, done ? "Uncomplete" : "Complete", done ? "undo" : "check")
    });
  }

  function colorCardProps(color, extraClass = "") {
    const c = safeHexColor(color, "");
    const base = extraClass ? `${extraClass} ` : "";
    if (!c) return { className: extraClass, style: "" };
    return { className: `${base}has-bill-color`, style: `--bill-color:${c}; --bill-color-rgb:${rgbText(c)};` };
  }

  function renderUpcomingDashboard(finance, school, reminders) {
    const billCards = finance.billOccurrences.filter((bill) => !bill.paid).slice(0, 2).map((bill) => {
      const props = colorCardProps(bill.color, bill.paid ? "paid" : "");
      return itemCard({
        title: bill.name,
        meta: [billTypeLabel(bill), formatCurrency(bill.amount), formatDate(bill.date)],
        className: props.className,
        style: props.style,
        actions: actionButton("toggle-bill-paid", bill.id, bill.paid ? "Mark unpaid" : "Mark paid", bill.paid ? "undo" : "check")
      });
    });
    // Every credit card / debt that still has a balance, so all of them stay visible.
    const debtCards = appData.finance.debts
      .filter((debt) => (Number(debt.balance) || 0) > 0)
      .map((debt) => {
        const props = colorCardProps(debt.color);
        const amount = Number(debt.minimumPayment) || 0;
        return itemCard({
          title: `${debt.name || "Debt"} payment`,
          meta: ["Min payment", amount > 0 ? formatCurrency(amount) : "", debt.dueDate ? formatDate(debt.dueDate) : ""].filter(Boolean),
          className: props.className,
          style: props.style,
          actions: actionButton("edit-debt", debt.id, "Edit debt", "edit")
        });
      });
    // Soonest open assignments; as each is completed the next one fills its place.
    const assignmentCards = sortByDate(appData.school.assignments.filter((a) => !assignmentComplete(a) && a.dueDate), "dueDate")
      .slice(0, 3)
      .map((assignment) => {
        const klass = findById(appData.school.classes, assignment.classId);
        const props = colorCardProps(klass?.accentColor);
        return itemCard({
          title: assignment.title,
          meta: ["Assignment", assignment.classId ? className(assignment.classId) : "", formatDate(assignment.dueDate)],
          className: props.className,
          style: props.style,
          actions: actionButton("edit-assignment", assignment.id, "Edit", "edit")
        });
      });
    const reminderCards = reminders.slice(0, 2).map((reminder) =>
      itemCard({
        title: reminder.title,
        meta: ["Reminder", formatDate(reminder.date), reminder.time || ""],
        actions: actionButton("toggle-reminder", reminder.id, "Complete", "check")
      })
    );
    const cards = [...billCards, ...debtCards, ...assignmentCards, ...reminderCards];
    return cards.length ? cards.join("") : emptyState("No upcoming bills, debt payments, assignments, or reminders.");
  }

  function renderTasks() {
    const dayHabits = habitStats(calculateDateRange("today"));
    const range = recentWeekRange();
    const weekHabits = habitStats(range);
    const stats = taskStats(range);
    const filtered = ui.taskFilter === "All" ? appData.tasks : appData.tasks.filter((task) => task.category === ui.taskFilter);
    const todayTasks = filtered.filter((task) => task.dueDate === today() && !task.completed);
    const overdue = filtered.filter((task) => !task.completed && isBeforeToday(task.dueDate));
    const upcoming = sortByDate(filtered.filter((task) => !task.completed && task.dueDate > today())).slice(0, 20);
    // Tasks with no due date aren't tied to a timeframe — they live in "Anytime".
    const anytime = filtered.filter((task) => !task.completed && !task.dueDate);
    const completedTasks = filtered.filter((task) => task.completed);

    return `
      <div class="view">
        ${topbar("Tasks", "", actionButton("add-task", "", "Add task", "plus", "primary"))}

        <section class="task-statrow">
          <div class="task-stat"><span class="n" style="color:var(--green)">${dayHabits.percent}%</span><span class="l">Daily</span></div>
          <div class="task-stat"><span class="n">${weekHabits.percent}%</span><span class="l">Weekly</span></div>
          <div class="task-stat"><span class="n">${dayHabits.streak}</span><span class="l">Streak</span></div>
          <div class="task-stat"><span class="n">${stats.completed}/${stats.total}</span><span class="l">Tasks</span></div>
        </section>

        <div class="sec-head"><span class="sec-title">Daily habits</span>${actionButton("add-daily-habit", "", "Add habit", "plus", "secondary")}</div>
        <section>
          ${appData.dailyHabits.length ? renderHabitSwipe() : emptyState("Add recurring daily habits you do not want to rewrite.")}
        </section>

        <div class="sec-head"><span class="sec-title">Tasks</span>${actionButton("add-task-category", "", "Category", "plus", "secondary")}</div>
        <div class="task-filter-chips" role="group" aria-label="Filter tasks by category">
          ${["All", ...appData.settings.taskCategories].map((cat) => `<button type="button" class="chip ${ui.taskFilter === cat ? "active" : ""}" data-action="set-task-filter" data-task-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join("")}
        </div>
        <div class="task-groups">
          ${(todayTasks.length || overdue.length || upcoming.length || anytime.length || completedTasks.length)
            ? `
          ${renderTaskGroup("Today", todayTasks)}
          ${renderTaskGroup("Overdue", overdue, { open: overdue.length > 0 })}
          ${renderTaskGroup("Upcoming", upcoming, { open: upcoming.length > 0 })}
          ${renderTaskGroup("Anytime", anytime, { open: anytime.length > 0 })}
          ${renderTaskGroup("Task history", completedTasks, {
            open: false,
            countLabel: `${completedTasks.length} complete`,
            sortMode: "history",
            className: "task-history-group"
          })}`
            : emptyState("No tasks yet. Tap “Add task” to create one.")}
        </div>
      </div>
    `;
  }

  function habitDayStats(dateStr) {
    const habits = habitsForDate(dateStr);
    const total = habits.length;
    const completed = habits.filter((habit) => isHabitDone(habit.id, dateStr)).length;
    return { total, completed, percent: pct(completed, total) };
  }

  function renderHabitSwipe() {
    // Yesterday sits on the left, Today on the right. Opens on Today; swipe right for yesterday.
    const slides = [
      { pos: 0, label: "Yesterday", date: dateString(addDays(new Date(), -1)), isToday: false },
      { pos: 1, label: "Today", date: today(), isToday: true }
    ];
    return `
      <div class="habit-swipe" data-habit-swipe>
        ${slides.map(renderHabitSlide).join("")}
      </div>
      <div class="habit-swipe-foot">
        <span class="habit-swipe-hint">Swipe → to fix yesterday</span>
        <div class="habit-swipe-dots">
          ${slides.map((s) => `<i class="habit-dot ${s.isToday ? "active" : ""}" data-dot="${s.pos}"></i>`).join("")}
        </div>
      </div>
    `;
  }

  function renderHabitSlide(slide) {
    const stats = habitDayStats(slide.date);
    return `
      <div class="habit-slide" data-day-offset="${slide.isToday ? 0 : 1}" data-date="${escapeHtml(slide.date)}">
        <div class="habit-slide-head">
          <span class="habit-slide-label">${escapeHtml(slide.label)}</span>
          <span class="tiny">${escapeHtml(formatDate(slide.date))}</span>
        </div>
        ${progressRow(slide.label, stats.percent, `${stats.completed}/${stats.total}`, `habit-day-${slide.isToday ? 0 : 1}`)}
        ${(habitsForDate(slide.date).length ? `<div class="hb-list">${habitsForDate(slide.date).map((habit) => renderDailyHabit(habit, slide.date)).join("")}</div>` : emptyState("No habits scheduled for this day — enjoy the rest day."))}
      </div>
    `;
  }

  function renderDailyHabit(habit, dateStr = today()) {
    const isToday = dateStr === today();
    const done = isHabitDone(habit.id, dateStr);
    const sched = habitDays(habit).length && habitDays(habit).length < 7 ? habitScheduleLabel(habit) : "";
    const pulse = isToday ? recentCompletionClass(habit.id, done) : "";
    return `
      <div class="hb-row ${done ? "done" : ""} ${pulse}">
        <button type="button" class="hb-check ${done ? "done" : ""}" data-action="toggle-daily-habit" data-id="${escapeHtml(habit.id)}" data-date="${escapeHtml(dateStr)}" aria-label="${done ? "Uncheck" : "Complete"} ${escapeHtml(habit.title)}">${done ? icon("check") : ""}</button>
        <span class="hb-main">
          <span class="hb-title">${escapeHtml(habit.title)}</span>
          ${sched ? `<span class="hb-sched">${escapeHtml(sched)}</span>` : ""}
        </span>
        <button type="button" class="hb-menu" data-action="edit-daily-habit" data-id="${escapeHtml(habit.id)}" aria-label="Edit ${escapeHtml(habit.title)}">${icon("more")}</button>
      </div>
    `;
  }

  function restoreHabitSwipe() {
    const swipe = app.querySelector("[data-habit-swipe]");
    if (!swipe) return;
    const slides = [...swipe.querySelectorAll(".habit-slide")];
    if (!slides.length) return;
    const todayStr = today();
    const syncDots = () => {
      const idx = swipe.clientWidth ? Math.round(swipe.scrollLeft / swipe.clientWidth) : 0;
      const clamped = Math.max(0, Math.min(slides.length - 1, idx));
      const slide = slides[clamped];
      ui.habitDay = slide && slide.dataset.date !== todayStr ? "yesterday" : "today";
      app.querySelectorAll(".habit-dot").forEach((dot, i) => dot.classList.toggle("active", i === clamped));
    };
    swipe.addEventListener("scroll", () => {
      window.clearTimeout(swipe._snapTimer);
      swipe._snapTimer = window.setTimeout(() => { syncDots(); saveUi(); }, 90);
    }, { passive: true });
    window.requestAnimationFrame(() => {
      const wantYesterday = ui.habitDay === "yesterday";
      let targetIndex = slides.findIndex((s) => (s.dataset.date !== todayStr) === wantYesterday);
      if (targetIndex < 0) targetIndex = slides.findIndex((s) => s.dataset.date === todayStr);
      if (targetIndex < 0) targetIndex = slides.length - 1;
      swipe.scrollLeft = targetIndex * swipe.clientWidth;
      syncDots();
    });
  }

  function renderTaskGroup(title, tasks, options = {}) {
    // Only render a group box when it actually has tasks — empty Today / Overdue /
    // Anytime / history boxes are hidden instead of showing a placeholder.
    if (!tasks.length) return "";
    const open = options.open ?? true;
    const countLabel = options.countLabel || String(tasks.length);
    const sortedTasks = options.sortMode === "history" ? sortTaskHistory(tasks) : sortByDate(tasks);
    return `
      <details class="card ${escapeHtml(options.className || "")}" ${open ? "open" : ""}>
        <summary><span>${escapeHtml(title)}</span><span class="tiny">${escapeHtml(countLabel)}</span></summary>
        <div class="details-body">
          <div class="tk-list">${sortedTasks.map(renderTaskItem).join("")}</div>
        </div>
      </details>
    `;
  }

  function sortTaskHistory(tasks) {
    return [...tasks].sort((a, b) => taskHistoryDate(b).localeCompare(taskHistoryDate(a)));
  }

  function taskHistoryDate(task) {
    return task.completedAt || task.dueDate || task.createdAt || "";
  }

  const TASK_REPEAT_LABELS = { daily: "Daily", weekly: "Weekly", biweekly: "Every 2 weeks", monthly: "Monthly" };

  function nextRecurrenceDate(dateStr, repeat) {
    const d = parseDate(dateStr);
    if (!d) return "";
    if (repeat === "daily") return dateString(addDays(d, 1));
    if (repeat === "weekly") return dateString(addDays(d, 7));
    if (repeat === "biweekly") return dateString(addDays(d, 14));
    if (repeat === "monthly") return dateString(addMonths(d, 1));
    return "";
  }

  // When a repeating task is completed, leave the finished one in history and
  // create the next occurrence on its next date. The guard prevents duplicates
  // if the task is toggled complete more than once.
  function maybeSpawnRecurringTask(item) {
    if (!item || !item.repeat || !TASK_REPEAT_LABELS[item.repeat] || !item.dueDate || item.recurrenceSpawned) return;
    const next = nextRecurrenceDate(item.dueDate, item.repeat);
    if (!next) return;
    item.recurrenceSpawned = true;
    appData.tasks.push(makeItem({
      title: item.title,
      category: item.category || "",
      dueDate: next,
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      classId: item.classId || "",
      priority: item.priority || "",
      color: item.color || "",
      notes: item.notes || "",
      repeat: item.repeat,
      completed: false
    }));
  }

  function renderTaskItem(task) {
    const timeLabel = taskTimeLabel(task);
    const dateText = task.dueDate ? formatDate(task.dueDate) : (task.completed ? "" : "No date");
    const metaBits = [task.classId ? className(task.classId) : "", dateText, timeLabel, task.priority].filter(Boolean).join(" · ");
    const pulse = recentCompletionClass(task.id, task.completed);
    return `
      <div class="tk-row ${task.completed ? "done" : ""} ${pulse}">
        <button type="button" class="tk-check ${task.completed ? "done" : ""}" data-action="toggle-task" data-id="${escapeHtml(task.id)}" aria-label="${task.completed ? "Uncomplete" : "Complete"} ${escapeHtml(task.title)}">${task.completed ? icon("check") : ""}</button>
        <button type="button" class="tk-main" data-action="edit-task" data-id="${escapeHtml(task.id)}">
          <span class="tk-text">
            <span class="tk-title">${escapeHtml(task.title)}</span>
            ${(task.category || metaBits || TASK_REPEAT_LABELS[task.repeat]) ? `<span class="tk-meta">${task.category ? `<span class="tk-cat">${escapeHtml(task.category)}</span>` : ""}${TASK_REPEAT_LABELS[task.repeat] ? `<span class="tk-repeat">${icon("repeat")}${escapeHtml(TASK_REPEAT_LABELS[task.repeat])}</span>` : ""}${metaBits ? `<span>${escapeHtml(metaBits)}</span>` : ""}</span>` : ""}
          </span>
          <span class="tk-go"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></span>
        </button>
      </div>
    `;
  }

  function renderFinance() {
    const range = calculateDateRange(ui.financeSpan, ui.financeCustom);
    const finance = calculateFinance(range);
    const safetyRange = safetyForecastRange(range);
    const safeFinance = calculateFinance(safetyRange);
    const financeActions = actionButton("add-spending", "", "Add spending", "plus", "primary");
    const sections = [
      { key: "current-money", title: "Current money", action: "add-account", label: "Add account", render: () => renderAccounts(finance, safeFinance, safetyRange) },
      { key: "income", title: "Income", action: "add-income", label: "Add income", render: () => renderIncome(finance, range) },
      { key: "bills", title: "Bills and subscriptions", action: "add-bill", label: "Add bill", render: () => renderBills(finance) },
      { key: "spending", title: "Spending", action: "add-spending", label: "Add spending", render: () => renderSpending(range) },
      { key: "savings", title: "Savings", action: "add-saving", label: "Add savings", render: () => renderSavings(finance, range) },
      { key: "debt", title: "Debt repayment", action: "add-debt", label: "Add debt", render: () => renderDebts(finance) },
      { key: "investments", title: "Investments", action: "add-investment", label: "Add investment", render: () => renderInvestments(finance) },
      { key: "forecast", title: "Forecast", action: "", label: "", render: () => renderForecast(finance, range, safeFinance, safetyRange) }
    ];
    const activeKey = sections.some((s) => s.key === ui.financeSection) ? ui.financeSection : sections[0].key;
    const active = sections.find((s) => s.key === activeKey);

    return `
      <div class="view finance-view">
        ${topbar("Finance", "", financeActions)}

        ${renderFinanceHero(finance, safeFinance, safetyRange, range)}

        <div class="sec-head"><span class="sec-title">Overview</span></div>
        <section class="stat-tiles fin-overview">
          ${healthTile("Current money", formatCompactCurrency(finance.currentMoney), "Balances + income", "wallet", "var(--green)")}
          ${healthTile("Safe to spend", formatCompactCurrency(safeFinance.safeToSpend), `Through ${formatDate(safetyRange.end)}`, "check", "var(--cyan)")}
          ${healthTile("Upcoming bills", formatCompactCurrency(finance.billsDue), `${finance.billOccurrences.length} due`, "calendar", "var(--orange)")}
          ${healthTile("Net worth", formatCompactCurrency(finance.netWorth), "+ invest − debt", "chart", "var(--purple)")}
        </section>

        <div class="finance-subnav" role="tablist" aria-label="Finance sections">
          ${sections.map((s, i) => `<button type="button" class="fin-tab ${s.key === activeKey ? "active" : ""}" role="tab" aria-selected="${s.key === activeKey}" data-action="set-finance-section" data-section="${escapeHtml(s.key)}"><span class="fin-tab-num">${String(i + 1).padStart(2, "0")}</span>${escapeHtml(s.title)}</button>`).join("")}
        </div>

        <div class="sec-head"><span class="sec-title">${escapeHtml(active.title)}</span>${active.action ? actionButton(active.action, "", active.label, "plus", "secondary") : ""}</div>
        <section class="finance-section-body" data-finance-active="${escapeHtml(activeKey)}">
          ${active.render()}
        </section>
      </div>
    `;
  }

  function financeBalancePoints(months, currentMoney) {
    const trend = moneyTrendMonths(months);
    const n = trend.length;
    if (!n) return [];
    const bals = new Array(n);
    bals[n - 1] = currentMoney;
    for (let i = n - 2; i >= 0; i--) bals[i] = bals[i + 1] - (Number(trend[i + 1].net) || 0);
    return trend.map((m, i) => ({ label: m.label, value: bals[i] }));
  }

  function sparklineSvg(points, color) {
    if (!points.length) return "";
    const vals = points.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = (max - min) || 1;
    const n = points.length;
    const coords = points.map((p, i) => {
      const x = n > 1 ? (i / (n - 1)) * 100 : 50;
      const y = 33 - ((p.value - min) / span) * 30;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<svg viewBox="0 0 100 36" preserveAspectRatio="none" class="fin-spark-svg" aria-hidden="true"><polyline points="${escapeHtml(coords)}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></polyline></svg>`;
  }

  // Reconstruct a real daily "current money" history by walking backward from
  // today's balance through every posted (dated) cash flow, so the last point
  // always equals finance.currentMoney (the big number above the chart).
  function financeBalanceSeries(days, currentMoney) {
    const todayStr = today();
    const n = Math.max(2, Math.min(370, Math.round(days) || 2));
    const flows = [];
    appData.finance.income.forEach((e) => {
      const d = incomeDate(e);
      if (d && d <= todayStr) flows.push({ date: d, amt: entryNetIncome(e) });
    });
    appData.finance.savings.forEach((e) => {
      if (e.date && e.date <= todayStr) flows.push({ date: e.date, amt: Number(e.amount) || 0 });
    });
    appData.finance.spending.forEach((e) => {
      if (!spendingUsesCredit(e) && e.date && e.date <= todayStr) flows.push({ date: e.date, amt: -(Number(e.amount) || 0) });
    });
    debtPaymentHistoryEntries().forEach((p) => {
      const d = paymentHistoryDate(p);
      if (d && d <= todayStr) flows.push({ date: d, amt: -(Number(p.amount) || 0) });
    });
    appData.finance.bills.forEach((b) => {
      if (b.paid && b.dueDate && b.dueDate <= todayStr) flows.push({ date: b.dueDate, amt: -(Number(b.amount) || 0) });
    });
    const points = [];
    for (let i = 0; i < n; i++) {
      const d = dateString(addDays(parseDate(todayStr), -(n - 1 - i)));
      const after = flows.reduce((s, f) => (f.date > d ? s + f.amt : s), 0);
      points.push({ date: d, value: currentMoney - after });
    }
    return points;
  }

  // Net worth = cash + investments − debt. We have a real cash history and can
  // reconstruct debt from its payment history (debt was higher before payments);
  // investment value has no history so it's held at its current value.
  function financeNetWorthSeries(days, finance) {
    const cash = financeBalanceSeries(days, finance.currentMoney);
    const todayStr = today();
    const invNow = finance.investmentValue || 0;
    const debtNow = finance.totalDebt || 0;
    const debtPayments = debtPaymentHistoryEntries()
      .map((p) => ({ date: paymentHistoryDate(p), amt: Number(p.amount) || 0 }))
      .filter((p) => p.date && p.date <= todayStr);
    return cash.map((pt) => {
      const paidAfter = debtPayments.reduce((s, p) => (p.date > pt.date ? s + p.amt : s), 0);
      return { date: pt.date, value: pt.value + invNow - (debtNow + paidAfter) };
    });
  }

  // How many trailing days of history to chart for the selected finance span.
  function financeHistoryDays() {
    const span = ui.financeSpan;
    if (span === "7") return 7;
    if (span === "14" || span === "paycheck") return 14;
    if (span === "30") return 30;
    if (span === "today") return 7;
    if (span === "month") return Math.max(2, new Date().getDate());
    if (span === "custom" && ui.financeCustom && ui.financeCustom.start && ui.financeCustom.end) {
      return Math.max(2, Math.min(366, daysBetween(ui.financeCustom.start, ui.financeCustom.end)));
    }
    return 30;
  }

  const FIN_CHART = { w: 300, h: 96, padTop: 12, padBottom: 16, samples: 64 };
  // Remember each chart's last y-positions so a span change morphs the line
  // instead of teleporting (keyed by gradient id: current-money vs net-worth).
  const finChartPrevYs = {};
  const finChartAnims = {};

  // Resample a series to a fixed number of points so every span has the same
  // path-command count — that's what lets the SVG `d` smoothly interpolate.
  function resampleSeries(points, n) {
    if (points.length < 2) return points;
    const last = points.length - 1;
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * last;
      const lo = Math.floor(t);
      const hi = Math.min(last, lo + 1);
      const f = t - lo;
      out.push({ value: points[lo].value + (points[hi].value - points[lo].value) * f, date: (f < 0.5 ? points[lo] : points[hi]).date });
    }
    return out;
  }

  function renderFinanceChart(rawPoints, color, gradId = "finChartFill") {
    if (!rawPoints || rawPoints.length < 2) return "";
    const { w, h, padTop, padBottom, samples } = FIN_CHART;
    const points = resampleSeries(rawPoints, samples);
    const vals = points.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = (max - min) || 1;
    const n = points.length;
    const xAt = (i) => (i / (n - 1)) * w;
    const yAt = (v) => padTop + (1 - (v - min) / span) * (h - padTop - padBottom);
    const ys = points.map((p) => Math.round(yAt(p.value) * 100) / 100);
    const linePts = points.map((p, i) => `${xAt(i).toFixed(2)},${ys[i].toFixed(2)}`);
    const lineD = `M ${linePts.join(" L ")}`;
    const areaD = `M ${xAt(0).toFixed(2)},${(h - padBottom).toFixed(2)} L ${linePts.join(" L ")} L ${xAt(n - 1).toFixed(2)},${(h - padBottom).toFixed(2)} Z`;
    const data = points.map((p) => ({ v: Math.round(p.value * 100) / 100, d: p.date }));
    return `
      <div class="fin-chart" data-fin-chart data-grad-id="${gradId}" style="--chart-color:${color}" data-points="${escapeHtml(JSON.stringify(data))}" data-ys="${escapeHtml(JSON.stringify(ys))}" data-min="${min}" data-max="${max}" data-pad-top="${padTop}" data-pad-bottom="${padBottom}" data-vh="${h}">
        <svg class="fin-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.26"></stop>
              <stop offset="100%" stop-color="${color}" stop-opacity="0"></stop>
            </linearGradient>
          </defs>
          <path class="fin-chart-area" d="${areaD}" fill="url(#${gradId})"></path>
          <path class="fin-chart-line" d="${lineD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></path>
        </svg>
        <div class="fin-chart-guide" data-fin-guide hidden></div>
        <div class="fin-chart-dot" data-fin-dot hidden></div>
        <div class="fin-chart-tip" data-fin-tip hidden></div>
        <div class="fin-chart-hit" data-fin-hit></div>
      </div>
    `;
  }

  function setupFinanceChart() {
    app.querySelectorAll("[data-fin-chart]").forEach(setupFinanceChartInstance);
  }

  function setupFinanceChartInstance(chart) {
    if (!chart) return;
    let data;
    try { data = JSON.parse(chart.dataset.points || "[]"); } catch { data = []; }
    const n = data.length;
    if (n < 2) return;

    // Morph the line/area from the previous span's shape to the new one with a
    // real rAF tween (CSS can't transition the SVG `d` attribute reliably).
    const gradId = chart.dataset.gradId || "finChartFill";
    const lineEl = chart.querySelector(".fin-chart-line");
    const areaEl = chart.querySelector(".fin-chart-area");
    let newYs;
    try { newYs = JSON.parse(chart.dataset.ys || "[]"); } catch { newYs = []; }
    if (lineEl && areaEl && newYs.length) {
      const W = FIN_CHART.w;
      const baseY = FIN_CHART.h - Number(chart.dataset.padBottom);
      const N = newYs.length;
      const xs = (i) => ((i / (N - 1)) * W).toFixed(2);
      const buildLine = (ys) => "M " + ys.map((y, i) => `${xs(i)},${y.toFixed(2)}`).join(" L ");
      const buildArea = (ys) => `M ${xs(0)},${baseY.toFixed(2)} L ` + ys.map((y, i) => `${xs(i)},${y.toFixed(2)}`).join(" L ") + ` L ${xs(N - 1)},${baseY.toFixed(2)} Z`;
      const prev = finChartPrevYs[gradId];
      if (finChartAnims[gradId]) cancelAnimationFrame(finChartAnims[gradId]);
      if (prev && prev.length === N) {
        const start = performance.now();
        const dur = 520;
        const ease = (t) => 1 - Math.pow(1 - t, 3);
        const tick = (now) => {
          const t = Math.min(1, (now - start) / dur);
          const e = ease(t);
          const cur = newYs.map((y, i) => prev[i] + (y - prev[i]) * e);
          lineEl.setAttribute("d", buildLine(cur));
          areaEl.setAttribute("d", buildArea(cur));
          if (t < 1) finChartAnims[gradId] = requestAnimationFrame(tick);
        };
        finChartAnims[gradId] = requestAnimationFrame(tick);
      }
      finChartPrevYs[gradId] = newYs;
    }
    const min = Number(chart.dataset.min);
    const max = Number(chart.dataset.max);
    const span = (max - min) || 1;
    const padTop = Number(chart.dataset.padTop);
    const padBottom = Number(chart.dataset.padBottom);
    const vh = Number(chart.dataset.vh);
    const guide = chart.querySelector("[data-fin-guide]");
    const dot = chart.querySelector("[data-fin-dot]");
    const tip = chart.querySelector("[data-fin-tip]");
    const hit = chart.querySelector("[data-fin-hit]");
    if (!hit) return;

    const show = (clientX) => {
      const rect = chart.getBoundingClientRect();
      if (!rect.width) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const idx = Math.round(ratio * (n - 1));
      const p = data[idx];
      const leftPct = (idx / (n - 1)) * 100;
      const yView = padTop + (1 - (p.v - min) / span) * (vh - padTop - padBottom);
      const dotX = (leftPct / 100) * rect.width;
      const dotY = (yView / vh) * rect.height;
      guide.style.left = `${leftPct}%`;
      dot.style.left = `${leftPct}%`;
      dot.style.top = `${dotY}px`;
      guide.hidden = dot.hidden = false;
      // Reveal the tip first so it has measurable size, then place it in pixels —
      // always clamped inside the chart, flipping below the point when it's near
      // the top so it can never be cut off.
      tip.innerHTML = `<span class="fin-tip-v">${escapeHtml(formatCurrency(p.v))}</span><span class="fin-tip-d">${escapeHtml(formatLongDate(p.d))}</span>`;
      tip.classList.remove("pin-left", "pin-right");
      tip.style.transform = "none";
      tip.hidden = false;
      const tipW = tip.offsetWidth;
      const tipH = tip.offsetHeight;
      let left = dotX - tipW / 2;
      left = Math.max(4, Math.min(rect.width - tipW - 4, left));
      let top = dotY - tipH - 14;
      if (top < 4) top = dotY + 16;
      top = Math.max(4, Math.min(rect.height - tipH - 4, top));
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    };
    const hide = () => { guide.hidden = dot.hidden = tip.hidden = true; chart.classList.remove("is-scrubbing"); };

    hit.addEventListener("pointerdown", (e) => {
      chart.classList.add("is-scrubbing");
      try { hit.setPointerCapture(e.pointerId); } catch {}
      show(e.clientX);
    });
    hit.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse" || chart.classList.contains("is-scrubbing")) show(e.clientX);
    });
    hit.addEventListener("pointerup", hide);
    hit.addEventListener("pointercancel", hide);
    hit.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hide(); });
  }

  function renderFinanceHero(finance, safeFinance, safetyRange, range) {
    const series = financeBalanceSeries(financeHistoryDays(), finance.currentMoney);
    let trend = "";
    if (series.length >= 2) {
      const first = series[0].value;
      const last = series[series.length - 1].value;
      const delta = last - first;
      const pctChange = first ? (delta / Math.abs(first)) * 100 : 0;
      const dir = delta > 0.005 ? "up" : delta < -0.005 ? "down" : "flat";
      const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
      trend = `<div class="fh-trend ${dir}">${dir === "up" ? "▲" : dir === "down" ? "▼" : "•"} ${sign}${escapeHtml(formatCurrency(Math.abs(delta)))} <span class="fh-trend-pct">(${sign}${Math.abs(pctChange).toFixed(1)}%)</span> <span class="fh-trend-lab">over ${financeHistoryDays()} days</span></div>`;
    }
    return `
      <section class="card panel finance-hero">
        <div class="fh-lab">Current money</div>
        <div class="fh-big">${escapeHtml(formatCurrency(finance.currentMoney))}</div>
        ${trend}
        ${series.length >= 2 ? renderFinanceChart(series, "var(--green)") : ""}
        <div class="fh-mini">
          <div class="hm"><span class="n">${escapeHtml(formatCompactCurrency(safeFinance.safeToSpend))}</span><span class="l">Safe to spend</span></div>
          <div class="hm"><span class="n">${escapeHtml(formatCompactCurrency(finance.projectedBalance))}</span><span class="l">Projected</span></div>
          <div class="hm"><span class="n">${escapeHtml(formatCompactCurrency(finance.netWorth))}</span><span class="l">Net worth</span></div>
        </div>
        ${rangeToggle("finance", ui.financeSpan)}
        ${customRangeControls("finance", range)}
      </section>
    `;
  }

  function financeShortcutNav(sections) {
    const collapsed = ui.financeBarCollapsed !== false; // default collapsed (small corner button)
    return `
      <nav class="finance-shortcuts ${collapsed ? "is-collapsed" : ""}" data-finance-bar aria-label="Finance section shortcuts">
        <button type="button" class="finance-bar-toggle" data-action="toggle-finance-bar" aria-label="Toggle jump menu">
          <span class="fb-icon fb-grid">${icon("grid")}</span>
          <span class="fb-icon fb-x">${icon("x")}</span>
        </button>
        <div class="finance-bar-full">
          <span class="finance-shortcuts-label">Jump to</span>
          <div class="finance-shortcut-list">
            ${sections.map((section) => `
              <button type="button" class="finance-shortcut" data-action="jump-finance-section" data-section="${escapeHtml(section.key)}">
                ${escapeHtml(section.title)}
              </button>
            `).join("")}
          </div>
        </div>
      </nav>
    `;
  }

  function financeDetails(section, index) {
    const sectionNumber = String(index + 1).padStart(2, "0");
    return `
      <details class="card finance-section-card" id="finance-section-${escapeHtml(section.key)}" data-finance-section="${escapeHtml(section.key)}" open>
        <summary>
          <span class="finance-section-heading">
            <span class="finance-section-number">${escapeHtml(sectionNumber)}</span>
            <span class="finance-section-title">${escapeHtml(section.title)}</span>
          </span>
          ${section.action ? actionButton(section.action, "", section.label, "plus", "secondary") : "<span></span>"}
        </summary>
        <div class="details-body">${section.body}</div>
      </details>
    `;
  }

  function renderAccounts(finance, safeFinance = finance, safetyRange = finance.range) {
    const nwSeries = financeNetWorthSeries(financeHistoryDays(), finance);
    let nwChart = "";
    if (nwSeries.length >= 2) {
      const first = nwSeries[0].value;
      const last = nwSeries[nwSeries.length - 1].value;
      const delta = last - first;
      const dir = delta > 0.005 ? "up" : delta < -0.005 ? "down" : "flat";
      const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
      nwChart = `
        <div class="sec-head"><span class="sec-title">Net worth over time</span><span class="sec-hint">last ${financeHistoryDays()} days</span></div>
        <section class="card panel finance-hero">
          <div class="fh-big fh-big-sm">${escapeHtml(formatCurrency(finance.netWorth))}</div>
          <div class="fh-trend ${dir}">${dir === "up" ? "▲" : dir === "down" ? "▼" : "•"} ${sign}${escapeHtml(formatCurrency(Math.abs(delta)))} <span class="fh-trend-lab">cash + investments − debt</span></div>
          ${renderFinanceChart(nwSeries, "var(--purple)", "finChartNw")}
        </section>
      `;
    }
    return `
      ${nwChart}
      <div class="metric-grid">
        ${metric("Available money", formatCurrency(finance.accountMoney), "Balances + income received − spending")}
        ${metric("Income received", formatCurrency(finance.postedIncome), "Added to your current money")}
        ${metric("Cash/debit spending", formatCurrency(finance.postedCashSpending), "Posted through today")}
        ${metric("Safe-to-spend", formatCurrency(safeFinance.safeToSpend), `After obligations through ${formatDate(safetyRange.end)}`)}
      </div>
      <div class="list">
        ${appData.finance.accounts.length ? appData.finance.accounts.map((account) => renderAccountItem(account, finance)).join("") : emptyState("Add checking, savings, cash, or other balances.")}
      </div>
    `;
  }

  function renderAccountItem(account, finance) {
    const trackedOutflow = finance.accountOutflowsById?.[account.id] || 0;
    const trackedInflow = finance.accountInflowsById?.[account.id] || 0;
    const available = (Number(account.balance) || 0) + trackedInflow - trackedOutflow;
    return itemCard({
      title: account.name,
      meta: [
        account.type || "Account",
        `Current ${formatCurrency(available)}`,
        trackedInflow ? `Savings added ${formatCurrency(trackedInflow)}` : "",
        trackedOutflow ? `Tracked outflow ${formatCurrency(trackedOutflow)}` : ""
      ],
      actions: `${actionButton("edit-account", account.id, "Edit", "edit")}${actionButton("delete-account", account.id, "Delete", "trash")}`
    });
  }

  function incomeNetInRange(start, end) {
    return sum(appData.finance.income.filter((entry) => {
      const when = incomeDate(entry);
      return when && when >= start && when <= end;
    }), entryNetIncome);
  }

  function validIncomeGran(g) {
    return ["week", "month", "year"].includes(g) ? g : "month";
  }

  // Builds the income series for the chart, oldest → newest (left → right).
  function incomeSeries(gran) {
    const now = new Date();
    const points = [];
    if (gran === "week") {
      for (let i = 11; i >= 0; i--) {
        const ws = startOfWeek(addDays(now, -i * 7));
        const we = addDays(ws, 6);
        const start = dateString(ws);
        const end = dateString(we);
        points.push({ start, end, net: incomeNetInRange(start, end), label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(ws) });
      }
    } else if (gran === "year") {
      for (let i = 5; i >= 0; i--) {
        const y = now.getFullYear() - i;
        const start = `${y}-01-01`;
        const end = `${y}-12-31`;
        points.push({ start, end, net: incomeNetInRange(start, end), label: String(y) });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
        const end = dateString(new Date(d.getFullYear(), d.getMonth() + 1, 0));
        const label = `${new Intl.DateTimeFormat(undefined, { month: "short" }).format(d)} '${String(d.getFullYear()).slice(2)}`;
        points.push({ start, end, net: incomeNetInRange(start, end), label });
      }
    }
    return points;
  }

  // All months that have data (plus the current month), newest first, for the
  // compare pickers — so any month from any year can be matched against another.
  function incomeCompareMonths() {
    const set = new Set();
    appData.finance.income.forEach((entry) => {
      const when = incomeDate(entry);
      if (when) set.add(when.slice(0, 7));
    });
    set.add(today().slice(0, 7));
    return [...set].sort((a, b) => b.localeCompare(a));
  }

  function monthLabel(ym) {
    const [y, m] = ym.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
  }

  function monthNetIncome(ym) {
    if (!/^\d{4}-\d{2}$/.test(ym)) return 0;
    const [y, m] = ym.split("-").map(Number);
    const start = `${ym}-01`;
    const end = dateString(new Date(y, m, 0));
    return incomeNetInRange(start, end);
  }

  function incomeGranToggle() {
    const gran = validIncomeGran(ui.incomeChartGran);
    const opts = [["week", "Weekly"], ["month", "Monthly"], ["year", "Yearly"]];
    return `
      <div class="seg-toggle income-gran-toggle" role="group" aria-label="Income chart timeframe">
        ${opts.map(([id, label]) => `<button type="button" class="seg-btn ${gran === id ? "active" : ""}" data-action="set-income-gran" data-gran="${id}"><span>${label}</span></button>`).join("")}
      </div>
    `;
  }

  function renderIncomeCompare() {
    const months = incomeCompareMonths();
    const aDefault = months[1] || months[0] || today().slice(0, 7);
    const bDefault = months[0] || today().slice(0, 7);
    const a = months.includes(ui.incomeCompareA) ? ui.incomeCompareA : aDefault;
    const b = months.includes(ui.incomeCompareB) ? ui.incomeCompareB : bDefault;
    const optionList = (selected) => months.map((ym) => `<option value="${ym}" ${ym === selected ? "selected" : ""}>${escapeHtml(monthLabel(ym))}</option>`).join("");
    const aNet = monthNetIncome(a);
    const bNet = monthNetIncome(b);
    const diff = bNet - aNet;
    const pct = aNet ? (diff / aNet) * 100 : 0;
    const maxNet = Math.max(1, aNet, bNet);
    return `
      <div class="income-compare">
        <div class="income-compare-pickers">
          <label class="field income-compare-field"><span>Month A</span>
            <select data-income-compare="a">${optionList(a)}</select>
          </label>
          <span class="income-compare-vs">vs</span>
          <label class="field income-compare-field"><span>Month B</span>
            <select data-income-compare="b">${optionList(b)}</select>
          </label>
        </div>
        <div class="income-compare-bars">
          <div class="income-compare-row">
            <span class="income-compare-name">${escapeHtml(monthLabel(a))}</span>
            <span class="income-compare-bar"><i style="width:${((aNet / maxNet) * 100).toFixed(1)}%"></i></span>
            <span class="income-compare-val">${escapeHtml(formatCurrency(aNet))}</span>
          </div>
          <div class="income-compare-row">
            <span class="income-compare-name">${escapeHtml(monthLabel(b))}</span>
            <span class="income-compare-bar alt"><i style="width:${((bNet / maxNet) * 100).toFixed(1)}%"></i></span>
            <span class="income-compare-val">${escapeHtml(formatCurrency(bNet))}</span>
          </div>
        </div>
        <p class="income-compare-delta ${diff >= 0 ? "positive" : "negative"}">
          ${diff >= 0 ? "▲" : "▼"} ${escapeHtml(formatCurrency(Math.abs(diff)))} (${formatNumber(Math.abs(pct), 1)}%) ${diff >= 0 ? "more" : "less"} in ${escapeHtml(monthLabel(b))}
        </p>
      </div>
    `;
  }

  // Stock-chart style line of net income (weekly / monthly / yearly) plus an
  // any-month-vs-any-month comparison.
  function renderIncomeTrendChart() {
    const gran = validIncomeGran(ui.incomeChartGran);
    const series = incomeSeries(gran);
    const max = Math.max(1, ...series.map((m) => m.net));
    const bottom = 54;
    const top = 6;
    const height = bottom - top;
    const n = series.length;
    const points = series.map((m, i) => {
      const x = n > 1 ? (i / (n - 1)) * 90 + 6 : 51;
      const y = bottom - (Math.min(m.net, max) / max) * height;
      return { ...m, x, y: clamp(y, top, bottom) };
    });
    const pointString = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    const endPoint = points[points.length - 1];
    const dotX = clamp(endPoint.x, 14, 88);
    const dotY = clamp((endPoint.y / 60) * 100, 18, 84);
    const granNote = { week: "Last 12 weeks", month: "Last 12 months", year: "Last 6 years" }[gran];
    const compareOn = Boolean(ui.incomeCompareOn);
    const hasData = appData.finance.income.length > 0;
    if (!hasData) return "";
    return `
      <details class="card panel section income-trend-card" open>
        <summary>
          <span class="finance-section-heading"><span class="finance-section-title">Income trend</span></span>
          <span class="tiny">${granNote}</span>
        </summary>
        <div class="details-body">
          ${incomeGranToggle()}
          <div class="savings-line-panel">
            <div class="savings-line-labels">
              <span>${escapeHtml(formatCompactCurrency(max))}</span>
              <span>$0</span>
            </div>
            <div class="savings-line-plot" style="--dot-x:${dotX.toFixed(2)}%; --dot-y:${dotY.toFixed(2)}%;">
              <span class="savings-line-dot-label">${escapeHtml(formatCompactCurrency(endPoint.net))}</span>
              <svg class="savings-line-svg" viewBox="0 0 100 60" preserveAspectRatio="none" role="img" aria-label="Net income trend">
                <line class="savings-line-grid" x1="6" y1="6" x2="96" y2="6"></line>
                <line class="savings-line-grid" x1="6" y1="30" x2="96" y2="30"></line>
                <line class="savings-line-grid" x1="6" y1="54" x2="96" y2="54"></line>
                <polyline class="savings-line-path-glow" points="${escapeHtml(pointString)}"></polyline>
                <polyline class="savings-line-path" pathLength="1" points="${escapeHtml(pointString)}"></polyline>
                <circle class="savings-line-dot" cx="${endPoint.x.toFixed(2)}" cy="${endPoint.y.toFixed(2)}" r="2.15"></circle>
              </svg>
              <div class="savings-line-axis">
                <span>${escapeHtml(points[0].label)}</span>
                <span>${escapeHtml(endPoint.label)}</span>
              </div>
            </div>
          </div>
          <button type="button" class="income-compare-toggle ${compareOn ? "active" : ""}" data-action="toggle-income-compare">
            ${icon("chart")}<span data-compare-label>${compareOn ? "Hide month comparison" : "Compare two months"}</span>
          </button>
          <div class="income-compare-wrap" ${compareOn ? "data-open" : ""}>
            <div class="income-compare-inner">${renderIncomeCompare()}</div>
          </div>
        </div>
      </details>
    `;
  }

  function refreshIncomeChart() {
    const card = app.querySelector(".income-trend-card");
    if (!card) return render({ quiet: true });
    const wrapper = document.createElement("div");
    wrapper.innerHTML = renderIncomeTrendChart();
    const next = wrapper.firstElementChild;
    if (next) card.replaceWith(next); else card.remove();
  }

  function renderIncome(finance, range) {
    const incomeInRange = appData.finance.income.filter((entry) => dateInRange(incomeDate(entry), range));
    const allIncome = appData.finance.income;
    const bySource = groupTotals(incomeInRange, "source", entryNetIncome);
    const yearFinance = calculateFinance(currentYearRange());
    const monthFinance = calculateFinance(calculateDateRange("month"));
    const weekFinance = calculateFinance(calculateDateRange("week"));
    return `
      <div class="metric-grid">
        ${metric("Gross income", formatCurrency(finance.grossIncome), range.label)}
        ${metric("Net income", formatCurrency(finance.netIncome), "After any applied tax entries")}
        ${metric("Tax tracked", formatCurrency(finance.taxTotal), "Optional estimates or manual tax")}
        ${metric("Income entries", String(incomeInRange.length), `${Object.keys(bySource).length} sources`)}
        ${metric("Yearly income total", formatCurrency(yearFinance.netIncome), "This year net")}
        ${metric("Monthly income estimate", formatCurrency(monthFinance.netIncome), "This month net")}
        ${metric("Weekly income estimate", formatCurrency(weekFinance.netIncome), "This week net")}
        ${metric("Gross this year", formatCurrency(yearFinance.grossIncome), "Before applied tax entries")}
      </div>
      ${renderIncomeTrendChart()}
      ${renderBarChart(bySource, finance.netIncome)}
      ${renderTaxCalculatorDetails(finance, range, yearFinance, monthFinance)}
      <details class="finance-history" open>
        <summary>
          <span>Income history</span>
          <span class="tiny">${allIncome.length} ${allIncome.length === 1 ? "entry" : "entries"}</span>
        </summary>
        <div class="details-body">
          <div class="finance-hist-toolbar">
            ${financeHistChips("income", ui.incomeHistorySpan || "month")}
            ${actionButton("add-income", "", "Add income", "plus", "secondary")}
          </div>
          <div class="list finance-hist-list" data-hist-scope="income">
            ${allIncome.length ? sortIncomeEntries(allIncome).map((entry) => renderIncomeItem(entry)).join("") : emptyState("No income logged yet.")}
          </div>
        </div>
      </details>
    `;
  }

  function financeHistChips(scope, active) {
    const opts = [["today", "Today"], ["week", "Week"], ["month", "Month"], ["all", "All"]];
    return `
      <div class="assignment-status-filter finance-hist-chips" data-scope="${scope}" role="group" aria-label="History range">
        ${opts.map(([id, label]) => `<button type="button" class="status-chip finance-hist-chip ${active === id ? "active" : ""}" data-hspan="${id}"><span>${label}</span></button>`).join("")}
      </div>
    `;
  }

  function mondayWeekRange() {
    const now = new Date();
    const diffToMonday = (now.getDay() + 6) % 7; // days since Monday (Sun=6)
    const monday = addDays(now, -diffToMonday);
    const sunday = addDays(monday, 6);
    return { start: dateString(monday), end: dateString(sunday), label: "This week" };
  }

  function financeSpanMatch(dateStr, span) {
    if (span === "all") return true;
    if (!dateStr) return false;
    if (span === "today") return dateStr === today();
    // Week = Monday–Sunday inclusive; Month = 1st–last day inclusive (dateInRange is inclusive).
    if (span === "week") return dateInRange(dateStr, mondayWeekRange());
    if (span === "month") return dateInRange(dateStr, calculateDateRange("month"));
    return true;
  }

  function applyFinanceHistoryFilter(scope, span) {
    const list = app.querySelector(`.finance-hist-list[data-hist-scope="${scope}"]`);
    if (!list) return;
    let shown = 0;
    const rows = list.querySelectorAll(".item-card, .fin-entry");
    rows.forEach((row) => {
      const ok = financeSpanMatch(row.dataset.when, span);
      row.style.display = ok ? "" : "none";
      if (ok) shown++;
    });
    let empty = list.querySelector(".finance-hist-empty");
    if (shown === 0 && rows.length) {
      if (!empty) { empty = document.createElement("div"); empty.className = "empty finance-hist-empty"; list.appendChild(empty); }
      empty.textContent = "Nothing in this range.";
      empty.style.display = "";
    } else if (empty) {
      empty.style.display = "none";
    }
  }

  function setupFinanceHistory() {
    app.querySelectorAll(".finance-hist-chips").forEach((group) => {
      const scope = group.dataset.scope;
      group.querySelectorAll(".finance-hist-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const span = chip.dataset.hspan;
          if (scope === "income") ui.incomeHistorySpan = span; else ui.spendingHistorySpan = span;
          group.querySelectorAll(".finance-hist-chip").forEach((c) => c.classList.toggle("active", c === chip));
          applyFinanceHistoryFilter(scope, span);
          saveUi();
        });
      });
    });
    applyFinanceHistoryFilter("income", ui.incomeHistorySpan || "month");
    applyFinanceHistoryFilter("spending", ui.spendingHistorySpan || "month");
  }

  function renderTaxCalculatorDetails(finance, range, yearFinance, monthFinance) {
    const settings = taxSettings();
    const tax = finance.taxBreakdown || emptyTaxEstimate();
    const scopeButtons = `
      <div class="actions tax-scope-actions">
        ${actionButton("set-tax-gross", "", "Use selected range", "chart", "secondary", { gross: finance.grossIncome, label: range.label })}
        ${actionButton("set-tax-gross", "", "Use this month", "calendar", "secondary", { gross: monthFinance.grossIncome, label: "This month" })}
        ${actionButton("set-tax-gross", "", "Use this year", "calendar", "secondary", { gross: yearFinance.grossIncome, label: "This year" })}
      </div>
    `;
    return `
      <details class="tax-details">
        <summary>
          <span class="summary-copy">
            <strong>Tax calculator</strong>
            <small>Optional estimate for federal, FICA, Ohio, and local taxes</small>
          </span>
          <span class="tax-summary-pill">${formatCurrency(settings.annualGrossIncome)} base</span>
        </summary>
        <div class="details-body tax-details-body">
          <div class="metric-grid">
            ${metric("Gross income", formatCurrency(finance.grossIncome), range.label)}
            ${metric("Applied tax", formatCurrency(tax.total), "Tracked income entries")}
            ${metric("Net after tax", formatCurrency(finance.netIncome), "Selected range")}
            ${metric("Effective tracked rate", `${formatNumber(tax.effectiveRate, 1)}%`, "")}
          </div>
          ${scopeButtons}
          ${renderTaxControlPanel("income")}
        </div>
      </details>
    `;
  }

  function renderIncomeItem(entry) {
    const gross = entryGrossIncome(entry);
    const net = entryNetIncome(entry);
    const tax = entryTaxEstimate(entry);
    const mode = normalizedIncomeTaxMode(entry);
    const taxModeLabel = mode === "auto" ? "Auto tax estimate" : mode === "manual" ? "Manual tax" : "No tax calculation";
    const taxNote = mode === "manual"
      ? `Manual tax: ${formatCurrency(tax.total)} (${formatNumber(tax.effectiveRate, 1)}%)`
      : mode === "auto"
        ? `Tax estimate: ${formatCurrency(tax.total)} (${formatNumber(tax.effectiveRate, 1)}%) · Fed ${formatCurrency(tax.federal)}, SS ${formatCurrency(tax.socialSecurity)}, Medicare ${formatCurrency(tax.medicare)}, OH ${formatCurrency(tax.ohio)}, municipal ${formatCurrency(tax.municipal)}${tax.schoolDistrict ? `, school ${formatCurrency(tax.schoolDistrict)}` : ""}`
        : "Tax not calculated for this entry.";
    const estimateAction = mode === "auto" ? "" : actionButton("estimate-income-tax", entry.id, "Estimate tax", "chart");
    return financeEntryCard({
      sign: "income",
      amount: formatCurrency(net),
      name: entry.source || "Income",
      date: formatDate(incomeDate(entry)),
      details: [
        { label: "Type", value: entry.type === "hourly" ? "Hourly" : "Manual" },
        { label: "Tax", value: taxModeLabel },
        { label: "Gross", value: formatCurrency(gross), money: true },
        { label: "Net (take-home)", value: formatCurrency(net), money: true },
        { label: "Date", value: formatDate(incomeDate(entry)) }
      ],
      note: [taxNote, entry.notes].filter(Boolean).join(" · "),
      attrs: `data-when="${escapeHtml(incomeDate(entry) || "")}"`,
      actions: `${estimateAction}${actionButton("edit-income", entry.id, "Edit", "edit")}${actionButton("delete-income", entry.id, "Delete", "trash")}`
    });
  }

  function renderTaxControlPanel(context = "income") {
    const settings = taxSettings();
    return `
      <div class="tax-panel section" data-tax-panel="${escapeHtml(context)}">
        <div class="section-header">
          <h3>Annual tax calculator</h3>
          <span class="tiny">${escapeHtml(paycheckFrequencyLabel(settings.paycheckFrequency))}</span>
        </div>
        <div class="tax-controls">
          <label class="field">
            <span>Gross annual income</span>
            <input type="number" min="0" step="0.01" data-tax-input="annualGrossIncome" value="${escapeHtml(settings.annualGrossIncome)}">
          </label>
          <label class="field">
            <span>Filing status</span>
            <select data-tax-input="filingStatus">
              <option value="single" ${settings.filingStatus === "single" ? "selected" : ""}>Single</option>
            </select>
          </label>
          <label class="field">
            <span>Municipal tax rate (%)</span>
            <input type="number" min="0" max="100" step="0.01" data-tax-input="municipalTaxRate" value="${escapeHtml(settings.municipalTaxRate)}">
          </label>
          <label class="field">
            <span>School district tax rate (%)</span>
            <input type="number" min="0" max="100" step="0.01" data-tax-input="schoolDistrictTaxRate" value="${escapeHtml(settings.schoolDistrictTaxRate)}">
          </label>
          <label class="field">
            <span>Paycheck frequency</span>
            <select data-tax-input="paycheckFrequency">
              ${[
                ["weekly", "Weekly"],
                ["biweekly", "Biweekly"],
                ["semimonthly", "Twice monthly"],
                ["monthly", "Monthly"],
                ["annual", "Annual"]
              ].map(([value, label]) => `<option value="${value}" ${settings.paycheckFrequency === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </label>
          <label class="checkbox-row tax-checkbox">
            <input type="checkbox" data-tax-input="w2Income" ${settings.w2Income ? "checked" : ""}>
            <span>W-2 wage income<small>Includes Social Security and Medicare estimates.</small></span>
          </label>
        </div>
        <div class="metric-grid tax-live-summary" data-tax-live-summary>
          ${renderTaxSummaryMetrics(annualTaxEstimate())}
        </div>
      </div>
    `;
  }

  function renderTaxSummaryMetrics(estimate) {
    return [
      metric("Gross income", formatCurrency(estimate.grossIncome), "Annual"),
      metric("Federal income tax", formatCurrency(estimate.federal), `Taxable ${formatCurrency(estimate.federalTaxableIncome)}`),
      metric("Social Security tax", formatCurrency(estimate.socialSecurity), "6.2% up to cap"),
      metric("Medicare tax", formatCurrency(estimate.medicare), "1.45% no cap"),
      metric("Total FICA tax", formatCurrency(estimate.fica), ""),
      metric("Ohio state tax", formatCurrency(estimate.ohio), "2.75% above threshold"),
      metric("Municipal tax", formatCurrency(estimate.municipal), "Local city rate"),
      metric("School district tax", formatCurrency(estimate.schoolDistrict), "Optional local school rate"),
      metric("Total estimated taxes", formatCurrency(estimate.total), ""),
      metric("Estimated take-home", formatCurrency(estimate.netIncome), "Annual net"),
      metric("Effective tax rate", `${formatNumber(estimate.effectiveRate, 1)}%`, ""),
      metric("Net monthly income", formatCurrency(estimate.monthly), ""),
      metric("Net biweekly income", formatCurrency(estimate.biweekly), ""),
      metric("Net weekly income", formatCurrency(estimate.weekly), "")
    ].join("");
  }

  function annualTaxEstimate() {
    const settings = taxSettings();
    return calculateTotalTaxes(settings.annualGrossIncome, localTaxRates(settings), {
      filingStatus: settings.filingStatus || "single",
      w2Income: settings.w2Income
    });
  }

  function paycheckFrequencyLabel(value) {
    const periods = payPeriodsForFrequency(value);
    const labels = {
      weekly: "52 paychecks/year",
      biweekly: "26 paychecks/year",
      semimonthly: "24 paychecks/year",
      monthly: "12 paychecks/year",
      annual: "1 paycheck/year"
    };
    return labels[normalizePaycheckFrequency(value)] || `${periods} paychecks/year`;
  }

  function renderIncomeFormPreview(values = {}) {
    const tax = entryTaxEstimate(values);
    return `
      <div class="tax-preview">
        <p class="tiny">Live tax preview</p>
        <div class="tax-preview-grid">
          <span><b>${formatCurrency(tax.grossIncome)}</b><small>Gross</small></span>
          <span><b>${formatCurrency(tax.federal)}</b><small>Federal</small></span>
          <span><b>${formatCurrency(tax.fica)}</b><small>FICA</small></span>
          <span><b>${formatCurrency(tax.ohio)}</b><small>Ohio</small></span>
          <span><b>${formatCurrency(tax.local)}</b><small>Local</small></span>
          <span><b>${formatCurrency(tax.total)}</b><small>Total tax</small></span>
          <span><b>${formatCurrency(tax.netIncome)}</b><small>Take-home</small></span>
          <span><b>${formatNumber(tax.effectiveRate, 1)}%</b><small>Effective</small></span>
        </div>
      </div>
    `;
  }

  function normalizeIncomeValues(values = {}) {
    return {
      ...values,
      taxMode: normalizedIncomeTaxMode(values),
      hourlyWage: Math.max(0, Number(values.hourlyWage) || 0),
      hours: Math.max(0, Number(values.hours) || 0),
      amount: Math.max(0, Number(values.amount) || 0),
      annualGrossIncome: values.annualGrossIncome === "" ? "" : Math.max(0, Number(values.annualGrossIncome) || 0),
      manualTaxAmount: values.manualTaxAmount === "" ? "" : Math.max(0, Number(values.manualTaxAmount) || 0),
      deductionPercent: values.deductionPercent === "" ? "" : clamp(values.deductionPercent || 0, 0, 100),
      w2Income: values.w2Income !== false
    };
  }

  function updateTaxSettingFromControl(target) {
    const key = target.dataset.taxInput;
    if (!key) return false;
    const settings = appData.settings.tax;
    if (key === "w2Income") {
      settings.w2Income = target.checked;
    } else if (key === "filingStatus") {
      settings.filingStatus = target.value || "single";
    } else if (key === "paycheckFrequency") {
      settings.paycheckFrequency = normalizePaycheckFrequency(target.value);
      settings.payPeriodsPerYear = payPeriodsForFrequency(settings.paycheckFrequency);
    } else {
      const value = key === "annualGrossIncome"
        ? Math.max(0, Number(target.value) || 0)
        : normalizePercentInput(target.value);
      settings[key] = value;
      if (Number(target.value) < 0) target.value = "0";
      if (key === "municipalTaxRate") settings.ohioLocalRate = value;
    }
    return true;
  }

  function updateTaxLiveSummaries() {
    const html = renderTaxSummaryMetrics(annualTaxEstimate());
    document.querySelectorAll("[data-tax-live-summary]").forEach((summary) => {
      summary.innerHTML = html;
    });
    document.querySelectorAll("[data-tax-panel] .section-header .tiny").forEach((label) => {
      label.textContent = paycheckFrequencyLabel(taxSettings().paycheckFrequency);
    });
  }

  function renderBills(finance) {
    const bills = sortByDate(appData.finance.bills, "dueDate");
    const mandatoryBills = bills.filter((bill) => normalizedBillType(bill) === "bill");
    const subscriptions = bills.filter((bill) => normalizedBillType(bill) === "subscription");
    const mandatoryDue = sum(finance.billOccurrences.filter((bill) => normalizedBillType(bill) === "bill" && !bill.paid), (bill) => bill.amount);
    const subscriptionsDue = sum(finance.billOccurrences.filter((bill) => normalizedBillType(bill) === "subscription" && !bill.paid), (bill) => bill.amount);
    return `
      <div class="metric-grid">
        ${metric("Bills due soon", formatCurrency(finance.billsDue), "Selected range")}
        ${metric("Mandatory bills", formatCurrency(mandatoryDue), `${mandatoryBills.length} tracked`)}
        ${metric("Subscriptions", formatCurrency(subscriptionsDue), `${subscriptions.length} optional`)}
        ${metric("After bills", formatCurrency(finance.currentMoney - finance.billsDue), "Current minus unpaid bills")}
      </div>
      ${renderUpcomingBills()}
      <div class="bill-groups">
        ${renderBillGroup("Bills", mandatoryBills, "Must-pay obligations like phone, rent, insurance, school, and debt.", mandatoryDue)}
        ${renderBillGroup("Subscriptions", subscriptions, "Optional monthly charges like DoorDash, Netflix, Amazon Prime, or ChatGPT Plus.", subscriptionsDue)}
      </div>
    `;
  }

  function billStatus(occ) {
    if (occ.paid) return { key: "paid", label: "Paid" };
    const days = daysUntil(occ.date);
    if (days < 0) return { key: "overdue", label: `${Math.abs(days)}d overdue` };
    if (days === 0) return { key: "due-soon", label: "Due today" };
    if (days <= 3) return { key: "due-soon", label: `Due in ${days}d` };
    return { key: "upcoming", label: `In ${days}d` };
  }

  function daysUntil(dateStr) {
    const target = parseDate(dateStr);
    const now = parseDate(today());
    if (!target || !now) return 0;
    return Math.round((target - now) / 86400000);
  }

  function renderUpcomingBills() {
    // Look back far enough to surface overdue unpaid bills, then forward for what's coming.
    const horizon = { start: dateString(addDays(new Date(), -31)), end: dateString(addDays(new Date(), 45)), label: "upcoming" };
    const todayStr = today();
    const occurrences = appData.finance.bills
      .map((bill) => {
        const occ = billOccurrencesInRange(bill, horizon);
        if (!occ.length) return null;
        const future = occ.filter((o) => o.date >= todayStr);
        // next upcoming occurrence, otherwise the most recent past-due one
        return future.length ? future[0] : occ[occ.length - 1];
      })
      .filter(Boolean)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 8);
    const unpaidTotal = sum(occurrences.filter((o) => !o.paid), (o) => o.amount);
    return `
      <div class="upcoming-bills">
        <div class="section-header upcoming-bills-header">
          <div>
            <h3>Upcoming bills</h3>
            <span class="tiny">Next 45 days · ${formatCurrency(unpaidTotal)} unpaid</span>
          </div>
          ${actionButton("add-bill", "", "Add bill", "plus", "secondary")}
        </div>
        ${occurrences.length ? `<div class="list upcoming-bills-list">${occurrences.map(renderUpcomingBillItem).join("")}</div>` : emptyState("No bills due in the next 45 days.")}
      </div>
    `;
  }

  function renderUpcomingBillItem(occ) {
    const status = billStatus(occ);
    return `
      <div class="upcoming-bill is-${status.key}">
        <span class="upcoming-bill-status-dot" aria-hidden="true"></span>
        <div class="upcoming-bill-main">
          <span class="upcoming-bill-name">${escapeHtml(occ.name || "Bill")}</span>
          <span class="upcoming-bill-meta">${escapeHtml(billTypeLabel(occ))} · ${escapeHtml(formatDate(occ.date))}</span>
        </div>
        <div class="upcoming-bill-right">
          <span class="upcoming-bill-amount">${formatCurrency(occ.amount)}</span>
          <span class="upcoming-bill-badge">${escapeHtml(status.label)}</span>
        </div>
        <div class="upcoming-bill-actions">
          ${actionButton("toggle-bill-paid", occ.id, occ.paid ? "Mark unpaid" : "Mark paid", occ.paid ? "undo" : "check")}
        </div>
      </div>
    `;
  }

  function renderBillGroup(title, bills, note, dueTotal = 0) {
    return `
      <div class="mini-section bill-group">
        <div class="bill-group-header">
          <div>
            <h3>${escapeHtml(title)}</h3>
            <p class="tiny">${escapeHtml(note)}</p>
          </div>
          <span class="bill-group-total">${formatCurrency(dueTotal)} due</span>
        </div>
        <div class="list">
          ${bills.length ? bills.map(renderBillItem).join("") : emptyState(`No ${title.toLowerCase()} added yet.`)}
        </div>
      </div>
    `;
  }

  function renderBillItem(bill) {
    const type = normalizedBillType(bill);
    const color = safeHexColor(bill.color, "");
    const colorStyle = color ? `--bill-color:${color}; --bill-color-rgb:${rgbText(color)};` : "";
    return itemCard({
      title: bill.name,
      meta: [billTypeLabel(bill), formatCurrency(bill.amount), formatDate(bill.dueDate), bill.frequency, bill.category, bill.paid ? "Paid" : "Unpaid"],
      note: bill.notes,
      className: `${bill.paid ? "paid" : ""} ${type === "subscription" ? "subscription-bill" : "mandatory-bill"} ${color ? "has-bill-color" : ""}`,
      style: colorStyle,
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
    const necessaryTotal = sum(entries.filter((entry) => entry.necessary !== false), (entry) => entry.amount);
    const unnecessaryTotal = Math.max(0, total - necessaryTotal);
    const cashDebitTotal = sum(entries.filter((entry) => !spendingUsesCredit(entry)), (entry) => entry.amount);
    const creditTotal = sum(entries.filter(spendingUsesCredit), (entry) => entry.amount);
    // The category breakdown and budgets are month-to-date so they stay meaningful
    // even when the selected span is a forward-looking budgeting window.
    const monthRange = calculateDateRange("month");
    const monthEntries = appData.finance.spending.filter((entry) => dateInRange(entry.date, monthRange));
    const monthByCategory = groupTotals(monthEntries, "category", (entry) => entry.amount);
    const monthTotal = sum(monthEntries, (entry) => entry.amount);
    return `
      <div class="metric-grid">
        ${metric("Spending today", formatCurrency(sum(appData.finance.spending.filter((entry) => entry.date === today()), (entry) => entry.amount)), "")}
        ${metric("Spending this week", formatCurrency(sum(appData.finance.spending.filter((entry) => dateInRange(entry.date, calculateDateRange("week"))), (entry) => entry.amount)), "")}
        ${metric("Spending this month", formatCurrency(sum(appData.finance.spending.filter((entry) => dateInRange(entry.date, calculateDateRange("month"))), (entry) => entry.amount)), "")}
        ${metric("Cash/debit spending", formatCurrency(cashDebitTotal), "Lowers account balances")}
        ${metric("Credit card spending", formatCurrency(creditTotal), "Raises linked card balance")}
        ${metric("Unnecessary spending", formatCurrency(unnecessaryTotal), "Wants and leaks in this range")}
        ${metric("Necessary spending", formatCurrency(necessaryTotal), "Needs in this range")}
        ${metric("Average daily", formatCurrency(total / daysBetween(range.start, range.end)), "Selected range")}
      </div>
      <div class="sec-head"><span class="sec-title">By category</span><span class="sec-hint">This month</span></div>
      <div class="card panel">${renderCategoryBreakdown(monthByCategory, monthTotal)}</div>

      <div class="sec-head"><span class="sec-title">Monthly budgets</span>${actionButton("add-budget", "", "Add budget", "plus", "secondary")}</div>
      ${renderSpendingBudgets()}

      <details class="card finance-history" open>
        <summary>
          <span>Transaction history</span>
          <span class="tiny">${appData.finance.spending.length} ${appData.finance.spending.length === 1 ? "entry" : "entries"}</span>
        </summary>
        <div class="details-body">
          <div class="finance-hist-toolbar">
            ${financeHistChips("spending", ui.spendingHistorySpan || "month")}
            ${actionButton("add-spending", "", "Add spending", "plus", "secondary")}
          </div>
          <div class="list finance-hist-list" data-hist-scope="spending">
            ${appData.finance.spending.length ? sortByDate(appData.finance.spending, "date").reverse().map(renderSpendingItem).join("") : emptyState("No spending logged yet.")}
          </div>
        </div>
      </details>
    `;
  }

  const CATEGORY_COLORS = ["#4f8cff", "#47dc9a", "#ffae52", "#ff5c8a", "#9d6fff", "#36d3ff", "#2fd9c0", "#ffd166"];

  // Colored stacked bar + legend showing where money went, by category.
  function renderCategoryBreakdown(byCategory, total) {
    const entries = Object.entries(byCategory || {}).sort((a, b) => b[1] - a[1]);
    if (!entries.length || total <= 0) return emptyState("No spending in this range yet.");
    return `
      <div class="cat-breakdown">
        <div class="cat-bar">
          ${entries.map(([label, v], i) => `<span class="cat-bar-seg" style="width:${((v / total) * 100).toFixed(2)}%;background:${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}" title="${escapeHtml(label || "Other")}"></span>`).join("")}
        </div>
        <div class="cat-legend">
          ${entries.map(([label, v], i) => `
            <div class="cat-leg-row">
              <span class="cat-leg-dot" style="background:${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}"></span>
              <span class="cat-leg-name">${escapeHtml(label || "Other")}</span>
              <span class="cat-leg-pct">${Math.round((v / total) * 100)}%</span>
              <span class="cat-leg-amt">${escapeHtml(formatCurrency(v))}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // Per-category monthly budgets: spent-this-month vs the set amount.
  function renderSpendingBudgets() {
    const budgets = appData.finance.budgets || [];
    if (!budgets.length) {
      return `<div class="card panel budget-empty">${emptyState("Set a monthly budget per category to see how much you have left to spend.")}<div class="budget-empty-action">${actionButton("add-budget", "", "Add budget", "plus", "secondary")}</div></div>`;
    }
    const monthRange = calculateDateRange("month");
    const monthSpend = groupTotals(appData.finance.spending.filter((e) => dateInRange(e.date, monthRange)), "category", (e) => e.amount);
    const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date());
    return `
      <div class="budget-list">
        ${budgets.map((b) => {
          const spent = monthSpend[b.category] || 0;
          const amt = Number(b.amount) || 0;
          const p = amt ? (spent / amt) * 100 : 0;
          const state = p > 100 ? "over" : p >= 80 ? "warn" : "ok";
          const left = amt - spent;
          return `
            <button type="button" class="budget-row ${state}" data-action="edit-budget" data-id="${escapeHtml(b.id)}">
              <div class="budget-top"><span class="budget-cat">${escapeHtml(b.category || "Category")}</span><span class="budget-amt">${escapeHtml(formatCurrency(spent))} / ${escapeHtml(formatCurrency(amt))}</span></div>
              <div class="budget-track"><span style="width:${Math.min(100, Math.max(0, p)).toFixed(1)}%"></span></div>
              <div class="budget-sub">${left >= 0 ? `${escapeHtml(formatCurrency(left))} left` : `${escapeHtml(formatCurrency(-left))} over`} · ${escapeHtml(monthLabel)}</div>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  function budgetFields(initial = {}) {
    const cats = appData.settings.spendingCategories || [];
    return [
      { name: "category", label: "Category", type: "select", required: true, options: cats.map((c) => ({ value: c, label: c })), default: initial.category || cats[0] || "" },
      { name: "amount", label: "Monthly budget", type: "number", step: "0.01", min: 0, required: true, default: initial.amount ?? "" }
    ];
  }

  function renderSpendingItem(entry) {
    const linkedDebt = entry.debtId ? findById(appData.finance.debts, entry.debtId) : null;
    const linkedAccount = entry.accountId && !spendingUsesCredit(entry) ? findById(appData.finance.accounts, entry.accountId) : null;
    const method = normalizedPaymentMethod(entry.paymentMethod, entry.debtId);
    return financeEntryCard({
      sign: "expense",
      amount: formatCurrency(entry.amount),
      name: entry.note || entry.category || "Spending",
      date: formatDate(entry.date),
      details: [
        { label: "Amount", value: formatCurrency(entry.amount), money: true },
        { label: "Category", value: entry.category || "—" },
        { label: "Type", value: entry.necessary !== false ? "Necessary" : "Unnecessary" },
        { label: "Method", value: method },
        { label: "Date", value: formatDate(entry.date) },
        linkedAccount ? { label: "Paid from", value: linkedAccount.name } : null,
        linkedDebt ? { label: "Charged to", value: linkedDebt.name } : null
      ],
      attrs: `data-when="${escapeHtml(entry.date || "")}"`,
      actions: `${actionButton("edit-spending", entry.id, "Edit", "edit")}${actionButton("delete-spending", entry.id, "Delete", "trash")}`
    });
  }

  function renderSavings(finance, range) {
    const entries = appData.finance.savings.filter((entry) => dateInRange(entry.date, range));
    const goals = finance.savingsGoalProgress || [];
    const remaining = sum(goals, (item) => item.remaining);
    return `
      <div class="metric-grid">
        ${metric("Savings balance", formatCurrency(finance.savingsBalance), "Savings accounts + logged deposits")}
        ${metric("Saved in range", formatCurrency(finance.savings), range.label)}
        ${metric("Active goals", String(goals.length), `${formatCurrency(remaining)} remaining`)}
        ${metric("Future savings", formatCurrency(finance.futureSavings), "Planned in selected range")}
      </div>
      <div class="mini-section">
        <div class="section-header">
          <h3>Savings goals</h3>
          ${actionButton("add-savings-goal", "", "Add goal", "target", "secondary")}
        </div>
        <div class="list">
          ${goals.length ? goals.map(renderSavingsGoal).join("") : emptyState("Add a savings goal for emergency funds, school, a car, or anything else.")}
        </div>
      </div>
      <div class="mini-section">
        <div class="section-header">
          <h3>Savings history</h3>
          ${actionButton("add-saving", "", "Add savings", "plus", "secondary")}
        </div>
        <div class="list">
          ${entries.length ? sortByDate(entries, "date").reverse().map(renderSavingItem).join("") : emptyState("Savings deposits in this range will appear here.")}
        </div>
      </div>
    `;
  }

  function renderSavingsGoal(goalStats) {
    const { goal, saved, target, remaining, percent } = goalStats;
    const progressKey = `finance:savings-goal-${goal.id}`;
    const chart = renderSavingsGoalLineChart(goalStats);
    return `
      <article class="item-card savings-goal-card" data-progress-key="${escapeHtml(progressKey)}" data-progress-percent="${escapeHtml(percent)}">
        <div class="savings-goal-top">
          <div class="item-main savings-goal-main">
            <p class="item-title">${escapeHtml(goal.name)}</p>
            <div class="item-meta">
              <span>${formatCurrency(saved)} saved</span>
              <span>${formatCurrency(target)} goal</span>
              ${goal.targetDate ? `<span>Due ${formatDate(goal.targetDate)}</span>` : ""}
            </div>
          </div>
          <div class="item-actions">
            ${actionButton("edit-savings-goal", goal.id, "Edit", "edit")}
            ${actionButton("delete-savings-goal", goal.id, "Delete", "trash")}
          </div>
        </div>
        <div class="savings-goal-progress">
          <div class="savings-goal-progress-label">
            <span>${formatNumber(percent)}% funded</span>
            <strong>${formatCurrency(remaining)} remaining</strong>
          </div>
          <div class="progress"><span style="width:${clamp(percent)}%"></span></div>
        </div>
        ${chart}
      </article>
    `;
  }

  function renderSavingsGoalLineChart(goalStats) {
    const chart = savingsGoalChartData(goalStats);
    const pointString = chart.points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
    const endPoint = chart.points[chart.points.length - 1];
    const maxText = formatCompactCurrency(chart.maxAmount);
    const dotX = clamp(endPoint.x, 14, 88);
    const dotY = clamp((endPoint.y / 60) * 100, 18, 84);
    const savedLabel = `${formatCompactCurrency(goalStats.saved)} saved`;
    return `
      <details class="savings-goal-chart" open>
        <summary>
          <span>
            <b>Progress line</b>
            <small>${escapeHtml(chart.scaleLabel)} timeline</small>
          </span>
        </summary>
        <div class="savings-line-panel">
          <div class="savings-line-labels">
            <span>${escapeHtml(maxText)}</span>
            <span>$0</span>
          </div>
          <div class="savings-line-plot" style="--dot-x:${dotX.toFixed(2)}%; --dot-y:${dotY.toFixed(2)}%;">
            <span class="savings-line-dot-label">${escapeHtml(savedLabel)}</span>
            <svg class="savings-line-svg" viewBox="0 0 100 60" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(goalStats.goal.name)} savings progress">
              <line class="savings-line-grid target" x1="6" y1="6" x2="96" y2="6"></line>
              <line class="savings-line-grid" x1="6" y1="30" x2="96" y2="30"></line>
              <line class="savings-line-grid" x1="6" y1="54" x2="96" y2="54"></line>
              <polyline class="savings-line-path-glow" points="${escapeHtml(pointString)}"></polyline>
              <polyline class="savings-line-path" pathLength="1" points="${escapeHtml(pointString)}"></polyline>
              <circle class="savings-line-dot" cx="${endPoint.x.toFixed(2)}" cy="${endPoint.y.toFixed(2)}" r="2.15"></circle>
            </svg>
            <div class="savings-line-axis">
              <span>${escapeHtml(chart.startLabel)}</span>
              <span>${escapeHtml(chart.endLabel)}</span>
            </div>
          </div>
        </div>
      </details>
    `;
  }

  function savingsGoalChartData(goalStats) {
    const { goal, saved, target } = goalStats;
    const entries = sortByDate(appData.finance.savings.filter((entry) => entry.goalId === goal.id && entry.date <= today()), "date");
    const createdDate = String(goal.createdAt || "").slice(0, 10);
    const start = createdDate || entries[0]?.date || today();
    const latestEntryDate = entries[entries.length - 1]?.date || "";
    const endCandidates = [goal.targetDate, today(), latestEntryDate].filter(Boolean).sort();
    let end = endCandidates[endCandidates.length - 1] || today();
    if (end <= start) end = dateString(addDays(parseDate(start) || new Date(), 30));
    const maxAmount = Math.max(1, target, saved);
    const startDate = parseDate(start) || new Date();
    const endDate = parseDate(end) || addDays(startDate, 30);
    const totalMs = Math.max(1, endDate - startDate);
    const bottom = 54;
    const top = 6;
    const height = bottom - top;
    const rawPoints = [];
    let cumulative = Math.max(0, Number(goal.initialAmount) || 0);
    rawPoints.push({ date: start, amount: cumulative });
    entries.forEach((entry) => {
      cumulative += Math.max(0, Number(entry.amount) || 0);
      rawPoints.push({ date: entry.date, amount: cumulative });
    });
    if (!rawPoints.some((point) => point.date === today())) rawPoints.push({ date: today(), amount: saved });
    const byDate = rawPoints.reduce((map, point) => {
      map.set(point.date, { date: point.date, amount: Math.max(0, Number(point.amount) || 0) });
      return map;
    }, new Map());
    const points = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))).map((point) => {
      const pointDate = parseDate(point.date) || startDate;
      const x = clamp(((pointDate - startDate) / totalMs) * 90 + 6, 6, 96);
      const y = bottom - (Math.min(point.amount, maxAmount) / maxAmount) * height;
      return { ...point, x, y: clamp(y, top, bottom) };
    });
    if (points.length === 1) points.push({ ...points[0], x: Math.min(96, points[0].x + 1) });
    const timelineDays = daysBetween(start, end);
    const scale = timelineDays <= 95 ? "days" : timelineDays <= 1100 ? "months" : "years";
    return {
      points,
      maxAmount,
      scaleLabel: scale,
      startLabel: chartDateLabel(start, scale),
      endLabel: chartDateLabel(end, scale)
    };
  }

  function chartDateLabel(value, scale) {
    const date = parseDate(value);
    if (!date) return "Now";
    if (scale === "years") return new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(date);
    if (scale === "months") return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(date);
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  }

  function renderSavingItem(entry) {
    const account = entry.accountId ? findById(appData.finance.accounts, entry.accountId) : null;
    const goal = entry.goalId ? findById(appData.finance.savingsGoals, entry.goalId) : null;
    return itemCard({
      title: entry.note || "Savings deposit",
      meta: [formatCurrency(entry.amount), formatDate(entry.date), account ? account.name : "Savings", goal ? goal.name : ""],
      actions: `${actionButton("edit-saving", entry.id, "Edit", "edit")}${actionButton("delete-saving", entry.id, "Delete", "trash")}`
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
    const progressKey = `finance:debt-${debt.id}`;
    const color = safeHexColor(debt.color, "");
    const colorClass = color ? " has-bill-color" : "";
    const colorStyle = color ? ` style="--bill-color:${color}; --bill-color-rgb:${rgbText(color)};"` : "";
    return `
      <article class="item-card debt-card${colorClass}"${colorStyle} data-progress-key="${escapeHtml(progressKey)}" data-progress-percent="${escapeHtml(clamp(progress))}">
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
            <strong>${countSpan(`${progressKey}:percent`, clamp(progress), { suffix: "%" })}</strong>
          </div>
          <div class="progress" aria-label="Debt payoff progress"><span style="width:${clamp(progress)}%"></span></div>
          ${renderDebtPaymentHistory(debt)}
        </div>
      </article>
    `;
  }

  function renderDebtPaymentHistory(debt) {
    const payments = [...(debt.paymentHistory || [])].sort((a, b) => paymentHistoryDate(b).localeCompare(paymentHistoryDate(a)));
    return `
      <details class="debt-payment-history">
        <summary><span>Payment history</span><span class="tiny">${payments.length}</span></summary>
        <div class="list">
          ${payments.length ? payments.map(renderDebtPaymentHistoryItem).join("") : emptyState("Payments toward this balance will appear here.")}
        </div>
      </details>
    `;
  }

  function renderDebtPaymentHistoryItem(payment) {
    const account = payment.accountId ? findById(appData.finance.accounts, payment.accountId) : null;
    return itemCard({
      title: formatCurrency(payment.amount),
      meta: [formatDate(paymentHistoryDate(payment)), account ? `Paid from ${account.name}` : "", payment.notes ? "Note saved" : ""],
      note: payment.notes || "",
      className: "debt-payment-item",
      actions: `${actionButton("edit-debt-payment", payment.id, "Edit", "edit")}${actionButton("delete-debt-payment", payment.id, "Delete", "trash")}`
    });
  }

  function findDebtForPayment(paymentId) {
    const debt = appData.finance.debts.find((d) => (d.paymentHistory || []).some((p) => p.id === paymentId));
    return { debt, payment: debt ? debt.paymentHistory.find((p) => p.id === paymentId) : null };
  }

  // Investments can be tracked two ways: enter shares + an avg buy price + the
  // current price (recommended for stocks/crypto whose price moves — just update
  // the current price), or enter plain total invested / current value. The
  // share-based numbers win when present; otherwise the totals are used. When no
  // current value is known we assume break-even so a blank field never reads as a
  // 100% loss.
  function investmentInvested(inv) {
    const shares = Number(inv.shares) || 0;
    const cost = Number(inv.costBasis) || 0;
    if (shares > 0 && cost > 0) return shares * cost;
    return Number(inv.amountInvested) || 0;
  }

  function investmentCurrentValue(inv) {
    const shares = Number(inv.shares) || 0;
    const price = Number(inv.currentPrice) || 0;
    if (shares > 0 && price > 0) return shares * price;
    if (inv.currentValue !== undefined && inv.currentValue !== "" && inv.currentValue !== null) {
      return Number(inv.currentValue) || 0;
    }
    return investmentInvested(inv);
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
        ${appData.finance.investments.length ? appData.finance.investments.map((investment) => {
          const invested = investmentInvested(investment);
          const value = investmentCurrentValue(investment);
          const gain = value - invested;
          const gp = invested ? (gain / invested) * 100 : 0;
          const shares = Number(investment.shares) || 0;
          const price = Number(investment.currentPrice) || 0;
          const meta = [
            investment.type,
            shares > 0 ? `${formatNumber(shares, shares % 1 ? 4 : 0)} sh${price > 0 ? ` @ ${formatCurrency(price)}` : ""}` : "",
            `Invested ${formatCurrency(invested)}`,
            `Now ${formatCurrency(value)}`,
            `${gain >= 0 ? "+" : ""}${formatCurrency(gain)} (${formatNumber(gp, 1)}%)`
          ].filter(Boolean);
          return itemCard({
            title: investment.name,
            meta,
            note: investment.notes,
            actions: `${actionButton("edit-investment", investment.id, "Edit", "edit")}${actionButton("delete-investment", investment.id, "Delete", "trash")}`
          });
        }).join("") : emptyState("Add investments to track gain/loss. Tip: enter shares and update the current price as it moves.")}
      </div>
    `;
  }

  function renderForecast(finance, range, safeFinance = finance, safetyRange = range) {
    return `
      <div class="metric-grid">
        ${metric("Projected balance", formatCurrency(finance.projectedBalance), "End of range")}
        ${metric("Safe-to-spend", formatCurrency(safeFinance.safeToSpend), `Through ${formatDate(safetyRange.end)}`)}
        ${metric("Expected income", formatCurrency(finance.netIncome), "Selected range")}
        ${metric("Upcoming bills", formatCurrency(finance.billsDue), "Unpaid")}
        ${metric("Debt payments", formatCurrency(safeFinance.debtPayments), `${safeFinance.debtPaymentOccurrences.length} due`)}
        ${metric("Expected spending", formatCurrency(finance.spending), "In range")}
        ${metric("Lowest balance", formatCurrency(safeFinance.lowestBalance), "Protected low")}
      </div>
    `;
  }

  function schoolRange() {
    return calculateDateRange(ui.schoolSpan || "all", ui.schoolCustom);
  }

  function renderSchool() {
    if (!validSchoolClassFilter(ui.schoolClassFilter)) ui.schoolClassFilter = "all";
    if (!validSchoolAssignmentFilter(ui.schoolAssignmentFilter)) ui.schoolAssignmentFilter = "active";
    if (ui.schoolView === "class" && findById(appData.school.classes, ui.selectedClassId)) {
      return renderClassDetail(ui.selectedClassId);
    }
    if (ui.schoolView === "class") ui.schoolView = "overview";
    return renderSchoolOverview();
  }

  // ---------- School assignment-progress overview (customizable) ----------
  function schoolProgressData(range) {
    const all = appData.school.assignments.filter((a) => dateInRange(a.dueDate, range));
    const doneIn = (list) => list.filter(assignmentComplete).length;
    const overall = { completed: doneIn(all), total: all.length };
    overall.percent = pct(overall.completed, overall.total);
    const perClass = appData.school.classes.map((k) => {
      const items = all.filter((a) => a.classId === k.id);
      const completed = doneIn(items);
      return { id: k.id, name: k.name || "Class", color: safeHexColor(k.accentColor, "#7c5cff"), completed, total: items.length, percent: pct(completed, items.length) };
    }).filter((c) => c.total > 0);
    const unassigned = all.filter((a) => !a.classId);
    if (unassigned.length) perClass.push({ id: "", name: "No class", color: "#6f7685", completed: doneIn(unassigned), total: unassigned.length, percent: pct(doneIn(unassigned), unassigned.length) });
    return { overall, perClass };
  }

  function progBar(percent, color, h = 10) {
    return `<span class="prog-bar" style="height:${h}px"><i style="width:${clamp(percent)}%;background:${color}"></i></span>`;
  }
  function progRing(percent, color, size = 64, stroke = 8) {
    const p = clamp(percent);
    const r = (size - stroke) / 2 - 1;
    const c = 2 * Math.PI * r;
    const off = (c * (1 - p / 100)).toFixed(1);
    const cx = size / 2;
    return `<svg class="prog-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="${stroke}"/><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off}" transform="rotate(-90 ${cx} ${cx})"/></svg>`;
  }
  function progHalf(percent, color, w = 130, stroke = 11) {
    const p = clamp(percent);
    const r = (w - stroke) / 2;
    const cx = w / 2;
    const cy = r + stroke / 2;
    const h = Math.ceil(cy + stroke / 2);
    const len = Math.PI * r;
    const off = (len * (1 - p / 100)).toFixed(1);
    const d = `M ${(stroke / 2).toFixed(1)} ${cy} A ${r} ${r} 0 0 1 ${(w - stroke / 2).toFixed(1)} ${cy}`;
    return `<svg class="prog-half" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="${stroke}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${off}"/></svg>`;
  }
  function progConcentric(items, size = 188) {
    const stroke = 10;
    const gap = 5;
    const cx = size / 2;
    let inner = "";
    items.forEach((it, i) => {
      const r = (size / 2) - stroke / 2 - 1 - i * (stroke + gap);
      if (r < stroke) return;
      const c = 2 * Math.PI * r;
      const off = (c * (1 - clamp(it.percent) / 100)).toFixed(1);
      inner += `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="${stroke}"/><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${it.color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off}" transform="rotate(-90 ${cx} ${cx})"/>`;
    });
    return `<svg class="sp-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${inner}</svg>`;
  }
  function progHalfConcentric(items, w = 220) {
    const stroke = 10;
    const gap = 5;
    const cx = w / 2;
    const pad = stroke / 2 + 2;
    const cy = w / 2; // baseline so the semicircle fills the top half
    let inner = "";
    items.forEach((it, i) => {
      const r = cx - pad - i * (stroke + gap);
      if (r < stroke) return;
      const len = Math.PI * r;
      const off = (len * (1 - clamp(it.percent) / 100)).toFixed(1);
      const d = `M ${(cx - r).toFixed(1)} ${cy} A ${r} ${r} 0 0 1 ${(cx + r).toFixed(1)} ${cy}`;
      inner += `<path d="${d}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="${stroke}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${it.color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${off}"/>`;
    });
    const h = Math.ceil(cy + stroke / 2 + 2);
    return `<svg class="sp-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${inner}</svg>`;
  }
  function progStacked(perClass, total) {
    const segs = perClass.map((c) => {
      const w = total ? (c.completed / total) * 100 : 0;
      return w > 0 ? `<i style="width:${w}%;background:${c.color}" title="${escapeHtml(c.name)}"></i>` : "";
    }).join("");
    return `<span class="prog-bar prog-stacked" style="height:12px">${segs}</span>`;
  }
  function progLegend(perClass, withCounts) {
    return `<div class="sp-legend">${perClass.map((c) => `<span class="sp-leg"><i style="background:${c.color}"></i>${escapeHtml(c.name)}${withCounts ? ` <b>${c.completed}/${c.total}</b>` : ""}</span>`).join("")}</div>`;
  }

  function renderSchoolProgress(range) {
    const shape = ["bar", "ring", "halfring"].includes(appData.settings.schoolProgressShape) ? appData.settings.schoolProgressShape : "halfring";
    const data = schoolProgressData(range);
    const o = data.overall;
    if (!o.total) {
      return `<section class="card panel school-progress">${emptyState("No assignments in this time span. Add some or widen the range.")}</section>`;
    }
    const classes = data.perClass.length ? data.perClass : [{ id: "", name: "All", color: "var(--accent)", completed: o.completed, total: o.total, percent: o.percent }];
    const legend = appData.settings.schoolProgressLegend ? progLegend(classes, appData.settings.schoolProgressLegendCounts !== false) : "";
    const centerLabel = `<div class="sp-ring-center"><b>${o.percent}%</b><s>${o.completed} / ${o.total}</s><u>Complete</u></div>`;
    let body = "";

    if (shape === "bar") {
      // Per-class labeled bars (no rings).
      body = `<div class="sp-bars">${classes.map((c) => `<div class="sp-barrow"><span class="sp-bn">${escapeHtml(c.name)}</span>${progBar(c.percent, c.color, 9)}<span class="sp-bv">${c.completed}/${c.total}</span></div>`).join("")}</div>`;
    } else if (shape === "halfring") {
      body = `<div class="sp-ring-stage sp-ring-stage-half">${progHalfConcentric(classes)}<div class="sp-half-center"><b>${o.percent}%</b><s>${o.completed} / ${o.total} complete</s></div></div>`;
    } else {
      body = `<div class="sp-ring-stage">${progConcentric(classes, 188)}${centerLabel}</div>`;
    }
    return `<section class="card panel school-progress${shape === "bar" ? " school-progress-bars" : " school-progress-ring"}">${body}${legend}</section>`;
  }

  function renderSchoolOverview() {
    const range = schoolRange();
    const stats = schoolStats(range);
    const byClass = appData.school.classes.map((klass) => classStats(klass.id));
    const inRange = appData.school.assignments.filter((a) => dateInRange(a.dueDate, range));
    const dueToday = appData.school.assignments.filter((a) => !assignmentComplete(a) && a.dueDate === today());
    const completedInRange = inRange.filter(assignmentComplete);

    return `
      <div class="view">
        ${topbar("School", "", actionButton("add-assignment", "", "Add assignment", "plus", "primary"))}

        ${rangeToggle("school", ui.schoolSpan)}
        ${customRangeControls("school", range)}

        ${renderSchoolProgress(range)}

        <div class="sec-head"><span class="sec-title">Classes</span>${actionButton("add-class", "", "Add class", "plus", "secondary")}</div>
        ${appData.school.classes.length
          ? `<section class="class-grid">${byClass.map(renderClassCard).join("")}</section>`
          : `<section>${emptyState("Add classes to group assignments, track grades, and build your calendar.")}</section>`}

        <div class="sec-head"><span class="sec-title">Assignments</span><span class="sec-actions">${actionButton("bulk-add-assignment", "", "Bulk add", "list", "secondary")}${actionButton("add-assignment", "", "Add", "plus", "secondary")}</span></div>
        <div class="assignment-tools">
          ${schoolClassFilterToggle()}
        </div>
        <div class="assignment-list">
          ${renderAssignmentGroups(filterAssignmentsByClass(appData.school.assignments), range)}
        </div>

        ${renderSchoolCalendarCard({ scope: "school" })}
      </div>
    `;
  }

  // Big grade ring for the class detail hero: the ring fill tracks completion,
  // the centred label is the class's letter grade, tinted with the class color.
  function classGradeRing(percent, letter, color) {
    const p = clamp(Math.round(Number(percent) || 0), 0, 100);
    const r = 30;
    const c = 2 * Math.PI * r;
    const off = c * (1 - p / 100);
    return `
      <div class="class-grade-ring">
        <svg width="74" height="74" viewBox="0 0 74 74" aria-hidden="true">
          <circle cx="37" cy="37" r="${r}" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="7"></circle>
          <circle cx="37" cy="37" r="${r}" fill="none" stroke="${escapeHtml(color)}" stroke-width="7" stroke-linecap="round"
            stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 37 37)"></circle>
        </svg>
        <span class="class-grade-ring-val">${escapeHtml(letter)}</span>
      </div>
    `;
  }

  function renderClassDetail(classId) {
    const klass = findById(appData.school.classes, classId) || {};
    const stats = classStats(classId);
    const color = safeHexColor(klass.accentColor, "#7c5cff");
    const assignments = appData.school.assignments.filter((a) => a.classId === classId);
    const open = assignments.filter((a) => !assignmentComplete(a));
    const overdue = open.filter((a) => isBeforeToday(a.dueDate));
    const upcoming = open.filter((a) => !isBeforeToday(a.dueDate));
    const nextUp = sortByDate(upcoming)[0];
    const meta = [klass.professor, klass.meetingDays].filter(Boolean);
    const chips = [
      overdue.length ? `<span class="class-chip-stat over">${overdue.length} overdue</span>` : "",
      `<span class="class-chip-stat">${upcoming.length} upcoming</span>`,
      `<span class="class-chip-stat">${nextUp ? `Next ${escapeHtml(formatDate(nextUp.dueDate))}` : "All caught up"}</span>`
    ].filter(Boolean).join("");
    return `
      <div class="view class-detail" style="--class-color:${escapeHtml(color)}; --class-color-rgb:${rgbText(color)}">
        <section class="topbar class-detail-topbar">
          <div>
            <button type="button" class="back-link" data-action="back-to-school">${icon("chevron")}<span>School</span></button>
            <h1 class="class-detail-title">${escapeHtml(klass.name || "Class")}</h1>
            ${meta.length ? `<p class="muted">${escapeHtml(meta.join(" · "))}</p>` : ""}
          </div>
        </section>

        <section class="card panel class-hero">
          <div class="class-hero-top">
            ${classGradeRing(stats.percent, stats.displayLetter || "—", color)}
            <div class="class-hero-prog">
              <span class="class-hero-label">Completion</span>
              <span class="class-hero-value">${stats.completed} / ${stats.total} · ${stats.percent}%</span>
              <div class="class-hero-bar" data-progress-key="${ui.activeTab}:class-detail-${escapeHtml(classId)}" data-progress-percent="${clamp(stats.percent)}"><div class="progress"><span style="width:${clamp(stats.percent)}%"></span></div></div>
              <span class="class-hero-src">${escapeHtml(stats.gradeSource)}</span>
            </div>
          </div>
          <div class="class-chips">${chips}</div>
          <div class="class-hero-actions">
            ${actionButton("edit-class-grade", classId, "Edit grade", "spark", "secondary")}
            ${actionButton("edit-class", classId, "Edit class", "edit", "secondary")}
          </div>
          ${klass.notes ? `<p class="tiny class-notes">${escapeHtml(klass.notes)}</p>` : ""}
        </section>

        <section class="card panel section">
          <div class="section-header">
            <h2>Assignments</h2>
            <div class="actions">
              ${actionButton("bulk-add-assignment", classId, "Bulk add", "list", "secondary")}
              ${actionButton("add-assignment", "", "Add", "plus", "secondary")}
            </div>
          </div>
          <div class="assignment-list">
            ${renderAssignmentGroups(assignments, { start: "1900-01-01", end: "2999-12-31" }, { ignoreStatusFilter: true })}
          </div>
        </section>

        ${renderSchoolCalendarCard({ scope: "class", classId, open: false })}

        <details class="card panel section timeline-card">
          <summary>
            <span class="finance-section-heading"><span class="finance-section-title">Timeline</span></span>
            <span class="tiny">${assignments.length}</span>
          </summary>
          <div class="details-body">
            ${renderClassTimeline(assignments)}
          </div>
        </details>
      </div>
    `;
  }

  function renderClassTimeline(assignments) {
    if (!assignments.length) return emptyState("No assignments for this class yet.");
    const sorted = sortByDate(assignments);
    const todayStr = today();
    return `
      <ol class="timeline">
        ${sorted.map((a) => {
          const status = normalizedAssignmentStatus(a.status);
          const complete = status === "completed";
          const overdue = !complete && isBeforeToday(a.dueDate);
          const isToday = a.dueDate === todayStr;
          const state = complete ? "complete" : overdue ? "overdue" : status === "in progress" ? "in-progress" : isToday ? "today" : "upcoming";
          const statusLabel = complete ? "Completed" : overdue ? "Overdue" : status === "in progress" ? "In progress" : "Not started";
          return `
            <li class="timeline-item ${state}">
              <span class="timeline-dot" aria-hidden="true"></span>
              <div class="timeline-body">
                <div class="timeline-top">
                  <span class="timeline-date">${escapeHtml(formatDate(a.dueDate))}${a.dueTime ? ` · ${escapeHtml(a.dueTime)}` : ""}</span>
                  <span class="timeline-status ${state}">${escapeHtml(statusLabel)}</span>
                </div>
                <p class="timeline-title">${escapeHtml(a.title)}</p>
                ${a.type ? `<span class="timeline-type">${escapeHtml(a.type)}</span>` : ""}
              </div>
            </li>
          `;
        }).join("")}
      </ol>
    `;
  }

  function validSchoolClassFilter(filter) {
    return filter === "all" || filter === "unassigned" || Boolean(findById(appData.school.classes, filter));
  }

  function validSchoolAssignmentFilter(filter) {
    return ["active", "all", "not-started", "in-progress", "completed", "overdue"].includes(filter);
  }

  function filterAssignmentsByClass(assignments) {
    if (ui.schoolClassFilter === "unassigned") return assignments.filter((assignment) => !assignment.classId);
    if (ui.schoolClassFilter === "all") return assignments;
    return assignments.filter((assignment) => assignment.classId === ui.schoolClassFilter);
  }

  function schoolFilterLabel(filter) {
    if (filter === "unassigned") return "Showing assignments with no class";
    if (filter === "all") return "All Classes";
    return `Showing ${className(filter)}`;
  }

  function schoolAssignmentFilterLabel(filter) {
    const labels = {
      active: "Active assignments",
      all: "All assignments",
      "not-started": "Not started",
      "in-progress": "In progress",
      completed: "Completed",
      overdue: "Overdue"
    };
    return labels[filter] || labels.active;
  }

  function schoolClassFilterToggle() {
    const filters = [
      { id: "all", name: "All Classes", color: appData.settings.accent || "#f7f7ff" },
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

  function schoolAssignmentFilterToggle() {
    const filters = [
      { id: "active", name: "Active" },
      { id: "all", name: "All" },
      { id: "not-started", name: "Not Started" },
      { id: "in-progress", name: "In Progress" },
      { id: "overdue", name: "Overdue" },
      { id: "completed", name: "Completed" }
    ];
    return `
      <div class="assignment-status-filter" role="group" aria-label="Filter assignments by status">
        ${filters.map((filter) => `
          <button type="button" class="status-chip ${ui.schoolAssignmentFilter === filter.id ? "active" : ""}" data-action="set-school-assignment-filter" data-assignment-filter="${escapeHtml(filter.id)}">
            <span>${escapeHtml(filter.name)}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderClassCard(stats) {
    const color = safeHexColor(stats.color);
    const progressKey = `school:class-${stats.id}`;
    const assignments = appData.school.assignments.filter((a) => a.classId === stats.id);
    const open = assignments.filter((a) => !assignmentComplete(a));
    const overdue = open.filter((a) => isBeforeToday(a.dueDate));
    const upcoming = sortByDate(open.filter((a) => !isBeforeToday(a.dueDate)));
    const nextUp = upcoming[0];
    const gradeBadge = stats.displayLetter
      ? `<button type="button" class="class-grade-badge" data-action="edit-class-grade" data-id="${escapeHtml(stats.id)}" title="Edit grade" aria-label="Edit grade">${escapeHtml(stats.displayLetter)}</button>`
      : `<button type="button" class="class-grade-badge add" data-action="edit-class-grade" data-id="${escapeHtml(stats.id)}" title="Add grade" aria-label="Add grade">${icon("plus")}<span>Grade</span></button>`;
    const deadlineMeta = overdue.length
      ? `<span class="class-meta-overdue">${overdue.length} overdue</span>`
      : nextUp
        ? `<span>Next ${escapeHtml(formatDate(nextUp.dueDate))}</span>`
        : `<span>No upcoming work</span>`;
    const metaText = overdue.length
      ? `${overdue.length} overdue`
      : nextUp
        ? `Next ${formatDate(nextUp.dueDate)}`
        : (open.length ? `${upcoming.length} upcoming` : "All caught up");
    return `
      <article class="class-card2 ${overdue.length ? "has-overdue" : ""}" role="button" tabindex="0" data-action="open-class" data-id="${escapeHtml(stats.id)}" data-progress-key="${escapeHtml(progressKey)}" data-progress-percent="${escapeHtml(clamp(stats.percent))}" style="--class-color:${escapeHtml(color)}; --class-color-rgb:${rgbText(color)}">
        <div class="cc2-top">
          <span class="cc2-name">${escapeHtml(stats.name)}</span>
          ${gradeBadge}
        </div>
        <div class="cc2-meta">
          <span class="cc2-pct">${countSpan(`${progressKey}:percent`, stats.percent, { suffix: "%" })}</span>
          <span class="cc2-deadline">${escapeHtml(metaText)}</span>
        </div>
        <div class="progress cc2-progress"><span style="width:${clamp(stats.percent)}%"></span></div>
      </article>
    `;
  }

  function renderAssignmentItem(assignment) {
    const complete = assignmentComplete(assignment);
    const status = normalizedAssignmentStatus(assignment.status);
    const inProgress = status === "in progress";
    const overdue = !complete && isBeforeToday(assignment.dueDate);
    const klass = findById(appData.school.classes, assignment.classId);
    const color = safeHexColor(klass?.accentColor, "#6f7685");
    const dueLabel = `${formatDate(assignment.dueDate)}${assignment.dueTime ? ` ${assignment.dueTime}` : ""}`;
    const classLabel = assignment.classId ? className(assignment.classId) : "No class";
    const statusBadge = complete
      ? `<span class="assignment-status-tag complete">Completed</span>`
      : overdue
        ? `<span class="assignment-status-tag overdue">Overdue</span>`
        : inProgress
          ? `<span class="assignment-status-tag in-progress">In Progress</span>`
          : "";
    const meta = [
      `<span class="assignment-class-tag ${complete ? "complete" : ""}">${escapeHtml(classLabel)}</span>`,
      assignment.type ? `<span>${escapeHtml(assignment.type)}</span>` : "",
      assignment.dueDate ? `<span>${escapeHtml(dueLabel)}</span>` : "<span>No due date</span>",
      assignment.priority ? `<span>${escapeHtml(assignment.priority)}</span>` : "",
      statusBadge
    ];
    const gradeLine = assignment.grade || (assignment.pointsPossible ? `${formatNumber(assignment.pointsEarned)} / ${formatNumber(assignment.pointsPossible)} pts` : "");
    return `
      <details class="assignment-card ${complete ? "complete" : ""} ${inProgress ? "in-progress" : ""} ${overdue ? "overdue" : ""}" data-assignment-card-id="${escapeHtml(assignment.id)}" style="--class-color:${escapeHtml(color)}; --class-color-rgb:${rgbText(color)}">
        <summary>
          <span class="assignment-summary">
            <span class="item-title assignment-title">${escapeHtml(assignment.title)}</span>
            <span class="item-meta">${meta.filter(Boolean).join("")}</span>
          </span>
        </summary>
        <div class="details-body assignment-body">
          ${assignment.notes ? `<p class="tiny">${escapeHtml(assignment.notes)}</p>` : ""}
          ${gradeLine ? `<p class="tiny assignment-grade-line">Grade: ${escapeHtml(gradeLine)}</p>` : ""}
          ${assignment.link ? `<a class="assignment-link" href="${escapeHtml(assignment.link)}" target="_blank" rel="noopener">Open link</a>` : ""}
          ${assignmentStatusControl(assignment.id, status)}
          <div class="item-actions assignment-body-actions">
            ${actionButton("edit-assignment", assignment.id, "Edit", "edit", "secondary")}
            ${actionButton("delete-assignment", assignment.id, "Delete", "trash")}
          </div>
        </div>
      </details>
    `;
  }

  function renderAssignmentGroups(assignments, range, options = {}) {
    const inRange = (a) => dateInRange(a.dueDate, range);
    const overdue = sortByDate(assignments.filter((a) => !assignmentComplete(a) && isBeforeToday(a.dueDate)));
    // Assigned and in-progress assignments share one "Assignments" list — marking
    // something in progress highlights it in place instead of moving it to a bar.
    // Overdue and Completed are their own boxes that only appear when they have items.
    const todo = sortByDate(assignments.filter((a) => !assignmentComplete(a) && !isBeforeToday(a.dueDate) && inRange(a)));
    const completed = [...assignments.filter((a) => assignmentComplete(a) && inRange(a))].sort((a, b) => String(b.dueDate || "").localeCompare(String(a.dueDate || "")));

    const groups = [
      { key: "overdue", title: "Overdue", items: overdue, open: true },
      { key: "todo", title: "To do", items: todo, open: true },
      { key: "completed", title: "Completed", items: completed, open: false }
    ];

    const totalShown = groups.reduce((n, g) => n + g.items.length, 0);
    if (!totalShown) return emptyState("No assignments yet. Tap “Add” or “Bulk add” to create some.");

    return groups.map((g) => {
      if (!g.items.length) return "";
      return `
        <details class="card assignment-group assignment-group-${g.key.replace(/\s+/g, "-")}" ${g.open ? "open" : ""}>
          <summary>
            <span class="assignment-group-title">${escapeHtml(g.title)}</span>
            <span class="tiny">${g.items.length}</span>
          </summary>
          <div class="details-body">
            <div class="list assignment-list-inner">
              ${g.items.map(renderAssignmentItem).join("")}
            </div>
          </div>
        </details>
      `;
    }).join("");
  }

  // ---------- School calendar ----------
  function currentCalendarMonth() {
    const ym = String(ui.calendarMonth || "");
    return /^\d{4}-\d{2}$/.test(ym) ? ym : today().slice(0, 7);
  }

  function shiftCalendarMonth(ym, delta) {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, (m - 1) + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function calendarEvents(scope, classId) {
    const events = [];
    const selectedClasses = Array.isArray(ui.calendarClasses) ? ui.calendarClasses.filter((id) => findById(appData.school.classes, id)) : [];
    appData.school.assignments.forEach((a) => {
      if (!a.dueDate) return;
      if (scope === "class" && a.classId !== classId) return;
      if (scope === "school" && selectedClasses.length && !selectedClasses.includes(a.classId)) return;
      const klass = findById(appData.school.classes, a.classId);
      events.push({
        date: a.dueDate,
        title: a.title,
        kind: "assignment",
        classId: a.classId,
        color: safeHexColor(klass?.accentColor, "#7c5cff"),
        status: normalizedAssignmentStatus(a.status),
        complete: assignmentComplete(a),
        overdue: !assignmentComplete(a) && isBeforeToday(a.dueDate)
      });
    });
    return events;
  }

  function renderSchoolCalendarCard({ scope = "school", classId = "", open = true } = {}) {
    const ym = currentCalendarMonth();
    const [year, month] = ym.split("-").map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(monthStart);
    const events = calendarEvents(scope, classId);
    const eventsByDate = events.reduce((map, ev) => {
      (map[ev.date] = map[ev.date] || []).push(ev);
      return map;
    }, {});
    const firstWeekday = (monthStart.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month, 0).getDate();
    const todayStr = today();
    // Only treat a day as selected when it falls inside the month on screen, so
    // stepping months with the arrows never shows a detail panel for a hidden day.
    const selected = (ui.calendarSelectedDate && ui.calendarSelectedDate.slice(0, 7) === ym) ? ui.calendarSelectedDate : "";

    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(`${ym}-${String(day).padStart(2, "0")}`);
    while (cells.length % 7 !== 0) cells.push(null);

    const weekdayHeader = ["M", "T", "W", "T", "F", "S", "S"]
      .map((d) => `<span class="cal-weekday">${d}</span>`).join("");

    const grid = cells.map((date) => {
      if (!date) return `<span class="cal-cell cal-empty"></span>`;
      const dayEvents = eventsByDate[date] || [];
      const dots = dayEvents.slice(0, 3).map((ev) => `<i class="cal-dot ${ev.complete ? "complete" : ev.overdue ? "overdue" : ""}" style="--dot:${escapeHtml(ev.color)}"></i>`).join("");
      const classes = ["cal-cell", "cal-day"];
      if (date === todayStr) classes.push("is-today");
      if (date === selected) classes.push("is-selected");
      if (dayEvents.length) classes.push("has-events");
      return `
        <button type="button" class="${classes.join(" ")}" data-action="school-select-calendar-day" data-date="${escapeHtml(date)}">
          <span class="cal-num">${Number(date.slice(8))}</span>
          ${dots ? `<span class="cal-dots">${dots}</span>` : ""}
        </button>
      `;
    }).join("");

    const selectedEvents = selected ? (eventsByDate[selected] || []) : [];
    const selectedPanel = selected ? `
      <div class="cal-day-detail">
        <div class="cal-day-detail-head">
          <span>${escapeHtml(formatLongDate(selected))}</span>
          ${actionButton("add-assignment", "", "Add", "plus", "secondary")}
        </div>
        ${selectedEvents.length ? `<div class="list">${selectedEvents.map((ev) => `
          <div class="cal-event" style="--class-color:${escapeHtml(ev.color)}; --class-color-rgb:${rgbText(ev.color)}">
            <span class="cal-event-dot ${ev.complete ? "complete" : ev.overdue ? "overdue" : ""}"></span>
            <span class="cal-event-title">${escapeHtml(ev.title)}</span>
            <span class="cal-event-meta">${escapeHtml(ev.classId ? className(ev.classId) : "No class")}</span>
          </div>
        `).join("")}</div>` : `<p class="tiny">Nothing scheduled.</p>`}
      </div>
    ` : "";

    const classFilter = scope === "school" ? renderCalendarClassFilter() : "";

    return `
      <details class="card panel section calendar-card"${open ? " open" : ""}>
        <summary>
          <span class="finance-section-heading"><span class="finance-section-title">Calendar</span></span>
          <span class="tiny">${events.length} item${events.length === 1 ? "" : "s"}</span>
        </summary>
        <div class="details-body">
          ${classFilter}
          <div class="cal-header">
            <button type="button" class="cal-nav" data-action="school-calendar-prev" aria-label="Previous month">${icon("chevron")}</button>
            <span class="cal-month">${escapeHtml(monthLabel)}</span>
            <button type="button" class="cal-nav cal-nav-next" data-action="school-calendar-next" aria-label="Next month">${icon("chevron")}</button>
          </div>
          <div class="cal-weekdays">${weekdayHeader}</div>
          <div class="cal-grid">${grid}</div>
          ${selectedPanel}
        </div>
      </details>
    `;
  }

  function renderCalendarClassFilter() {
    const selected = Array.isArray(ui.calendarClasses) ? ui.calendarClasses : [];
    const chips = [
      `<button type="button" class="class-chip ${selected.length === 0 ? "active" : ""}" data-action="set-calendar-class" data-class-id="all"><span>All classes</span></button>`,
      ...appData.school.classes.map((klass) => {
        const color = safeHexColor(klass.accentColor, "#7c5cff");
        const active = selected.includes(klass.id);
        return `<button type="button" class="class-chip ${active ? "active" : ""}" data-action="set-calendar-class" data-class-id="${escapeHtml(klass.id)}" style="--class-color:${escapeHtml(color)}; --class-color-rgb:${rgbText(color)}"><span>${escapeHtml(klass.name || "Class")}</span></button>`;
      })
    ].join("");
    return `<div class="class-filter calendar-class-filter" role="group" aria-label="Filter calendar by class">${chips}</div>`;
  }

  // ---------- Unified calendar (Calendar tab) ----------
  // One source of truth for kind accents so a task is the same color everywhere
  // (up next, snapshot, calendar). Assignments keep their per-class color.
  const CALENDAR_KIND_COLORS = {
    assignment: "#9d6fff", // fallback only; assignments use their class color
    task: "#9d6fff",       // purple
    meeting: "#4f8cff",    // blue
    bill: "#ffd166",       // fallback only; bills use their own finance color
    reminder: "#ffae52",   // orange
    workout: "#ff5c8a"     // pink
  };

  function timeToMinutes(value) {
    const m = String(value || "").match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function allCalendarEvents(ym) {
    const [year, month] = ym.split("-").map(Number);
    const monthRange = { start: `${ym}-01`, end: dateString(new Date(year, month, 0)), label: "month" };
    const events = [];
    const selectedClasses = Array.isArray(ui.calendarClasses) ? ui.calendarClasses.filter((id) => findById(appData.school.classes, id)) : [];
    const classAllowed = (classId) => !selectedClasses.length || selectedClasses.includes(classId);

    // Assignments (class deadlines)
    appData.school.assignments.forEach((a) => {
      if (!a.dueDate || !classAllowed(a.classId)) return;
      const klass = findById(appData.school.classes, a.classId);
      events.push({
        id: a.id, kind: "assignment", date: a.dueDate, title: a.title,
        color: safeHexColor(klass?.accentColor, CALENDAR_KIND_COLORS.assignment),
        start: a.dueTime || "", end: "",
        complete: assignmentComplete(a), overdue: !assignmentComplete(a) && isBeforeToday(a.dueDate),
        meta: [a.classId ? className(a.classId) : "No class", a.type].filter(Boolean).join(" · "),
        action: "edit-assignment"
      });
    });

    // Tasks (untimed checklist) and meetings (timed blocks)
    appData.tasks.forEach((t) => {
      if (!t.dueDate || !classAllowed(t.classId)) return;
      const timed = Boolean(t.startTime);
      events.push({
        id: t.id, kind: timed ? "meeting" : "task", date: t.dueDate, title: t.title,
        color: t.color ? safeHexColor(t.color, timed ? CALENDAR_KIND_COLORS.meeting : CALENDAR_KIND_COLORS.task) : (timed ? CALENDAR_KIND_COLORS.meeting : CALENDAR_KIND_COLORS.task),
        start: t.startTime || "", end: t.endTime || "",
        complete: Boolean(t.completed), overdue: !t.completed && isBeforeToday(t.dueDate),
        meta: [t.classId ? className(t.classId) : (t.category || ""), timed ? "" : "Task"].filter(Boolean).join(" · "),
        action: "edit-task"
      });
    });

    // Bills (occurrences this month)
    appData.finance.bills.forEach((bill) => {
      billOccurrencesInRange(bill, monthRange).forEach((occ) => {
        events.push({
          id: bill.id, kind: "bill", date: occ.date, title: bill.name || "Bill",
          color: safeHexColor(bill.color, CALENDAR_KIND_COLORS.bill), start: "", end: "",
          complete: Boolean(occ.paid), overdue: !occ.paid && isBeforeToday(occ.date),
          meta: [formatCurrency(occ.amount), occ.paid ? "Paid" : billTypeLabel(bill)].filter(Boolean).join(" · "),
          action: "edit-bill"
        });
      });
    });

    // Reminders
    appData.reminders.forEach((r) => {
      if (!r.date) return;
      events.push({
        id: r.id, kind: "reminder", date: r.date, title: r.title || "Reminder",
        color: CALENDAR_KIND_COLORS.reminder, start: r.time || "", end: "",
        complete: Boolean(r.completed), overdue: !r.completed && isBeforeToday(r.date),
        meta: [r.type || "Reminder"].filter(Boolean).join(" · "),
        action: "edit-reminder"
      });
    });

    // Workouts (scheduled in the Health tab)
    appData.gym.workouts.forEach((w) => {
      if (!w.date || !dateInRange(w.date, monthRange)) return;
      events.push({
        id: w.id, kind: "workout", date: w.date, title: `${w.split || "Workout"}`,
        color: CALENDAR_KIND_COLORS.workout, start: w.startTime || "", end: w.endTime || "",
        complete: isBeforeToday(w.date), overdue: false,
        meta: [w.duration ? `${w.duration} min` : "", "Workout"].filter(Boolean).join(" · "),
        action: "edit-workout"
      });
    });

    // Debt / credit-card minimum payments. Only shown while the card still has a
    // balance, so they disappear once it's paid off and reappear if the balance
    // goes back up. Not a fixed recurring bill — it's driven entirely by balance.
    appData.finance.debts.forEach((debt) => {
      if ((Number(debt.balance) || 0) <= 0 || !debt.dueDate) return;
      const amount = Number(debt.minimumPayment) || 0;
      billOccurrencesInRange({ id: debt.id, name: debt.name || "Debt", amount, dueDate: debt.dueDate, frequency: "monthly", paid: false }, monthRange).forEach((occ) => {
        events.push({
          id: debt.id, kind: "bill", date: occ.date, title: `${debt.name || "Debt"} payment`,
          color: safeHexColor(debt.color, CALENDAR_KIND_COLORS.bill), start: "", end: "",
          complete: false, overdue: false,
          meta: [amount > 0 ? formatCurrency(amount) : "", "Min payment"].filter(Boolean).join(" · "),
          action: "edit-debt"
        });
      });
    });

    const kind = ["all", "assignment", "task", "meeting", "bill", "reminder", "workout"].includes(ui.calendarKindFilter) ? ui.calendarKindFilter : "all";
    return kind === "all" ? events : events.filter((ev) => ev.kind === kind);
  }

  function calendarKindFilterRow() {
    const filters = [
      ["all", "All"],
      ["assignment", "Assignments"],
      ["task", "Tasks"],
      ["meeting", "Meetings"],
      ["bill", "Bills"],
      ["reminder", "Reminders"],
      ["workout", "Workouts"]
    ];
    const active = ui.calendarKindFilter || "all";
    return `
      <div class="assignment-status-filter calendar-kind-filter" role="group" aria-label="Filter calendar by type">
        ${filters.map(([id, label]) => `
          <button type="button" class="status-chip ${active === id ? "active" : ""}" data-action="set-calendar-kind" data-kind="${id}"><span>${label}</span></button>
        `).join("")}
      </div>
    `;
  }

  const CAL_HOUR_HEIGHT = 52;

  function calendarAnchorDate() {
    const sel = ui.calendarSelectedDate;
    if (sel && parseDate(sel)) return sel;
    return today();
  }

  function calendarViewToggle() {
    const view = ["month", "week", "day"].includes(ui.calendarView) ? ui.calendarView : "month";
    const opts = [["month", "Month"], ["week", "Week"], ["day", "Day"]];
    return `
      <div class="seg-toggle cal-view-toggle" role="group" aria-label="Calendar view">
        ${opts.map(([id, label]) => `<button type="button" class="seg-btn cal-view-btn ${view === id ? "active" : ""}" data-action="set-calendar-view" data-view="${id}"><span>${label}</span></button>`).join("")}
      </div>
    `;
  }

  function calendarPeriodHeader(label) {
    return `
      <div class="cal-header">
        <button type="button" class="cal-nav" data-action="calendar-prev" aria-label="Previous">${icon("chevron")}</button>
        <span class="cal-month">${escapeHtml(label)}</span>
        <button type="button" class="cal-nav cal-nav-next" data-action="calendar-next" aria-label="Next">${icon("chevron")}</button>
      </div>
    `;
  }

  function renderCalendarPage() {
    // Assignments are colored per class and bills per their finance color, so they
    // are not given a single legend key. Only fixed-color kinds appear here.
    const legend = { Tasks: CALENDAR_KIND_COLORS.task, Meetings: CALENDAR_KIND_COLORS.meeting, Reminders: CALENDAR_KIND_COLORS.reminder, Workouts: CALENDAR_KIND_COLORS.workout };
    return `
      <div class="view">
        ${topbar("Calendar", "", actionButton("add-task", "", "Add to calendar", "plus", "primary"))}

        <section class="card panel section calendar-page-card">
          ${calendarKindFilterRow()}
          ${calendarViewToggle()}
          <div class="cal-body" data-cal-body>
            ${renderCalendarBody()}
          </div>
          <div class="cal-legend">
            ${Object.entries(legend).map(([label, color]) => `<span><i style="background:${color}"></i>${label}</span>`).join("")}
          </div>
        </section>
      </div>
    `;
  }

  function renderCalendarBody() {
    const view = ["month", "week", "day"].includes(ui.calendarView) ? ui.calendarView : "month";
    if (view === "day") return renderCalendarDayBody();
    if (view === "week") return renderCalendarWeekBody();
    return renderCalendarMonthBody();
  }

  function refreshCalendarBody() {
    const body = app.querySelector("[data-cal-body]");
    if (!body) return render({ quiet: true });
    app.querySelectorAll(".calendar-kind-filter .status-chip").forEach((c) => c.classList.toggle("active", c.dataset.kind === (ui.calendarKindFilter || "all")));
    app.querySelectorAll(".cal-view-toggle .cal-view-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === (ui.calendarView || "month")));
    body.innerHTML = renderCalendarBody();
    body.classList.remove("cal-body-swap");
    void body.offsetWidth;
    body.classList.add("cal-body-swap");
    saveUi();
    scrollCalendarTimeline();
  }

  function renderCalendarMonthBody() {
    const ym = currentCalendarMonth();
    const [year, month] = ym.split("-").map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(monthStart);
    const events = allCalendarEvents(ym);
    const eventsByDate = events.reduce((map, ev) => {
      (map[ev.date] = map[ev.date] || []).push(ev);
      return map;
    }, {});
    const firstWeekday = (monthStart.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month, 0).getDate();
    const todayStr = today();
    const selected = ui.calendarSelectedDate || "";

    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(`${ym}-${String(day).padStart(2, "0")}`);
    while (cells.length % 7 !== 0) cells.push(null);

    const weekdayHeader = ["M", "T", "W", "T", "F", "S", "S"].map((d) => `<span class="cal-weekday">${d}</span>`).join("");
    const grid = cells.map((date) => {
      if (!date) return `<span class="cal-cell cal-empty"></span>`;
      const dayEvents = eventsByDate[date] || [];
      const dots = dayEvents.slice(0, 4).map((ev) => `<i class="cal-dot ${ev.complete ? "complete" : ev.overdue ? "overdue" : ""}" style="--dot:${escapeHtml(ev.color)}"></i>`).join("");
      const classes = ["cal-cell", "cal-day"];
      if (date === todayStr) classes.push("is-today");
      if (date === selected) classes.push("is-selected");
      if (dayEvents.length) classes.push("has-events");
      return `
        <button type="button" class="${classes.join(" ")}" data-action="calendar-month-day" data-date="${escapeHtml(date)}">
          <span class="cal-num">${Number(date.slice(8))}</span>
          ${dots ? `<span class="cal-dots">${dots}</span>` : ""}
        </button>
      `;
    }).join("");

    // Month + agenda: tapping a day reveals that day's schedule inline below the
    // grid (the date header jumps to the full Day view).
    const selectedInMonth = selected && selected.slice(0, 7) === ym ? selected : "";
    let agenda;
    if (selectedInMonth) {
      const dayEvents = [...(eventsByDate[selectedInMonth] || [])].sort((a, b) => {
        const am = timeToMinutes(a.start);
        const bm = timeToMinutes(b.start);
        if (am === null && bm === null) return 0;
        if (am === null) return -1;
        if (bm === null) return 1;
        return am - bm;
      });
      const label = formatLongDate(selectedInMonth) + (selectedInMonth === todayStr ? " · Today" : "");
      agenda = `
        <div class="cal-agenda">
          <div class="cal-agenda-head">
            <button type="button" class="cal-agenda-date" data-action="select-calendar-day" data-date="${escapeHtml(selectedInMonth)}">${escapeHtml(label)}${icon("chevron")}</button>
            <span class="tiny">${dayEvents.length} item${dayEvents.length === 1 ? "" : "s"}</span>
          </div>
          ${dayEvents.length ? `<div class="cal-agenda-list">${dayEvents.map(renderCalendarEventRow).join("")}</div>` : `<p class="tiny cal-hint">Nothing scheduled.</p>`}
        </div>
      `;
    } else {
      agenda = `<p class="tiny cal-hint">Tap a day to see its schedule.</p>`;
    }

    return `
      ${calendarPeriodHeader(monthLabel)}
      <div class="cal-weekdays">${weekdayHeader}</div>
      <div class="cal-grid">${grid}</div>
      ${agenda}
    `;
  }

  function layoutTimelineEvents(events) {
    const allDay = [];
    const timed = [];
    (events || []).forEach((ev) => {
      const s = timeToMinutes(ev.start);
      if (s === null) { allDay.push(ev); return; }
      let e = timeToMinutes(ev.end);
      if (e === null || e <= s) e = Math.min(1440, s + 60);
      timed.push({ ev, s, e, col: 0, cols: 1 });
    });
    timed.sort((a, b) => a.s - b.s || a.e - b.e);
    let cluster = [];
    let clusterEnd = -1;
    const flush = () => {
      const colsCount = Math.max(1, ...cluster.map((c) => c.col + 1));
      cluster.forEach((c) => { c.cols = colsCount; });
      cluster = [];
    };
    timed.forEach((item) => {
      if (cluster.length && item.s >= clusterEnd) { flush(); clusterEnd = -1; }
      const used = new Set(cluster.filter((c) => c.e > item.s).map((c) => c.col));
      let col = 0;
      while (used.has(col)) col++;
      item.col = col;
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.e);
    });
    if (cluster.length) flush();
    return { allDay, timed };
  }

  function formatHourLabel(h) {
    const period = h < 12 ? "AM" : "PM";
    const hh = h % 12 || 12;
    return `${hh} ${period}`;
  }

  function renderHourGutter() {
    let html = "";
    for (let h = 0; h < 24; h++) html += `<div class="cal-hour-label"><span>${h === 0 ? "" : formatHourLabel(h)}</span></div>`;
    return `<div class="cal-hour-gutter">${html}</div>`;
  }

  function renderNowLine() {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    return `<div class="cal-now-line" style="top:${(mins / 1440 * 100).toFixed(3)}%"><span class="cal-now-dot"></span></div>`;
  }

  function renderTimelineEvent(t) {
    const ev = t.ev;
    const top = (t.s / 1440 * 100).toFixed(3);
    const height = Math.max((t.e - t.s) / 1440 * 100, 2.4).toFixed(3);
    const leftPct = (t.col / t.cols * 100).toFixed(3);
    const widthPct = (1 / t.cols * 100).toFixed(3);
    const state = ev.complete ? "complete" : ev.overdue ? "overdue" : "";
    const time = formatTime(ev.start);
    return `
      <button type="button" class="cal-tl-event ${state}" data-action="${escapeHtml(ev.action)}" data-id="${escapeHtml(ev.id)}"
        style="top:${top}%; height:${height}%; left:calc(${leftPct}% + 2px); width:calc(${widthPct}% - 4px); --class-color:${escapeHtml(ev.color)}; --class-color-rgb:${rgbText(ev.color)}">
        <span class="cal-tl-event-title">${escapeHtml(ev.title)}</span>
        ${time ? `<span class="cal-tl-event-time">${escapeHtml(time)}</span>` : ""}
      </button>
    `;
  }

  function renderAllDayStrip(allDay) {
    if (!allDay.length) return "";
    return `
      <div class="cal-allday-strip">
        <span class="cal-allday-label">All-day</span>
        <div class="cal-allday-items">
          ${allDay.map((ev) => `<button type="button" class="cal-allday-chip" data-action="${escapeHtml(ev.action)}" data-id="${escapeHtml(ev.id)}" style="--class-color:${escapeHtml(ev.color)}; --class-color-rgb:${rgbText(ev.color)}"><span>${escapeHtml(ev.title)}</span></button>`).join("")}
        </div>
      </div>
    `;
  }

  function renderCalendarDayBody() {
    const dateStr = calendarAnchorDate();
    const ym = dateStr.slice(0, 7);
    const events = allCalendarEvents(ym).filter((ev) => ev.date === dateStr);
    const { allDay, timed } = layoutTimelineEvents(events);
    const todayStr = today();
    const isToday = dateStr === todayStr;
    const label = formatLongDate(dateStr) + (isToday ? " · Today" : "");
    return `
      ${calendarPeriodHeader(label)}
      ${renderAllDayStrip(allDay)}
      <div class="cal-timeline-scroll" data-timeline>
        <div class="cal-timeline cal-timeline-day" style="--hour-h:${CAL_HOUR_HEIGHT}px; --tl-h:${CAL_HOUR_HEIGHT * 24}px">
          ${renderHourGutter()}
          <div class="cal-tl-cols">
            ${isToday ? renderNowLine() : ""}
            <div class="cal-tl-col">
              ${timed.map(renderTimelineEvent).join("")}
            </div>
          </div>
        </div>
      </div>
      ${timed.length || allDay.length ? "" : `<p class="tiny cal-hint">Nothing scheduled. Tap “Add to calendar” to plan this day.</p>`}
    `;
  }

  function renderCalendarWeekBody() {
    const weekStartDate = startOfWeek(parseDate(calendarAnchorDate()) || new Date());
    const startStr = dateString(weekStartDate);
    const endStr = dateString(addDays(weekStartDate, 6));
    const months = new Set([startStr.slice(0, 7), endStr.slice(0, 7)]);
    let events = [];
    months.forEach((ym) => { events = events.concat(allCalendarEvents(ym)); });
    const seen = new Set();
    events = events.filter((ev) => {
      if (ev.date < startStr || ev.date > endStr) return false;
      const key = `${ev.kind}:${ev.id}:${ev.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const byDate = {};
    events.forEach((ev) => { (byDate[ev.date] = byDate[ev.date] || []).push(ev); });
    const todayStr = today();
    const days = [];
    let anyToday = false;
    for (let i = 0; i < 7; i++) {
      const ds = dateString(addDays(weekStartDate, i));
      const dateObj = parseDate(ds);
      const layout = layoutTimelineEvents(byDate[ds] || []);
      const isToday = ds === todayStr;
      if (isToday) anyToday = true;
      days.push({ ds, dateObj, layout, isToday });
    }
    const label = `${formatDate(startStr)} – ${formatDate(endStr)}`;
    const dayHeads = days.map((d) => `
      <button type="button" class="cal-week-dayhead ${d.isToday ? "is-today" : ""}" data-action="select-calendar-day" data-date="${escapeHtml(d.ds)}">
        <span class="cal-week-dow">${new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(d.dateObj)}</span>
        <span class="cal-week-dom">${Number(d.ds.slice(8))}</span>
      </button>`).join("");
    const allDayCells = days.map((d) => `
      <div class="cal-week-allday-cell">
        ${d.layout.allDay.slice(0, 2).map((ev) => `<button type="button" class="cal-allday-chip mini" data-action="${escapeHtml(ev.action)}" data-id="${escapeHtml(ev.id)}" style="--class-color:${escapeHtml(ev.color)}; --class-color-rgb:${rgbText(ev.color)}"><span>${escapeHtml(ev.title)}</span></button>`).join("")}
        ${d.layout.allDay.length > 2 ? `<span class="cal-week-more">+${d.layout.allDay.length - 2}</span>` : ""}
      </div>`).join("");
    const cols = days.map((d) => `
      <div class="cal-tl-col ${d.isToday ? "is-today" : ""}">
        ${d.layout.timed.map(renderTimelineEvent).join("")}
      </div>`).join("");
    return `
      ${calendarPeriodHeader(label)}
      <div class="cal-timeline-scroll cal-week-scroll" data-timeline>
        <div class="cal-week-headrow">
          <span class="cal-hour-spacer"></span>
          <div class="cal-week-dayheads">${dayHeads}</div>
        </div>
        <div class="cal-week-alldayrow">
          <span class="cal-hour-spacer">All</span>
          <div class="cal-week-alldays">${allDayCells}</div>
        </div>
        <div class="cal-timeline cal-timeline-week" style="--hour-h:${CAL_HOUR_HEIGHT}px; --tl-h:${CAL_HOUR_HEIGHT * 24}px">
          ${renderHourGutter()}
          <div class="cal-tl-cols cal-tl-cols-week">
            ${anyToday ? renderNowLine() : ""}
            ${cols}
          </div>
        </div>
      </div>
    `;
  }

  function scrollCalendarTimeline() {
    const scroller = app.querySelector("[data-timeline]");
    if (!scroller) return;
    window.requestAnimationFrame(() => {
      const nowLine = scroller.querySelector(".cal-now-line");
      if (nowLine) {
        const r1 = nowLine.getBoundingClientRect();
        const r0 = scroller.getBoundingClientRect();
        scroller.scrollTop += (r1.top - r0.top) - scroller.clientHeight * 0.38;
      } else {
        scroller.scrollTop = scroller.scrollHeight * (7 / 24);
      }
    });
  }

  function scheduleHorizonEvents(days = 45) {
    const horizon = { start: today(), end: dateString(addDays(new Date(), days)), label: "horizon" };
    const events = [];
    appData.school.assignments.forEach((a) => {
      if (!a.dueDate || assignmentComplete(a) || !dateInRange(a.dueDate, horizon)) return;
      const klass = findById(appData.school.classes, a.classId);
      events.push({ id: a.id, kind: "assignment", date: a.dueDate, start: a.dueTime || "", title: a.title, color: safeHexColor(klass?.accentColor, CALENDAR_KIND_COLORS.assignment), meta: a.classId ? className(a.classId) : "Assignment" });
    });
    appData.tasks.forEach((t) => {
      if (!t.dueDate || t.completed || !dateInRange(t.dueDate, horizon)) return;
      const timed = Boolean(t.startTime);
      events.push({ id: t.id, kind: timed ? "meeting" : "task", date: t.dueDate, start: t.startTime || "", title: t.title, color: t.color ? safeHexColor(t.color, timed ? CALENDAR_KIND_COLORS.meeting : CALENDAR_KIND_COLORS.task) : (timed ? CALENDAR_KIND_COLORS.meeting : CALENDAR_KIND_COLORS.task), meta: timed ? "Meeting" : (t.category || "Task") });
    });
    appData.reminders.forEach((r) => {
      if (!r.date || r.completed || !dateInRange(r.date, horizon)) return;
      events.push({ id: r.id, kind: "reminder", date: r.date, start: r.time || "", title: r.title || "Reminder", color: CALENDAR_KIND_COLORS.reminder, meta: r.type || "Reminder" });
    });
    appData.finance.bills.forEach((bill) => {
      billOccurrencesInRange(bill, horizon).forEach((occ) => {
        if (occ.paid) return;
        events.push({ id: bill.id, kind: "bill", date: occ.date, start: "", title: bill.name || "Bill", color: safeHexColor(bill.color, CALENDAR_KIND_COLORS.bill), meta: formatCurrency(occ.amount) });
      });
    });
    appData.gym.workouts.forEach((w) => {
      if (!w.date || !dateInRange(w.date, horizon)) return;
      events.push({ id: w.id, kind: "workout", date: w.date, start: w.startTime || "", title: `${w.split || "Workout"}`, color: CALENDAR_KIND_COLORS.workout, meta: w.duration ? `${w.duration} min` : "Workout" });
    });
    return events.sort((a, b) => {
      const byDate = String(a.date).localeCompare(String(b.date));
      if (byDate !== 0) return byDate;
      const am = timeToMinutes(a.start);
      const bm = timeToMinutes(b.start);
      if (am === null && bm === null) return 0;
      if (am === null) return 1;
      if (bm === null) return -1;
      return am - bm;
    });
  }

  function renderTodaySchedule() {
    const events = scheduleHorizonEvents(45);
    const todayStr = today();
    const todayItems = events.filter((ev) => ev.date === todayStr);
    const shown = (todayItems.length ? todayItems : events).slice(0, 4);
    const heading = todayItems.length ? "Today's schedule" : "Up next";
    return `
      <section class="card panel section today-schedule-card">
        <div class="section-header">
          <div>
            <h2>${heading}</h2>
            <span class="tiny">${todayItems.length ? `${todayItems.length} scheduled today` : "Nothing today — next items"}</span>
          </div>
          <button type="button" class="today-schedule-link" data-action="go-calendar">Calendar ${icon("chevron")}</button>
        </div>
        ${shown.length ? `<div class="today-schedule-list">${shown.map((ev) => {
          const time = formatTime(ev.start);
          const when = ev.date === todayStr ? (time || "Today") : `${formatDate(ev.date)}${time ? ` · ${time}` : ""}`;
          return `
            <button type="button" class="today-schedule-item" style="--class-color:${escapeHtml(ev.color)}" data-action="show-up-next" data-id="${escapeHtml(ev.id)}" data-kind="${escapeHtml(ev.kind)}">
              <span class="today-schedule-dot"></span>
              <span class="today-schedule-main">
                <span class="today-schedule-title">${escapeHtml(ev.title)}</span>
                <span class="today-schedule-sub">
                  <span class="today-schedule-when">${escapeHtml(when)}</span>
                  ${ev.meta ? `<span class="today-schedule-meta">${escapeHtml(ev.meta)}</span>` : ""}
                </span>
              </span>
              <span class="today-schedule-go">${icon("chevron")}</span>
            </button>
          `;
        }).join("")}</div>` : `<p class="tiny">No upcoming scheduled items. Add a task with a time or an assignment to see it here.</p>`}
      </section>
    `;
  }

  const UP_NEXT_KIND_LABEL = { assignment: "Assignment", task: "Task", meeting: "Meeting", reminder: "Reminder", bill: "Bill", workout: "Workout" };

  function openUpNextDetail(ev) {
    const time = formatTime(ev.start);
    const whenLine = `${formatLongDate(ev.date)}${time ? ` · ${time}` : ""}`;
    const rows = [
      ["Type", UP_NEXT_KIND_LABEL[ev.kind] || "Item"],
      ["When", whenLine],
      ev.meta ? ["Details", ev.meta] : null
    ].filter(Boolean);
    const body = `
      <div class="up-next-detail" style="--class-color:${escapeHtml(ev.color || "var(--accent)")}">
        <p class="up-next-detail-title">${escapeHtml(ev.title)}</p>
        <div class="up-next-detail-rows">
          ${rows.map(([label, value]) => `<div class="up-next-detail-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
        </div>
      </div>
    `;
    const footer = `
      <button type="button" class="secondary" data-action="close-modal">Close</button>
      <button type="button" class="primary" data-action="up-next-go" data-id="${escapeHtml(ev.id)}" data-kind="${escapeHtml(ev.kind)}">Take me there</button>
    `;
    openDetailModal(ev.title, body, footer);
  }

  function openDetailModal(title, bodyHtml, footerHtml = "") {
    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal modal-detail">
          <div class="modal-header">
            <h2 class="modal-title">${escapeHtml(title)}</h2>
            ${actionButton("close-modal", "", "Close", "x")}
          </div>
          <div class="modal-body">${bodyHtml}</div>
          ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
        </div>
      </div>
    `;
    lockBodyScroll();
  }

  function navigateToKind(kind, id) {
    window.scrollTo({ top: 0, behavior: "auto" });
    if (kind === "assignment") {
      ui.activeTab = "school";
      const a = findById(appData.school.assignments, id);
      if (a && a.classId && findById(appData.school.classes, a.classId)) {
        ui.schoolView = "class";
        ui.selectedClassId = a.classId;
      } else {
        ui.schoolView = "overview";
      }
    } else if (kind === "task" || kind === "meeting") {
      ui.activeTab = "tasks";
    } else if (kind === "bill") {
      ui.activeTab = "finance";
    } else if (kind === "workout") {
      ui.activeTab = "health";
      ui.healthView = "workouts";
    } else {
      ui.activeTab = "calendar";
    }
    render();
  }

  function sortCalendarEvents(events) {
    return [...events].sort((a, b) => {
      const am = timeToMinutes(a.start);
      const bm = timeToMinutes(b.start);
      if (am === null && bm === null) return 0;
      if (am === null) return 1;
      if (bm === null) return -1;
      return am - bm;
    });
  }

  function renderCalendarEventRow(ev) {
    const start = formatTime(ev.start);
    const end = formatTime(ev.end);
    const timeLabel = start && end ? `${start} – ${end}` : start || "All day";
    const state = ev.complete ? "complete" : ev.overdue ? "overdue" : "";
    const kindLabel = { assignment: "Assignment", task: "Task", meeting: "Meeting", bill: "Bill", reminder: "Reminder", workout: "Workout" }[ev.kind] || "";
    return `
      <button type="button" class="cal-event cal-event-row ${state}" data-action="${escapeHtml(ev.action)}" data-id="${escapeHtml(ev.id)}" style="--class-color:${escapeHtml(ev.color)}; --class-color-rgb:${rgbText(ev.color)}">
        <span class="cal-event-time">${escapeHtml(timeLabel)}</span>
        <span class="cal-event-main">
          <span class="cal-event-title">${escapeHtml(ev.title)}</span>
          <span class="cal-event-meta">${escapeHtml([kindLabel, ev.meta].filter(Boolean).join(" · "))}</span>
        </span>
        <span class="cal-event-dot ${state}"></span>
      </button>
    `;
  }

  function assignmentStatusControl(assignmentId, status) {
    return `
      <div class="assignment-status-control" role="group" aria-label="Assignment status">
        <span class="tiny">Status</span>
        <div class="assignment-status-options">
          ${assignmentStatusOptions().map((option) => `
            <button type="button" class="assignment-status-option ${status === option.value ? "active" : ""}" data-action="set-assignment-status" data-id="${escapeHtml(assignmentId)}" data-assignment-next-status="${escapeHtml(option.value)}" aria-pressed="${status === option.value ? "true" : "false"}">
              ${escapeHtml(option.label)}
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  let notesFocusPending = false;

  function noteTimeLabel(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
  }

  function notesFolderName(id) {
    if (id === "all") return "All Notes";
    if (id === "pinned") return "Pinned";
    if (id === "unfiled") return "Unfiled";
    return findById(appData.notes.folders, id)?.name || "All Notes";
  }

  function noteSnippet(note) {
    const text = String(note.body || "").replace(/\s+/g, " ").trim();
    return text.length > 100 ? `${text.slice(0, 100)}…` : text;
  }

  function renderNotes() {
    const editing = ui.notesEditingId ? findById(appData.notes.items, ui.notesEditingId) : null;
    if (editing) return renderNoteEditor(editing);
    return renderNotesList();
  }

  function renderNotesList() {
    const folders = appData.notes.folders || [];
    const allNotes = appData.notes.items || [];
    let filter = ui.notesFolderId || "all";
    if (!["all", "pinned", "unfiled"].includes(filter) && !findById(folders, filter)) filter = "all";

    let notes = allNotes;
    if (filter === "pinned") notes = allNotes.filter((n) => n.pinned);
    else if (filter === "unfiled") notes = allNotes.filter((n) => !n.folderId);
    else if (filter !== "all") notes = allNotes.filter((n) => n.folderId === filter);

    const query = String(ui.notesSearch || "").trim().toLowerCase();
    if (query) {
      notes = notes.filter((n) => `${n.title || ""} ${n.body || ""}`.toLowerCase().includes(query));
    }

    const sorted = [...notes].sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const pinned = sorted.filter((n) => n.pinned);
    const others = sorted.filter((n) => !n.pinned);

    const chips = [
      { id: "all", label: "All Notes" },
      { id: "pinned", label: "Pinned" },
      ...folders.map((f) => ({ id: f.id, label: f.name, color: f.color, folder: true })),
      { id: "unfiled", label: "Unfiled" }
    ];
    const chipRow = `
      <div class="notes-folder-row" role="group" aria-label="Note folders">
        ${chips.map((c) => `
          <button type="button" class="note-chip ${filter === c.id ? "active" : ""}" data-action="set-notes-folder" data-folder="${escapeHtml(c.id)}" ${c.color ? `style="--class-color:${escapeHtml(c.color)}; --class-color-rgb:${rgbText(c.color)}"` : ""}>
            ${c.folder ? icon("folder") : ""}<span>${escapeHtml(c.label)}</span>
          </button>`).join("")}
      </div>`;

    const search = `
      <div class="notes-search">
        <span class="notes-search-ic">${icon("search")}</span>
        <input type="search" class="notes-search-input" data-notes-search placeholder="Search notes…" value="${escapeHtml(ui.notesSearch || "")}" aria-label="Search notes">
      </div>`;

    const isFolder = !["all", "pinned", "unfiled"].includes(filter);
    const listHtml = sorted.length ? `
      ${pinned.length ? `<div class="notes-group-label">${icon("pin")}<span>Pinned</span></div><div class="note-row-group">${pinned.map(renderNoteRow).join("")}</div>` : ""}
      ${others.length ? `${pinned.length ? `<div class="notes-group-label"><span>Recent</span></div>` : ""}<div class="note-row-group">${others.map(renderNoteRow).join("")}</div>` : ""}
    ` : emptyState(query ? "No notes match your search." : "No notes here yet. Tap “New note” to start one.");

    return `
      <div class="view">
        ${topbar("Notes", "", `${actionButton("add-note-folder", "", "New folder", "folder", "secondary")}${actionButton("new-note", "", "New note", "plus", "primary")}`)}
        ${search}
        ${chipRow}
        ${isFolder ? `<div class="notes-folder-actions">${actionButton("edit-note-folder", filter, "Rename", "edit", "secondary")}${actionButton("delete-note-folder", filter, "Delete folder", "trash", "secondary")}</div>` : ""}
        <section class="notes-list">${listHtml}</section>
      </div>
    `;
  }

  function renderNoteRow(note) {
    const folder = note.folderId ? findById(appData.notes.folders, note.folderId) : null;
    const meta = [noteTimeLabel(note.updatedAt), folder ? folder.name : ""].filter(Boolean).join(" · ");
    const snippet = noteSnippet(note);
    const color = safeHexColor(note.color, "");
    const colorStyle = color ? ` style="--class-color:${color}; --class-color-rgb:${rgbText(color)};"` : "";
    return `
      <div class="note-row${color ? " has-color" : ""}${recentPinId === note.id ? " just-toggled" : ""}"${colorStyle} role="button" tabindex="0" data-action="open-note" data-id="${escapeHtml(note.id)}">
        <div class="note-row-main">
          <p class="note-row-title">${escapeHtml(note.title || "Untitled note")}</p>
          <p class="note-row-snippet${snippet ? "" : " muted-note"}">${escapeHtml(snippet || "No additional text")}</p>
          ${meta ? `<span class="note-row-meta">${escapeHtml(meta)}</span>` : ""}
        </div>
        ${actionButton("toggle-note-pin", note.id, note.pinned ? "Unpin" : "Pin", "pin", `icon-btn note-pin-btn${note.pinned ? " pinned" : ""}${recentPinId === note.id ? " just-toggled" : ""}`)}
      </div>`;
  }

  function renderNoteCard(note) {
    const color = safeHexColor(note.color, "");
    const folder = note.folderId ? findById(appData.notes.folders, note.folderId) : null;
    const colorClass = color ? " has-bill-color" : "";
    const colorStyle = color ? ` style="--bill-color:${color}; --bill-color-rgb:${rgbText(color)};"` : "";
    const meta = [folder ? folder.name : "", noteTimeLabel(note.updatedAt)].filter(Boolean);
    const snippet = noteSnippet(note);
    return `
      <article class="item-card note-card${colorClass}${recentPinId === note.id ? " just-toggled" : ""}"${colorStyle} role="button" tabindex="0" data-action="open-note" data-id="${escapeHtml(note.id)}">
        <div class="item-main">
          <p class="item-title">${note.pinned ? `<span class="note-pin-dot">${icon("pin")}</span>` : ""}${escapeHtml(note.title || "Untitled note")}</p>
          ${snippet ? `<p class="tiny note-snippet">${escapeHtml(snippet)}</p>` : `<p class="tiny note-snippet muted-note">No additional text</p>`}
          ${meta.length ? `<div class="item-meta">${meta.map((m) => `<span>${escapeHtml(m)}</span>`).join("")}</div>` : ""}
        </div>
        <div class="item-actions">
          ${actionButton("toggle-note-pin", note.id, note.pinned ? "Unpin" : "Pin", "pin", `icon-btn note-pin-btn${note.pinned ? " pinned" : ""}${recentPinId === note.id ? " just-toggled" : ""}`)}
          ${actionButton("delete-note", note.id, "Delete", "trash")}
        </div>
      </article>`;
  }

  function renderNoteEditor(note) {
    const folders = appData.notes.folders || [];
    const accent = safeHexColor(note.color, "") || "var(--accent)";
    const accentVar = `--note-accent:${accent};`;
    const editing = Boolean(ui.noteEditMode);

    if (!editing) {
      const folder = note.folderId ? findById(appData.notes.folders, note.folderId) : null;
      const meta = [folder ? folder.name : "", `Edited ${noteTimeLabel(note.updatedAt)}`].filter(Boolean).join(" · ");
      const hasBody = String(note.body || "").trim().length > 0;
      return `
        <div class="view note-doc-view note-read${recentPinId === note.id ? " just-toggled" : ""}" style="${accentVar}">
          <div class="note-doc-bar">
            <button type="button" class="back-link" data-action="notes-back">${icon("chevron")}<span>Notes</span></button>
            <div class="note-doc-tools">
              ${actionButton("toggle-note-pin", note.id, note.pinned ? "Unpin" : "Pin", "pin", `icon-btn note-pin-btn${note.pinned ? " pinned" : ""}${recentPinId === note.id ? " just-toggled" : ""}`)}
              <button type="button" class="note-edit-btn" data-action="enter-note-edit" data-id="${escapeHtml(note.id)}">${icon("edit")}<span>Edit</span></button>
            </div>
          </div>
          <article class="note-sheet" role="button" tabindex="0" data-action="enter-note-edit" data-id="${escapeHtml(note.id)}">
            <h1 class="note-doc-title${note.title ? "" : " is-empty"}">${escapeHtml(note.title || "Untitled note")}</h1>
            ${meta ? `<div class="note-doc-meta">${escapeHtml(meta)}</div>` : ""}
            ${hasBody
              ? `<div class="note-doc-body">${escapeHtml(note.body)}</div>`
              : `<div class="note-doc-body note-doc-empty">Tap to start writing…</div>`}
          </article>
        </div>
      `;
    }

    const swatches = ["", ...colorSwatches];
    return `
      <div class="view note-doc-view note-edit${recentPinId === note.id ? " just-toggled" : ""}" style="${accentVar}">
        <div class="note-doc-bar">
          <button type="button" class="back-link" data-action="notes-back">${icon("chevron")}<span>Notes</span></button>
          <div class="note-doc-tools">
            ${actionButton("delete-note", note.id, "Delete", "trash")}
            <button type="button" class="note-done-pill" data-action="note-done-edit" data-id="${escapeHtml(note.id)}">${icon("check")}<span>Done</span></button>
          </div>
        </div>
        <div class="note-edit-meta">
          <div class="note-color-row" role="group" aria-label="Note color">
            ${swatches.map((c) => {
              const active = safeHexColor(note.color, "") === c || (!note.color && !c);
              return `<button type="button" class="note-swatch ${active ? "active" : ""} ${c ? "" : "note-swatch-none"}" data-action="set-note-color" data-id="${escapeHtml(note.id)}" data-color="${escapeHtml(c)}" ${c ? `style="background:${escapeHtml(c)}"` : ""} aria-label="${c ? c : "No color"}"></button>`;
            }).join("")}
          </div>
          <select class="note-folder-select" data-note-field="folderId" data-id="${escapeHtml(note.id)}" aria-label="Folder">
            <option value="" ${!note.folderId ? "selected" : ""}>No folder</option>
            ${folders.map((f) => `<option value="${escapeHtml(f.id)}" ${note.folderId === f.id ? "selected" : ""}>${escapeHtml(f.name)}</option>`).join("")}
          </select>
        </div>
        <article class="note-sheet note-sheet-edit">
          <input type="text" class="note-title-input" data-note-field="title" data-id="${escapeHtml(note.id)}" placeholder="Title" value="${escapeHtml(note.title)}">
          <textarea class="note-body-input" data-note-field="body" data-id="${escapeHtml(note.id)}" placeholder="Start writing…">${escapeHtml(note.body)}</textarea>
        </article>
        <p class="tiny note-saved-hint" data-note-saved>Saved · ${escapeHtml(noteTimeLabel(note.updatedAt))}</p>
      </div>
    `;
  }

  function setupNotesEditor() {
    const view = app.querySelector(".note-doc-view");
    if (!view) return;
    const noteId = view.querySelector("[data-note-field]")?.dataset.id;
    if (!noteId) return; // read mode has no editable fields
    const note = findById(appData.notes.items, noteId);
    if (!note) return;
    const hint = view.querySelector("[data-note-saved]");
    const persist = () => {
      note.updatedAt = nowIso();
      saveData();
      if (hint) hint.textContent = `Saved · ${noteTimeLabel(note.updatedAt)}`;
    };
    const body = view.querySelector(".note-body-input");
    const autoGrow = () => { if (body) { body.style.height = "auto"; body.style.height = `${body.scrollHeight}px`; } };
    view.querySelectorAll("[data-note-field]").forEach((el) => {
      const field = el.dataset.noteField;
      const handler = () => { note[field] = el.value; persist(); if (el === body) autoGrow(); };
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });
    autoGrow();
    if (notesFocusPending) {
      notesFocusPending = false;
      const target = note.title ? body : view.querySelector(".note-title-input");
      window.requestAnimationFrame(() => { try { target?.focus(); autoGrow(); } catch {} });
    }
  }

  const TRAVEL_WORLD_VB = "20 30 960 360";

  function findGeoCountryByCsv(csv) {
    if (!window.GEO) return null;
    return window.GEO.countries.find((c) => c.csv === csv) || null;
  }

  function travelCountryViewBox(csv) {
    const c = findGeoCountryByCsv(csv);
    if (!c || !c.b) return TRAVEL_WORLD_VB;
    let [x0, y0, x1, y1] = c.b;
    let w = Math.max(8, x1 - x0), h = Math.max(8, y1 - y0);
    const padX = w * 0.28 + 3, padY = h * 0.28 + 3;
    x0 -= padX; y0 -= padY; w += padX * 2; h += padY * 2;
    return `${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
  }

  function travelCityKey(country, city) {
    return `${country}::${city}`;
  }

  function travelCityCoord(key) {
    const sep = key.indexOf("::");
    if (sep < 0) return null;
    const prefix = key.slice(0, sep), city = key.slice(sep + 2);
    let ct = (window.GEO.cities[prefix] || []).find((x) => x.n === city);
    if (!ct && window.GEO.usStates && window.GEO.usStates[prefix]) ct = window.GEO.usStates[prefix].cities.find((x) => x.n === city);
    return ct || null;
  }

  function travelStateViewBox(state) {
    const s = window.GEO.usStates && window.GEO.usStates[state];
    if (!s || !s.b) return TRAVEL_WORLD_VB;
    let [x0, y0, x1, y1] = s.b;
    let w = Math.max(8, x1 - x0), h = Math.max(8, y1 - y0);
    const padX = w * 0.3 + 4, padY = h * 0.3 + 4;
    x0 -= padX; y0 -= padY; w += padX * 2; h += padY * 2;
    return `${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
  }

  function renderTravel() {
    if (!window.GEO) {
      return `<div class="view">${topbar("Travel", "Countries visited")}<p class="tiny">Map data is still loading. Pull to refresh if this persists.</p></div>`;
    }
    const visited = appData.travel.countries || {};
    const total = window.GEO.countryList.length;
    const visitedCount = window.GEO.countryList.filter((name) => visited[name]).length;
    // A country can be focused even if it has no border polygon (tiny microstates);
    // the map just stays at world view while its panel/cities still open.
    const focus = ui.travelFocus && window.GEO.countryList.includes(ui.travelFocus) ? ui.travelFocus : "";

    const paths = window.GEO.countries.map((c) => {
      const csv = c.csv;
      const isVisited = csv && visited[csv];
      const classes = ["geo-country"];
      if (isVisited) classes.push("visited");
      if (focus && csv === focus) classes.push("focused");
      if (focus && csv !== focus) classes.push("dimmed");
      const act = csv ? ` data-action="travel-open" data-country="${escapeHtml(csv)}" role="button" tabindex="-1"` : "";
      return `<path class="${classes.join(" ")}" d="${c.d}" vector-effect="non-scaling-stroke"${act}></path>`;
    }).join("");

    const isUS = focus === "United States";
    const stateFocus = isUS && ui.travelStateFocus && window.GEO.usStates && window.GEO.usStates[ui.travelStateFocus] ? ui.travelStateFocus : "";

    const targetVB = stateFocus ? travelStateViewBox(stateFocus) : (focus ? travelCountryViewBox(focus) : (travelManualVB || TRAVEL_WORLD_VB));
    // Dot radius scales with the zoom so dots look the same size in any country,
    // and stays small/subtle. Dots only render when a country/state is in focus.
    const vbW = Number(targetVB.split(/\s+/)[2]) || 960;
    const rBase = Math.max(0.35, vbW * 0.0085);
    const dotFor = (ct) => {
      const r = (ct.cap ? rBase * 1.25 : rBase).toFixed(2);
      return `<circle class="geo-city ${ct.cap ? "capital" : ""}" cx="${ct.x}" cy="${ct.y}" r="${r}" vector-effect="non-scaling-stroke"></circle>`;
    };
    let dots = "";
    if (stateFocus) {
      const cities = window.GEO.usStates[stateFocus].cities || [];
      dots = cities.filter((ct) => appData.travel.cities[travelCityKey(stateFocus, ct.n)]).map(dotFor).join("");
    } else if (isUS) {
      Object.keys(window.GEO.usStates || {}).forEach((st) => {
        window.GEO.usStates[st].cities.forEach((ct) => {
          if (appData.travel.cities[travelCityKey(st, ct.n)]) dots += dotFor(ct);
        });
      });
    } else if (focus) {
      const cities = window.GEO.cities[focus] || [];
      dots = cities.filter((ct) => appData.travel.cities[travelCityKey(focus, ct.n)]).map(dotFor).join("");
    }
    // No dots on the full world map — only when focused on a country/state.

    // US state borders — only drawn while the US is focused (never on the world map).
    let statePaths = "";
    if (isUS && window.GEO.usStates) {
      statePaths = Object.keys(window.GEO.usStates).map((st) => {
        const s = window.GEO.usStates[st];
        if (!s.d) return "";
        const cls = ["geo-state"];
        if (appData.travel.states[st]) cls.push("visited");
        if (stateFocus && st === stateFocus) cls.push("focused");
        if (stateFocus && st !== stateFocus) cls.push("dimmed");
        return `<path class="${cls.join(" ")}" d="${s.d}" vector-effect="non-scaling-stroke" data-action="travel-open-state" data-state="${escapeHtml(st)}" role="button" tabindex="-1"></path>`;
      }).join("");
    }
    const map = `
      <div class="travel-map-wrap">
        <svg class="travel-map" viewBox="${targetVB}" data-target-vb="${escapeHtml(targetVB)}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-label="World map">
          <g class="travel-map-g">${paths}${statePaths}${dots}</g>
        </svg>
        <div class="travel-zoom-controls">
          <button type="button" class="travel-zoom-btn" data-action="travel-zoom-in" aria-label="Zoom in">${icon("plus")}</button>
          <button type="button" class="travel-zoom-btn" data-action="travel-zoom-out" aria-label="Zoom out"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
          <button type="button" class="travel-zoom-btn" data-action="travel-zoom-reset" aria-label="Reset view">${icon("globe")}</button>
        </div>
      </div>`;

    const view = focus ? "map" : (ui.travelView === "trips" ? "trips" : "map");
    const toggle = focus ? "" : `
      <div class="seg-toggle travel-toggle" role="group" aria-label="Travel view">
        <button type="button" class="seg-btn ${view === "map" ? "active" : ""}" data-action="set-travel-view" data-travel-view="map">${icon("globe")}<span>Map</span></button>
        <button type="button" class="seg-btn ${view === "trips" ? "active" : ""}" data-action="set-travel-view" data-travel-view="trips">${icon("plane")}<span>Trips</span></button>
      </div>`;

    const mapBody = `
      <section class="card panel section travel-card">
        ${map}
        <p class="tiny travel-hint">${focus ? "Pinch or use +/− to zoom · drag to pan" : "Tap a country or use the list below · pinch/scroll to zoom"}</p>
      </section>
      ${focus ? renderTravelCountryPanel(focus) : `
        <div class="sec-head"><span class="sec-title">Progress</span></div>
        <div class="travel-stats">
          <div class="travel-stat"><span class="travel-stat-n travel-stat-accent">${visitedCount}</span><span class="travel-stat-l">Visited</span></div>
          <div class="travel-stat"><span class="travel-stat-n">${total - visitedCount}</span><span class="travel-stat-l">To go</span></div>
          <div class="travel-stat"><span class="travel-stat-n">${pct(visitedCount, total)}%</span><span class="travel-stat-l">of world</span></div>
        </div>
      `}
      ${renderTravelList()}`;

    return `
      <div class="view travel-view">
        ${focus ? `<button type="button" class="back-link" data-action="travel-back">${icon("chevron")}<span>World map</span></button>` : ""}
        ${topbar("Travel", `${visitedCount} of ${total} countries visited`)}
        ${toggle}
        ${view === "trips" ? renderTravelTrips() : mapBody}
      </div>
    `;
  }

  function renderTravelList() {
    const visited = appData.travel.countries || {};
    const names = [...window.GEO.countryList].sort((a, b) => a.localeCompare(b));
    return `
      <section class="card panel section travel-list-card">
        <div class="section-header"><h2>All countries</h2></div>
        <input id="travel-search" class="travel-search" type="text" placeholder="Search countries…" autocomplete="off">
        <div class="travel-list" data-travel-list>
          ${names.map((name) => {
            const v = visited[name];
            return `<button type="button" class="travel-list-row ${v ? "visited" : ""} ${ui.travelFocus === name ? "active" : ""}" data-action="travel-open" data-country="${escapeHtml(name)}" data-name="${escapeHtml(name.toLowerCase())}">
              <span class="travel-list-dot"></span>
              <span class="travel-list-name">${escapeHtml(name)}</span>
              ${v ? `<span class="travel-list-check">${icon("check")}</span>` : ""}
            </button>`;
          }).join("")}
        </div>
      </section>
    `;
  }

  function travelVisitBtn(action, key, dataAttr, value, isVisited, animKey) {
    const anim = recentVisitKey === animKey ? " just-visited" : "";
    return `<button type="button" class="${isVisited ? "secondary active" : "primary"} travel-visit-btn${anim}" data-action="${action}" data-${dataAttr}="${escapeHtml(value)}">${icon(isVisited ? "done" : "plus")}<span>${isVisited ? "Visited" : "Mark visited"}</span></button>`;
  }

  // ---------- Trip planner + automatic mileage ----------
  // City map coords are an equirectangular projection of a 1000×500 world, so we
  // can invert them to lat/long and compute real great-circle distances.
  function cityLatLng(x, y) {
    return { lat: 90 - (y / 500) * 180, lng: (x / 1000) * 360 - 180 };
  }

  function haversineMiles(a, b) {
    const R = 3958.8; // Earth radius in miles
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  let travelCityIndexCache = null;
  function travelCityIndex() {
    if (travelCityIndexCache) return travelCityIndexCache;
    const out = [];
    if (window.GEO && window.GEO.cities) {
      Object.entries(window.GEO.cities).forEach(([country, list]) => {
        (list || []).forEach((c) => out.push({ name: c.n, country, x: c.x, y: c.y }));
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name) || a.country.localeCompare(b.country));
    travelCityIndexCache = out;
    return out;
  }

  function travelCityOptions() {
    return [{ value: "", label: "Select a city…" }, ...travelCityIndex().map((c) => ({ value: `${c.country}||${c.name}`, label: `${c.name}, ${c.country}` }))];
  }

  function resolveTravelCity(value) {
    if (!value) return null;
    const [country, name] = String(value).split("||");
    const found = travelCityIndex().find((c) => c.country === country && c.name === name);
    return found ? { name: found.name, country: found.country, x: found.x, y: found.y } : null;
  }

  function legMiles(leg) {
    if (!leg || !leg.from || !leg.to) return 0;
    const one = haversineMiles(cityLatLng(leg.from.x, leg.from.y), cityLatLng(leg.to.x, leg.to.y));
    return leg.roundTrip ? one * 2 : one;
  }

  function tripMiles(trip) {
    return (trip.legs || []).reduce((sum, leg) => sum + legMiles(leg), 0);
  }

  function travelTotalMiles() {
    return (appData.travel.trips || []).reduce((sum, trip) => sum + tripMiles(trip), 0);
  }

  function tripDateLabel(trip) {
    if (trip.startDate && trip.endDate) return `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`;
    if (trip.startDate) return formatDate(trip.startDate);
    if (trip.endDate) return `Until ${formatDate(trip.endDate)}`;
    return "No dates set";
  }

  function tripFields(initial = {}) {
    return [
      { name: "name", label: "Trip name", required: true, default: initial.name || "" },
      { name: "startDate", label: "Start date", type: "date", default: initial.startDate || "" },
      { name: "endDate", label: "End date", type: "date", default: initial.endDate || "" },
      { name: "notes", label: "Notes", type: "textarea", default: initial.notes || "" }
    ];
  }

  function legFields(initial = {}) {
    return [
      { name: "from", label: "From", type: "select", options: travelCityOptions(), default: initial.from ? `${initial.from.country}||${initial.from.name}` : "" },
      { name: "to", label: "To", type: "select", options: travelCityOptions(), default: initial.to ? `${initial.to.country}||${initial.to.name}` : "" },
      { name: "roundTrip", label: "Round trip (count the return miles too)", type: "checkbox", default: initial.roundTrip !== false }
    ];
  }

  function renderTravelTrips() {
    const trips = appData.travel.trips || [];
    const totalMiles = travelTotalMiles();
    const legCount = trips.reduce((n, t) => n + (t.legs || []).length, 0);
    const stats = `
      <div class="travel-stats trip-stats">
        <div class="travel-stat"><span class="travel-stat-n travel-stat-accent">${formatNumber(Math.round(totalMiles))}</span><span class="travel-stat-l">Miles</span></div>
        <div class="travel-stat"><span class="travel-stat-n">${trips.length}</span><span class="travel-stat-l">Trips</span></div>
        <div class="travel-stat"><span class="travel-stat-n">${legCount}</span><span class="travel-stat-l">Flights</span></div>
      </div>`;
    const list = trips.length
      ? trips.map(renderTripCard).join("")
      : `<div class="card panel">${emptyState("No trips yet. Add a trip, then add city-to-city legs — miles are calculated automatically.")}</div>`;
    return `
      <div class="sec-head"><span class="sec-title">Your trips</span>${actionButton("add-trip", "", "Add trip", "plus", "secondary")}</div>
      ${stats}
      <section class="trip-list">${list}</section>
    `;
  }

  function renderTripCard(trip) {
    const miles = Math.round(tripMiles(trip));
    const legs = trip.legs || [];
    const legHtml = legs.length
      ? legs.map((leg) => `
        <div class="trip-leg">
          <span class="trip-leg-icon">${icon("plane")}</span>
          <span class="trip-leg-route">${escapeHtml(leg.from ? leg.from.name : "?")} <span class="trip-leg-arrow">${leg.roundTrip ? "⇄" : "→"}</span> ${escapeHtml(leg.to ? leg.to.name : "?")}</span>
          <span class="trip-leg-miles">${formatNumber(Math.round(legMiles(leg)))} mi</span>
          <button type="button" class="trip-leg-del" data-action="delete-trip-leg" data-id="${escapeHtml(trip.id)}" data-leg="${escapeHtml(leg.id)}" aria-label="Delete leg">${icon("x")}</button>
        </div>`).join("")
      : `<p class="tiny trip-empty-legs">No legs yet — add one to count miles.</p>`;
    return `
      <article class="trip-card">
        <div class="trip-head">
          <div class="trip-head-main">
            <h3 class="trip-name">${escapeHtml(trip.name || "Trip")}</h3>
            <span class="trip-dates">${escapeHtml(tripDateLabel(trip))}</span>
          </div>
          <span class="trip-miles">${formatNumber(miles)}<span class="trip-miles-unit">mi</span></span>
        </div>
        <div class="trip-legs">${legHtml}</div>
        ${trip.notes ? `<p class="tiny trip-notes">${escapeHtml(trip.notes)}</p>` : ""}
        <div class="trip-actions">
          ${actionButton("add-trip-leg", trip.id, "Add leg", "plus", "secondary")}
          ${actionButton("edit-trip", trip.id, "Edit", "edit", "secondary")}
          ${actionButton("delete-trip", trip.id, "Delete", "trash", "secondary")}
        </div>
      </article>
    `;
  }

  function renderTravelCountryPanel(csv) {
    if (csv === "United States" && window.GEO.usStates) return renderUSPanel();
    const isVisited = Boolean(appData.travel.countries[csv]);
    const cities = window.GEO.cities[csv] || [];
    const visitedCityCount = cities.filter((ct) => appData.travel.cities[travelCityKey(csv, ct.n)]).length;
    return `
      <section class="card panel section travel-panel">
        <div class="section-header">
          <div>
            <h2>${escapeHtml(csv)}</h2>
            <span class="tiny">${isVisited ? "Visited" : "Not visited yet"}${visitedCityCount ? ` · ${visitedCityCount} cit${visitedCityCount === 1 ? "y" : "ies"}` : ""}</span>
          </div>
          ${travelVisitBtn("toggle-visit-country", csv, "country", csv, isVisited, "c:" + csv)}
        </div>
        <h3 class="travel-cities-title">Cities you've been to</h3>
        <div class="travel-city-list">
          ${cities.length ? cities.map((ct) => {
            const on = Boolean(appData.travel.cities[travelCityKey(csv, ct.n)]);
            return `<button type="button" class="travel-city-chip ${on ? "on" : ""}" data-action="toggle-visit-city" data-country="${escapeHtml(csv)}" data-city="${escapeHtml(ct.n)}">
              <span class="travel-city-dot ${ct.cap ? "capital" : ""}"></span><span class="travel-city-name">${escapeHtml(ct.n)}</span>${ct.cap ? `<span class="travel-cap-tag">capital</span>` : ""}
            </button>`;
          }).join("") : `<p class="tiny">No cities listed for this country.</p>`}
        </div>
      </section>
    `;
  }

  function renderUSPanel() {
    if (ui.travelStateFocus && window.GEO.usStates[ui.travelStateFocus]) return renderStatePanel(ui.travelStateFocus);
    const isVisited = Boolean(appData.travel.countries["United States"]);
    const states = Object.keys(window.GEO.usStates).sort((a, b) => a.localeCompare(b));
    const visitedStates = states.filter((s) => appData.travel.states[s]).length;
    return `
      <section class="card panel section travel-panel">
        <div class="section-header">
          <div>
            <h2>United States</h2>
            <span class="tiny">${isVisited ? "Visited" : "Not visited yet"} · ${visitedStates}/${states.length} states</span>
          </div>
          ${travelVisitBtn("toggle-visit-country", "United States", "country", "United States", isVisited, "c:United States")}
        </div>
        <h3 class="travel-cities-title">States — tap to open</h3>
        <div class="travel-list travel-sub-list">
          ${states.map((s) => {
            const v = appData.travel.states[s];
            return `<button type="button" class="travel-list-row ${v ? "visited" : ""}" data-action="travel-open-state" data-state="${escapeHtml(s)}">
              <span class="travel-list-dot"></span><span class="travel-list-name">${escapeHtml(s)}</span>${v ? `<span class="travel-list-check">${icon("check")}</span>` : ""}
            </button>`;
          }).join("")}
        </div>
      </section>
    `;
  }

  function renderStatePanel(state) {
    const s = window.GEO.usStates[state];
    const isVisited = Boolean(appData.travel.states[state]);
    const cities = s.cities || [];
    const visitedCities = cities.filter((ct) => appData.travel.cities[travelCityKey(state, ct.n)]).length;
    return `
      <section class="card panel section travel-panel">
        <button type="button" class="back-link" data-action="travel-back-states">${icon("chevron")}<span>States</span></button>
        <div class="section-header">
          <div>
            <h2>${escapeHtml(state)}</h2>
            <span class="tiny">${isVisited ? "Visited" : "Not visited yet"}${visitedCities ? ` · ${visitedCities} cit${visitedCities === 1 ? "y" : "ies"}` : ""}</span>
          </div>
          ${travelVisitBtn("toggle-visit-state", state, "state", state, isVisited, "s:" + state)}
        </div>
        <h3 class="travel-cities-title">Cities you've been to</h3>
        <div class="travel-city-list">
          ${cities.map((ct) => {
            const on = Boolean(appData.travel.cities[travelCityKey(state, ct.n)]);
            return `<button type="button" class="travel-city-chip ${on ? "on" : ""}" data-action="toggle-visit-city" data-scope="state" data-country="${escapeHtml(state)}" data-city="${escapeHtml(ct.n)}">
              <span class="travel-city-dot ${ct.cap ? "capital" : ""}"></span><span class="travel-city-name">${escapeHtml(ct.n)}</span>${ct.cap ? `<span class="travel-cap-tag">capital</span>` : ""}
            </button>`;
          }).join("")}
        </div>
      </section>
    `;
  }

  function setupTravelMap() {
    const svg = app.querySelector(".travel-map");
    if (!svg) return;
    setupTravelSearch();
    setupTravelPanZoom(svg);
    const target = svg.dataset.targetVb;
    const from = lastTravelViewBox;
    lastTravelViewBox = target;
    if (!from || from === target) return;
    if (travelTweenRAF) window.cancelAnimationFrame(travelTweenRAF);
    const a = from.split(/\s+/).map(Number);
    const b = target.split(/\s+/).map(Number);
    if (a.length !== 4 || b.some((n) => isNaN(n))) { svg.setAttribute("viewBox", target); return; }
    const start = performance.now();
    const dur = 560;
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    svg.setAttribute("viewBox", from);
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const e = ease(t);
      const vb = a.map((v, i) => v + (b[i] - v) * e);
      svg.setAttribute("viewBox", vb.map((n) => n.toFixed(1)).join(" "));
      if (t < 1) travelTweenRAF = window.requestAnimationFrame(step);
    };
    travelTweenRAF = window.requestAnimationFrame(step);
  }

  function travelGetVB(svg) {
    const v = (svg.getAttribute("viewBox") || TRAVEL_WORLD_VB).split(/\s+/).map(Number);
    return { x: v[0], y: v[1], w: v[2], h: v[3] };
  }

  function travelClampVB(vb) {
    // Clamp zoom level and keep the view loosely within the world.
    const minW = 40, maxW = 1200;
    const w = Math.max(minW, Math.min(maxW, vb.w));
    const h = w * (360 / 960); // keep world aspect ratio
    const x = Math.max(-300, Math.min(1000 - w + 300, vb.x));
    const y = Math.max(-150, Math.min(500 - h + 150, vb.y));
    return { x, y, w, h };
  }

  function travelSetVB(svg, vb) {
    const c = travelClampVB(vb);
    const str = `${c.x.toFixed(1)} ${c.y.toFixed(1)} ${c.w.toFixed(1)} ${c.h.toFixed(1)}`;
    svg.setAttribute("viewBox", str);
    lastTravelViewBox = str;
    if (!ui.travelFocus) travelManualVB = str;
  }

  function travelAnimateVB(svg, targetVb, dur = 320) {
    if (travelTweenRAF) window.cancelAnimationFrame(travelTweenRAF);
    const a = travelGetVB(svg);
    const b = travelClampVB(targetVb);
    const start = performance.now();
    const ease = (p) => 1 - Math.pow(1 - p, 3);
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const e = ease(p);
      travelSetVB(svg, { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, w: a.w + (b.w - a.w) * e, h: a.h + (b.h - a.h) * e });
      if (p < 1) travelTweenRAF = window.requestAnimationFrame(step);
    };
    travelTweenRAF = window.requestAnimationFrame(step);
  }

  function travelZoomBy(factor, fx, fy, animate) {
    const svg = app.querySelector(".travel-map");
    if (!svg) return;
    const vb = travelGetVB(svg);
    const cx = fx == null ? vb.x + vb.w / 2 : fx;
    const cy = fy == null ? vb.y + vb.h / 2 : fy;
    const nw = vb.w * factor;
    const nh = vb.h * factor;
    // keep focal point stationary
    const nx = cx - (cx - vb.x) * (nw / vb.w);
    const ny = cy - (cy - vb.y) * (nh / vb.h);
    if (animate) travelAnimateVB(svg, { x: nx, y: ny, w: nw, h: nh }, 300);
    else { if (travelTweenRAF) window.cancelAnimationFrame(travelTweenRAF); travelSetVB(svg, { x: nx, y: ny, w: nw, h: nh }); }
  }

  function setupTravelPanZoom(svg) {
    const pointers = new Map();
    let panStart = null;
    let pinchStart = null;
    const toSvg = (clientX, clientY) => {
      const r = svg.getBoundingClientRect();
      const vb = travelGetVB(svg);
      return { x: vb.x + ((clientX - r.left) / r.width) * vb.w, y: vb.y + ((clientY - r.top) / r.height) * vb.h };
    };
    svg.addEventListener("pointerdown", (e) => {
      if (e.target.closest("[data-action]") && pointers.size === 0) return; // let taps through
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { svg.setPointerCapture(e.pointerId); } catch {}
      if (pointers.size === 1) { const vb = travelGetVB(svg); panStart = { px: e.clientX, py: e.clientY, vb }; }
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        pinchStart = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), vb: travelGetVB(svg), mid: toSvg((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2) };
        panStart = null;
      }
    });
    svg.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && pinchStart) {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        // Dampen so a small finger movement doesn't zoom dramatically.
        const factor = Math.pow(pinchStart.dist / Math.max(1, dist), 0.55);
        const nw = pinchStart.vb.w * factor;
        const nh = pinchStart.vb.h * factor;
        const nx = pinchStart.mid.x - (pinchStart.mid.x - pinchStart.vb.x) * (nw / pinchStart.vb.w);
        const ny = pinchStart.mid.y - (pinchStart.mid.y - pinchStart.vb.y) * (nh / pinchStart.vb.h);
        travelSetVB(svg, { x: nx, y: ny, w: nw, h: nh });
      } else if (pointers.size === 1 && panStart) {
        const r = svg.getBoundingClientRect();
        const dx = (e.clientX - panStart.px) / r.width * panStart.vb.w;
        const dy = (e.clientY - panStart.py) / r.height * panStart.vb.h;
        travelSetVB(svg, { x: panStart.vb.x - dx, y: panStart.vb.y - dy, w: panStart.vb.w, h: panStart.vb.h });
      }
    });
    const end = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = null;
      if (pointers.size === 0) panStart = null;
    };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
    svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const f = toSvg(e.clientX, e.clientY);
      travelZoomBy(e.deltaY > 0 ? 1.08 : 0.93, f.x, f.y);
    }, { passive: false });
  }

  function setupTravelSearch() {
    const input = app.querySelector("#travel-search");
    if (!input) return;
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      app.querySelectorAll("[data-travel-list] .travel-list-row").forEach((row) => {
        row.style.display = (!q || (row.dataset.name || "").includes(q)) ? "" : "none";
      });
    });
  }

  function renderMore() {
    const groups = [
      { label: "Tools", items: [
        { key: "shopping", label: "Shopping List", icon: "wallet", color: "var(--green)" },
        { key: "orders", label: "Order Tracking", icon: "package", color: "var(--cyan)" },
        { key: "bucket", label: "Bucket List", icon: "spark", color: "var(--purple)" }
      ]},
      { label: "App", items: [
        { key: "review", label: "Weekly Review", icon: "done", color: "var(--orange)" },
        { key: "settings", label: "Settings", icon: "settings", color: "var(--blue)" }
      ]}
    ];
    return `
      <div class="view">
        ${topbar("More", "")}
        ${groups.map((g) => `
          <div class="sec-head"><span class="sec-title">${escapeHtml(g.label)}</span></div>
          <section class="more-group" aria-label="${escapeHtml(g.label)}">
            ${g.items.map((view) => `
              <button type="button" class="more-row2 ${ui.moreView === view.key ? "active" : ""}" data-action="set-more-view" data-view="${escapeHtml(view.key)}">
                <span class="more-row2-ic" style="--ic:${view.color}">${icon(view.icon)}</span>
                <span class="more-row2-label">${escapeHtml(view.label)}</span>
                <span class="more-row2-arrow">${icon("chevron")}</span>
              </button>
            `).join("")}
          </section>
        `).join("")}
        <div class="more-content" data-more-content="${escapeHtml(ui.moreView)}">
          ${renderMoreView()}
        </div>
      </div>
    `;
  }

  function renderMoreView() {
    if (ui.moreView === "review") return renderWeeklyReview();
    if (ui.moreView === "settings") return renderSettings();
    if (ui.moreView === "bucket") return renderBucketList();
    if (ui.moreView === "orders") return renderOrders();
    return renderShopping();
  }

  const ORDER_STATUSES = ["Ordered", "Shipped", "In transit", "Out for delivery", "Delivered"];

  function orderFields() {
    return [
      { name: "name", label: "Item / order name", required: true },
      { name: "provider", label: "Carrier / store", placeholder: "USPS · UPS · FedEx · Amazon…" },
      { name: "trackingNumber", label: "Tracking number" },
      { name: "status", label: "Status", type: "select", options: ORDER_STATUSES },
      { name: "orderDate", label: "Order date", type: "date" },
      { name: "eta", label: "Estimated arrival", type: "date" },
      { name: "trackUrl", label: "Tracking link", type: "url", help: "Optional — paste the carrier's tracking URL to get a Track button." },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function renderOrderCard(order) {
    const status = ORDER_STATUSES.includes(order.status) ? order.status : "Ordered";
    const meta = [order.provider, order.trackingNumber ? `#${order.trackingNumber}` : "", order.eta ? `ETA ${formatDate(order.eta)}` : ""].filter(Boolean).join(" · ");
    return `
      <article class="order-card">
        <div class="order-card-main">
          <div class="order-card-top">
            <span class="order-name">${escapeHtml(order.name || "Order")}</span>
            <span class="order-status order-${slugKey(status)}">${escapeHtml(status)}</span>
          </div>
          ${meta ? `<div class="order-meta">${escapeHtml(meta)}</div>` : ""}
          ${order.notes ? `<p class="tiny order-notes">${escapeHtml(order.notes)}</p>` : ""}
        </div>
        <div class="order-actions">
          ${order.trackUrl ? `<a class="order-track" href="${escapeHtml(order.trackUrl)}" target="_blank" rel="noopener noreferrer">${icon("plane")}<span>Track</span></a>` : ""}
          ${actionButton("edit-order", order.id, "Edit", "edit")}
          ${actionButton("delete-order", order.id, "Delete", "trash")}
        </div>
      </article>
    `;
  }

  function renderOrders() {
    const orders = appData.orders || [];
    const active = orders.filter((o) => o.status !== "Delivered");
    const delivered = orders.filter((o) => o.status === "Delivered");
    const sortByEta = (list) => [...list].sort((a, b) => String(a.eta || "9999").localeCompare(String(b.eta || "9999")));
    return `
      <section class="section">
        <div class="section-header">
          <div>
            <h2>Order Tracking</h2>
            <span class="tiny">${active.length} in progress · ${delivered.length} delivered</span>
          </div>
          ${actionButton("add-order", "", "Add order", "plus", "primary")}
        </div>
        ${orders.length ? "" : emptyState("Keep packages in one place — add an order with its carrier and tracking number.")}
        ${active.length ? `<div class="order-list">${sortByEta(active).map(renderOrderCard).join("")}</div>` : ""}
        ${delivered.length ? `
          <details class="card finance-history">
            <summary><span>Delivered</span><span class="tiny">${delivered.length}</span></summary>
            <div class="details-body"><div class="order-list">${sortByEta(delivered).map(renderOrderCard).join("")}</div></div>
          </details>` : ""}
      </section>
    `;
  }

  function renderBucketList() {
    const items = appData.bucketList || [];
    const active = items.filter((i) => !i.done);
    const done = items.filter((i) => i.done);
    const renderItem = (item) => itemCard({
      title: item.text,
      meta: item.done && item.completedAt ? [`Done ${formatDate(dateString(new Date(item.completedAt)))}`] : [],
      className: item.done ? "complete" : "",
      actions: `${actionButton("toggle-bucket", item.id, item.done ? "Mark not done" : "Mark done", item.done ? "undo" : "check")}${actionButton("delete-bucket", item.id, "Delete", "trash")}`
    });
    return `
      <section class="section">
        <div class="section-header">
          <div>
            <h2>Bucket List</h2>
            <span class="tiny">${active.length} to do · ${done.length} done</span>
          </div>
        </div>
        <div class="card panel section">
          <div class="inline-form">
            <input id="bucket-input" type="text" placeholder="Something you want to do…" autocomplete="off">
            <button type="button" class="primary" data-action="add-bucket">${icon("plus")}<span>Add</span></button>
          </div>
        </div>
        <div class="card panel section">
          <h2>To do</h2>
          <div class="list">
            ${active.length ? active.map(renderItem).join("") : emptyState("Add something you'd love to do one day.")}
          </div>
        </div>
        <div class="card panel section">
          <h2>Completed</h2>
          <div class="list">
            ${done.length ? done.map(renderItem).join("") : emptyState("Completed bucket-list items will appear here.")}
          </div>
        </div>
      </section>
    `;
  }

  function selectMoreRow(view, button = null) {
    app.querySelectorAll(".more-row2").forEach((row) => {
      row.classList.toggle("active", row.dataset.view === view);
      row.classList.remove("is-selecting");
    });
    const selected = button || [...app.querySelectorAll(".more-row2")].find((row) => row.dataset.view === view);
    if (!selected) return;
    selected.classList.add("active", "is-selecting");
    window.setTimeout(() => {
      if (selected.isConnected) selected.classList.remove("is-selecting");
    }, 320);
  }

  function renderHealth() {
    const view = ["workouts", "nutrition"].includes(ui.healthView) ? ui.healthView : "workouts";
    return `
      <div class="view">
        ${topbar("Health", "", actionButton("schedule-workout", "", "Schedule workout", "clock", "primary"))}
        <div class="seg-toggle health-toggle" role="group" aria-label="Health view">
          <button type="button" class="seg-btn ${view === "workouts" ? "active" : ""}" data-action="set-health-view" data-health-view="workouts">${icon("dumbbell")}<span>Workouts</span></button>
          <button type="button" class="seg-btn ${view === "nutrition" ? "active" : ""}" data-action="set-health-view" data-health-view="nutrition">${icon("flame")}<span>Nutrition</span></button>
        </div>
        <div class="health-body" data-health-body>
          ${view === "nutrition" ? renderNutrition() : renderWorkoutsSection()}
        </div>
      </div>
    `;
  }

  function workoutsForDate(ds) {
    return sortByStartTime(appData.gym.workouts.filter((w) => w.date === ds));
  }

  function sortByStartTime(list) {
    return [...list].sort((a, b) => {
      const am = timeToMinutes(a.startTime);
      const bm = timeToMinutes(b.startTime);
      if (am === null && bm === null) return 0;
      if (am === null) return 1;
      if (bm === null) return -1;
      return am - bm;
    });
  }

  function workoutDotColor(w) {
    return isRunWorkout(w) ? "#25d8ff" : "#34d399";
  }

  function renderHealthPlanner() {
    const weekStart = startOfWeek(new Date());
    const todayStr = today();
    const planDays = appData.gym.planDays || [];
    const cols = [];
    for (let i = 0; i < 7; i++) {
      const ds = dateString(addDays(weekStart, i));
      const dateObj = parseDate(ds);
      const ws = workoutsForDate(ds);
      const isPlanDay = planDays.includes(dateObj.getDay());
      const dow = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(dateObj);
      let marker;
      if (ws.length) {
        const dots = ws.slice(0, 4).map((w) => `<i class="planner-dot" style="--dot:${escapeHtml(workoutDotColor(w))}"></i>`).join("");
        marker = `<span class="planner-dots">${dots}</span>`;
      } else if (isPlanDay) {
        marker = `<span class="planner-dots"><i class="planner-dot is-plan"></i></span>`;
      } else {
        marker = `<span class="planner-dots"><i class="planner-rest-dot"></i></span>`;
      }
      const stateLabel = ws.length ? `${ws.length} workout${ws.length === 1 ? "" : "s"}` : (isPlanDay ? "Plan day" : "Rest");
      cols.push(`
        <button type="button" class="planner-day ${ds === todayStr ? "is-today" : ""} ${isPlanDay ? "is-plan" : ""} ${ws.length ? "has-workouts" : ""}" data-action="planner-expand-day" data-date="${escapeHtml(ds)}" aria-label="${escapeHtml(dow + " — " + stateLabel)}">
          <div class="planner-day-head">
            <span class="planner-dow">${escapeHtml(dow)}</span>
            <span class="planner-dom">${Number(ds.slice(8))}</span>
          </div>
          ${marker}
        </button>`);
    }
    return `
      <section class="health-planner">
        <div class="sec-head"><span class="sec-title">This week</span><span class="sec-hint">Tap a day</span></div>
        <div class="planner-week">${cols.join("")}</div>
        <div class="planner-zoom-layer" data-planner-zoom hidden></div>
      </section>
    `;
  }

  function closePlannerDay() {
    const layer = app.querySelector("[data-planner-zoom]");
    if (!layer || layer.hidden) return;
    unlockBodyScroll();
    const card = layer.querySelector(".planner-zoom-card");
    layer.classList.remove("is-open");
    if (card) card.classList.remove("is-open");
    window.setTimeout(() => {
      if (layer.isConnected) { layer.innerHTML = ""; layer.hidden = true; }
    }, 240);
  }

  function openPlannerDay(ds, dayEl) {
    const section = dayEl ? dayEl.closest(".health-planner") : app.querySelector(".health-planner");
    const layer = section ? section.querySelector("[data-planner-zoom]") : null;
    if (!layer) return;
    const dateObj = parseDate(ds) || new Date();
    const ws = workoutsForDate(ds);
    const isPlanDay = (appData.gym.planDays || []).includes(dateObj.getDay());
    const longLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(dateObj);

    const body = ws.length
      ? `<div class="planner-zoom-list">${ws.map((w) => {
          const label = isRunWorkout(w) ? "Run" : (w.split || "Workout");
          const meta = [workoutTimeLabel(w) || "Anytime", w.duration ? `${w.duration} min` : "", isRunWorkout(w) && w.distance ? `${formatNumber(w.distance, 1)} mi` : ""].filter(Boolean).join(" · ");
          return `
            <button type="button" class="planner-zoom-item" data-action="edit-workout" data-id="${escapeHtml(w.id)}" style="--dot:${escapeHtml(workoutDotColor(w))}">
              <span class="planner-zoom-item-bar"></span>
              <span class="planner-zoom-item-main">
                <span class="planner-zoom-item-title">${escapeHtml(label)}</span>
                <span class="planner-zoom-item-meta">${escapeHtml(meta)}</span>
              </span>
              <span class="planner-zoom-item-go">${icon("chevron")}</span>
            </button>`;
        }).join("")}</div>`
      : `<p class="planner-zoom-empty">${isPlanDay ? "Plan day — nothing scheduled yet." : "Rest day. Nothing planned."}</p>`;

    layer.hidden = false;
    layer.innerHTML = `
      <div class="planner-zoom-backdrop" data-planner-close></div>
      <div class="planner-zoom-card">
        <div class="planner-zoom-head">
          <div>
            <span class="planner-zoom-dow">${escapeHtml(longLabel)}</span>
            <span class="planner-zoom-count">${ws.length ? `${ws.length} workout${ws.length === 1 ? "" : "s"} planned` : (isPlanDay ? "Plan day" : "Rest day")}</span>
          </div>
          <button type="button" class="planner-zoom-close" data-planner-close aria-label="Close">${icon("x")}</button>
        </div>
        ${body}
        <button type="button" class="planner-zoom-add primary" data-action="schedule-workout" data-date="${escapeHtml(ds)}">${icon("plus")}<span>Schedule workout</span></button>
      </div>
    `;

    // Zoom origin = center of the tapped day, so it appears to grow out of it.
    const card = layer.querySelector(".planner-zoom-card");
    if (card && dayEl) {
      const lr = layer.getBoundingClientRect();
      const dr = dayEl.getBoundingClientRect();
      const ox = ((dr.left + dr.width / 2) - lr.left) / lr.width * 100;
      const oy = ((dr.top + dr.height / 2) - lr.top) / lr.height * 100;
      card.style.transformOrigin = `${ox.toFixed(1)}% ${oy.toFixed(1)}%`;
    }
    layer.querySelectorAll("[data-planner-close]").forEach((el) => el.addEventListener("click", closePlannerDay));

    void layer.offsetWidth; // force reflow so the transition runs
    layer.classList.add("is-open");
    if (card) card.classList.add("is-open");
    lockBodyScroll();
  }

  function workoutKind(w) {
    return (w.type || "lift").toLowerCase();
  }

  function isRunWorkout(w) {
    return workoutKind(w) === "run";
  }

  function runStats(range) {
    const runs = appData.gym.workouts.filter((w) => isRunWorkout(w) && dateInRange(w.date, range));
    const miles = sum(runs, (w) => Number(w.distance) || 0);
    const duration = sum(runs, (w) => Number(w.duration) || 0);
    return { runs, miles, duration, count: runs.length };
  }

  function paceLabel(distance, duration) {
    const d = Number(distance) || 0, m = Number(duration) || 0;
    if (!d || !m) return "";
    const p = m / d;
    const mm = Math.floor(p);
    const ss = Math.round((p - mm) * 60);
    return `${mm}:${String(ss).padStart(2, "0")}/mi`;
  }

  function renderWorkoutsSection() {
    const mode = ui.workoutMode === "run" ? "run" : "lift";
    return `
      <section class="section">
        ${renderHealthPlanner()}
        <div class="seg-toggle" role="group" aria-label="Workout type">
          <button type="button" class="seg-btn ${mode === "lift" ? "active" : ""}" data-action="set-workout-mode" data-workout-mode="lift">${icon("dumbbell")}<span>Lifting</span></button>
          <button type="button" class="seg-btn ${mode === "run" ? "active" : ""}" data-action="set-workout-mode" data-workout-mode="run">${icon("activity")}<span>Running</span></button>
        </div>
        <div data-workout-body>
          ${mode === "run" ? renderRunningSummary() : renderLiftingSummary()}
        </div>
      </section>
    `;
  }

  function healthTile(label, value, sub, iconName, color) {
    return `
      <div class="stat-tile">
        <span class="st-head"><span class="st-ic" style="--ic:${color}">${icon(iconName)}</span>${escapeHtml(label)}</span>
        <span class="st-val">${escapeHtml(value)}</span>
        <span class="st-sub">${escapeHtml(sub)}</span>
      </div>
    `;
  }

  function renderSplitBars(freq) {
    const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map((e) => e[1]));
    return `
      <div class="panel split-panel">
        ${entries.map(([label, count]) => `
          <div class="split-row">
            <span class="split-label">${escapeHtml(label || "Other")}</span>
            <span class="split-bar"><i style="width:${Math.round((count / max) * 100)}%"></i></span>
            <span class="split-val">${count}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderLiftingSummary() {
    const lifts = sortByDate(appData.gym.workouts.filter((w) => !isRunWorkout(w)), "date");
    const weekRange = calculateDateRange("week");
    const liftWeek = lifts.filter((w) => dateInRange(w.date, weekRange));
    const volume = sum(liftWeek, workoutVolume);
    const splitFreq = groupTotals(liftWeek, "split", () => 1);
    const lastLift = lifts.at(-1);
    const planText = appData.gym.planDays?.length ? appData.gym.planDays.map(dayName).join(" · ") : "No plan days";
    const lastPreview = lastLift ? [lastLift.split || "Workout", formatDate(lastLift.date)].filter(Boolean).join(" · ") : "Lift log";
    return `
      <div class="sec-head"><span class="sec-title">Lifting</span><span class="sec-actions">${actionButton("edit-gym-plan", "", "Plan days", "calendar", "secondary")}${actionButton("add-workout", "", "Add lift", "plus", "primary")}</span></div>
      <section class="stat-tiles">
        ${healthTile("This week", String(liftWeek.length), planText, "dumbbell", "var(--pink)")}
        ${healthTile("Streak", String(workoutStreak()), "days in a row", "activity", "var(--green)")}
        ${healthTile("Volume", formatNumber(volume), "sets × reps × wt", "chart", "var(--blue)")}
        ${healthTile("Recent", lastLift ? (lastLift.split || "Workout") : "None", lastLift ? formatDate(lastLift.date) : "Log a lift", "calendar", "var(--orange)")}
      </section>
      ${Object.keys(splitFreq).length ? `
        <div class="sec-head"><span class="sec-title">Split history</span><span class="sec-hint">This week</span></div>
        ${renderSplitBars(splitFreq)}
      ` : ""}
      <div class="sec-head"><span class="sec-title">Lift log</span><span class="sec-hint">${lifts.length} entr${lifts.length === 1 ? "y" : "ies"}</span></div>
      <details class="card panel section">
        <summary>
          <span class="finance-section-heading"><span class="finance-section-title">${escapeHtml(lastPreview)}</span></span>
          <span class="tiny">${lifts.length}</span>
        </summary>
        <div class="details-body">
          <div class="list">
            ${lifts.length ? lifts.slice().reverse().map(renderWorkoutItem).join("") : emptyState("Add a lift to track consistency and volume.")}
          </div>
        </div>
      </details>
    `;
  }

  function renderRunningSummary() {
    const todayRuns = runStats(calculateDateRange("today"));
    const weekRuns = runStats(calculateDateRange("week"));
    const monthRuns = runStats(calculateDateRange("month"));
    const allRuns = sortByDate(appData.gym.workouts.filter(isRunWorkout), "date");
    const totalMiles = sum(allRuns, (w) => Number(w.distance) || 0);
    const longest = allRuns.reduce((m, w) => Math.max(m, Number(w.distance) || 0), 0);
    const lastRun = allRuns.at(-1);
    const lastPreview = lastRun ? `Run · ${formatDate(lastRun.date)}` : "Run log";
    return `
      <div class="sec-head"><span class="sec-title">Running</span><span class="sec-actions">${actionButton("add-run", "", "Log run", "plus", "primary")}</span></div>
      <section class="stat-tiles">
        ${healthTile("This week", `${formatNumber(weekRuns.miles, 1)} mi`, `${weekRuns.count} run${weekRuns.count === 1 ? "" : "s"}`, "activity", "var(--cyan)")}
        ${healthTile("This month", `${formatNumber(monthRuns.miles, 1)} mi`, `${monthRuns.count} runs`, "calendar", "var(--blue)")}
        ${healthTile("Total", `${formatNumber(totalMiles, 1)} mi`, `${allRuns.length} all-time`, "chart", "var(--green)")}
        ${healthTile("Longest", `${formatNumber(longest, 1)} mi`, lastRun ? formatDate(lastRun.date) : "None", "spark", "var(--orange)")}
      </section>
      <div class="sec-head"><span class="sec-title">Run log</span><span class="sec-hint">${allRuns.length} entr${allRuns.length === 1 ? "y" : "ies"}</span></div>
      <details class="card panel section">
        <summary>
          <span class="finance-section-heading"><span class="finance-section-title">${escapeHtml(lastPreview)}</span></span>
          <span class="tiny">${allRuns.length}</span>
        </summary>
        <div class="details-body">
          <div class="list">
            ${allRuns.length ? allRuns.slice().reverse().map(renderWorkoutItem).join("") : emptyState("Log a run to track your miles and pace.")}
          </div>
        </div>
      </details>
    `;
  }

  function workoutTimeLabel(workout = {}) {
    const start = formatTime(workout.startTime);
    const end = formatTime(workout.endTime);
    if (start && end) return `${start} – ${end}`;
    return start || "";
  }

  function renderWorkoutItem(workout) {
    const run = isRunWorkout(workout);
    const volume = workoutVolume(workout);
    const exerciseText = !run && appData.settings.gymDetails && workout.exercises?.length
      ? workout.exercises.map((ex) => `${ex.name}: ${ex.sets} x ${ex.reps} x ${ex.weight}`).join("; ")
      : "";
    const timeLabel = workoutTimeLabel(workout);
    const meta = run
      ? [timeLabel, `${formatNumber(workout.distance || 0, 2)} mi`, workout.duration ? `${workout.duration} min` : "", paceLabel(workout.distance, workout.duration), `Energy ${workout.energy || "N/A"}`]
      : [timeLabel, `${workout.duration || 0} min`, `Energy ${workout.energy || "N/A"}`, `Volume ${formatNumber(volume)}`];
    return itemCard({
      title: `${run ? "Run" : (workout.split || "Workout")} · ${formatDate(workout.date)}`,
      meta: meta.filter(Boolean),
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
    const goals = appData.nutrition.goals || {};
    const calGoal = Number(goals.calories) || 0;
    const mealsToday = appData.nutrition.entries.filter((entry) => dateInRange(entry.date, calculateDateRange("today"))).length;
    const calLeft = Math.max(0, calGoal - todayStats.calories);
    return `
      <section class="section nutrition-a">
        <div class="card panel nutri-hero">
          ${calorieRing(todayStats.caloriePercent, formatNumber(todayStats.calories), formatNumber(calGoal))}
          <div class="nutri-hero-info">
            <span class="nutri-hero-label">Calories today</span>
            <span class="nutri-hero-big">${formatNumber(calLeft)} left</span>
            <span class="nutri-hero-sub">${mealsToday} meal${mealsToday === 1 ? "" : "s"} logged · ${todayStats.caloriePercent}% of ${formatNumber(calGoal)}</span>
          </div>
        </div>

        <div class="sec-head">
          <span class="sec-title">Macros</span>
          <button type="button" class="sec-action" data-action="edit-nutrition-goals" data-id="">Goals${icon("chevron")}</button>
        </div>
        <div class="card panel nutri-macros">
          ${macroBar("Protein", todayStats.protein, goals.protein, "var(--blue)")}
          ${macroBar("Carbs", todayStats.carbs, goals.carbs, "var(--orange)")}
          ${macroBar("Fat", todayStats.fat, goals.fat, "var(--pink)")}
        </div>

        <div class="sec-head">
          <span class="sec-title">Meals</span>
          <button type="button" class="sec-action" data-action="add-nutrition" data-id="">${icon("plus")}Add meal</button>
        </div>
        <div class="card panel section">
          <div class="list">
            ${appData.nutrition.entries.length ? sortByDate(appData.nutrition.entries, "date").reverse().map(renderNutritionItem).join("") : emptyState("Add meal entries to track simple macro totals.")}
          </div>
        </div>
      </section>
    `;
  }

  // Calorie ring for the nutrition hero: fills to % of goal, center shows eaten/goal.
  function calorieRing(percent, eaten, goal) {
    const p = clamp(Math.round(Number(percent) || 0), 0, 100);
    const r = 34;
    const c = 2 * Math.PI * r;
    const off = c * (1 - p / 100);
    return `
      <div class="calorie-ring">
        <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
          <circle cx="46" cy="46" r="${r}" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="8"></circle>
          <circle cx="46" cy="46" r="${r}" fill="none" stroke="var(--orange)" stroke-width="8" stroke-linecap="round"
            stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 46 46)"></circle>
        </svg>
        <span class="calorie-ring-val"><b>${escapeHtml(eaten)}</b><s>of ${escapeHtml(goal)}</s></span>
      </div>
    `;
  }

  function macroBar(label, value, goal, color) {
    const g = Number(goal) || 0;
    const v = Number(value) || 0;
    const p = g ? clamp(Math.round((v / g) * 100), 0, 100) : 0;
    return `
      <div class="macro-row">
        <span class="macro-name">${escapeHtml(label)}</span>
        <span class="macro-track"><span style="width:${p}%;background:${color}"></span></span>
        <span class="macro-val">${formatNumber(v)} / ${formatNumber(g)}g</span>
      </div>
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

  function isWishlistItem(item) {
    return (item.listType || "grocery") === "wishlist";
  }

  function renderShopping() {
    const stats = shoppingStats();
    const items = appData.shopping || [];
    const grocery = items.filter((item) => !item.purchased && !isWishlistItem(item));
    const wishlist = items.filter((item) => !item.purchased && isWishlistItem(item));
    const got = items.filter((item) => item.purchased);

    return `
      <section class="section">
        <div class="section-header">
          <h2>Shopping List</h2>
          ${actionButton("add-shopping", "", "Add item", "plus", "primary")}
        </div>
        <div class="metric-grid">
          ${metric("Grocery cart", formatCurrency(stats.groceryTotal), `${stats.groceryCount} item${stats.groceryCount === 1 ? "" : "s"} to grab`)}
          ${metric("Wishlist", formatCurrency(stats.wishlistTotal), `${stats.wishlistCount} item${stats.wishlistCount === 1 ? "" : "s"} you want`)}
        </div>
        <div class="card panel section">
          <div class="section-header">
            <div>
              <h2>Grocery cart</h2>
              <span class="tiny">Everyday items — adds up to a full cart total</span>
            </div>
            <span class="cart-total">${formatCurrency(stats.groceryTotal)}</span>
          </div>
          <div class="list">
            ${grocery.length ? grocery.map(renderShoppingItem).join("") : emptyState("Add grocery items to build your cart.")}
          </div>
        </div>
        <div class="card panel section">
          <div class="section-header">
            <div>
              <h2>Wishlist</h2>
              <span class="tiny">Bigger one-off things you're aiming to buy</span>
            </div>
            <span class="cart-total">${formatCurrency(stats.wishlistTotal)}</span>
          </div>
          <div class="list">
            ${wishlist.length ? wishlist.map(renderShoppingItem).join("") : emptyState("Add a bigger item you want to save up for.")}
          </div>
        </div>
        <div class="card panel section">
          <h2>Got it</h2>
          <div class="list">
            ${got.length ? got.map(renderShoppingItem).join("") : emptyState("Items you've picked up will appear here.")}
          </div>
        </div>
      </section>
    `;
  }

  function renderShoppingItem(item) {
    const typeLabel = isWishlistItem(item) ? "Wishlist" : "Grocery";
    return itemCard({
      title: item.itemName,
      meta: [item.estimatedPrice ? formatCurrency(item.estimatedPrice) : "", typeLabel, item.store].filter(Boolean),
      note: item.notes,
      className: item.purchased ? "purchased" : "",
      actions: `
        ${actionButton("toggle-shopping", item.id, item.purchased ? "Not yet" : "Got it", item.purchased ? "undo" : "check")}
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
          <div class="pill-row analytical-summary-pills">
            <span class="chip active">Best category: ${escapeHtml(best)}</span>
            <span class="chip">Needs attention: ${escapeHtml(weakest)}</span>
          </div>
        </div>
      </section>
    `;
  }

  function renderSettings() {
    return `
      <section class="section">
        <h2>Settings</h2>
        <div class="card panel section">
          <h3>Theme accent</h3>
          <div class="swatches">
            ${colorSwatches.map((color) => `<button type="button" class="swatch ${String(appData.settings.accent).toLowerCase() === color ? "active" : ""}" style="background:${color}" data-action="set-accent" data-color="${color}" title="${color}" aria-label="Set accent ${color}"></button>`).join("")}
          </div>
        </div>

        <div class="card panel section">
          <h3>Optional sections</h3>
          <label class="checkbox-row"><input type="checkbox" data-setting="weeklyReview" ${appData.settings.weeklyReview ? "checked" : ""}> Weekly Review</label>
          <label class="checkbox-row"><input type="checkbox" data-setting="nutrition" ${appData.settings.nutrition ? "checked" : ""}> Nutrition</label>
          <label class="checkbox-row"><input type="checkbox" data-setting="gymDetails" ${appData.settings.gymDetails ? "checked" : ""}> Gym exercise details</label>
        </div>

        <div class="card panel section">
          <h3>School progress</h3>
          <span class="tiny">The assignment progress at the top of the School tab.</span>
          <label class="field"><span>Shape</span></label>
          <div class="segmented">
            ${[["halfring", "Half-ring"], ["ring", "Rings"], ["bar", "Bars"]].map(([v, l]) => `<button type="button" class="${(appData.settings.schoolProgressShape || "halfring") === v ? "active" : ""}" data-action="set-school-progress-shape" data-shape="${v}">${l}</button>`).join("")}
          </div>
          <label class="checkbox-row"><input type="checkbox" data-setting="schoolProgressLegend" ${appData.settings.schoolProgressLegend ? "checked" : ""}> Show class legend</label>
          <label class="checkbox-row"><input type="checkbox" data-setting="schoolProgressLegendCounts" ${appData.settings.schoolProgressLegendCounts !== false ? "checked" : ""}> Legend shows assignment counts</label>
        </div>

        <div class="card panel section">
          <h3>Tax estimate</h3>
          <label class="checkbox-row"><input type="checkbox" data-tax-setting="autoOhio" ${appData.settings.tax.autoOhio ? "checked" : ""}> <span>Use automatic tax estimate<small>Federal, FICA, Ohio state, municipal, and optional school district.</small></span></label>
          ${renderTaxControlPanel("settings")}
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

  // Habits can be scheduled on specific weekdays (0 = Sun … 6 = Sat). A habit
  // with no schedule (empty/missing days) runs every day, so existing habits
  // keep their behavior.
  function habitDays(habit) {
    const days = Array.isArray(habit?.days) ? habit.days.map(Number).filter((d) => d >= 0 && d <= 6) : [];
    return days;
  }

  function habitActiveOn(habit, dateStr) {
    const days = habitDays(habit);
    if (!days.length) return true;
    const d = parseDate(dateStr);
    if (!d) return true;
    return days.includes(d.getDay());
  }

  function habitsForDate(dateStr) {
    return (appData.dailyHabits || []).filter((habit) => habitActiveOn(habit, dateStr));
  }

  function habitStats(range) {
    const dates = eachDate(range.start, range.end);
    let total = 0;
    let completed = 0;
    dates.forEach((date) => {
      habitsForDate(date).forEach((habit) => {
        total += 1;
        if (isHabitDone(habit.id, date)) completed += 1;
      });
    });
    let streak = 0;
    let cursor = parseDate(today());
    const hasHabits = (appData.dailyHabits || []).length > 0;
    // Walk back at most ~2 years so rest days (which never break the streak)
    // can't spin the loop forever.
    let guard = 0;
    while (hasHabits && guard < 750) {
      guard += 1;
      const d = dateString(cursor);
      const scheduled = habitsForDate(d);
      // Rest days (nothing scheduled) don't break the streak, and a scheduled
      // day only counts once everything planned for it is done.
      const fullDay = scheduled.every((habit) => isHabitDone(habit.id, d));
      if (scheduled.length && !fullDay) break;
      if (scheduled.length) streak += 1;
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
    const rawAccountMoney = sum(appData.finance.accounts, (account) => account.balance);
    const incomeEntries = appData.finance.income.filter((entry) => dateInRange(incomeDate(entry), range));
    const grossIncome = sum(incomeEntries, entryGrossIncome);
    const taxBreakdown = combineTaxEstimates(incomeEntries.map(entryTaxEstimate), grossIncome);
    const netIncome = Math.max(0, grossIncome - taxBreakdown.total);
    const taxTotal = taxBreakdown.total;
    const workHours = sum(incomeEntries.filter((entry) => entry.type === "hourly"), (entry) => entry.hours);
    // Income that has actually been received (pay date on or before today) is real
    // money in hand, so it increases current money. Income dated in the future is
    // only part of the forecast.
    const postedIncomeEntries = appData.finance.income.filter((entry) => {
      const when = incomeDate(entry);
      return when && when <= today();
    });
    const postedIncome = sum(postedIncomeEntries, entryNetIncome);
    const futureIncomeEntries = incomeEntries.filter((entry) => incomeDate(entry) > today());
    const futureNetIncome = sum(futureIncomeEntries, entryNetIncome);
    const spendingEntries = appData.finance.spending.filter((entry) => dateInRange(entry.date, range));
    const spending = sum(spendingEntries, (entry) => entry.amount);
    const cashSpendingEntries = spendingEntries.filter((entry) => !spendingUsesCredit(entry));
    const creditSpendingEntries = spendingEntries.filter(spendingUsesCredit);
    const cashSpending = sum(cashSpendingEntries, (entry) => entry.amount);
    const creditSpending = sum(creditSpendingEntries, (entry) => entry.amount);
    const postedCashSpendingEntries = appData.finance.spending.filter((entry) => !spendingUsesCredit(entry) && entry.date && entry.date <= today());
    const postedCashSpending = sum(postedCashSpendingEntries, (entry) => entry.amount);
    const postedDebtPaymentEntries = debtPaymentHistoryEntries().filter((payment) => paymentHistoryDate(payment) <= today());
    const postedDebtPayments = sum(postedDebtPaymentEntries, (payment) => payment.amount);
    const savingsEntries = appData.finance.savings.filter((entry) => dateInRange(entry.date, range));
    const savings = sum(savingsEntries, (entry) => entry.amount);
    const postedSavingsEntries = appData.finance.savings.filter((entry) => entry.date && entry.date <= today());
    const postedSavings = sum(postedSavingsEntries, (entry) => entry.amount);
    const futureSavingsEntries = savingsEntries.filter((entry) => entry.date > today());
    const futureSavings = sum(futureSavingsEntries, (entry) => entry.amount);
    const accountOutflowsById = [...postedCashSpendingEntries, ...postedDebtPaymentEntries].reduce((totals, entry) => {
      if (entry.accountId) totals[entry.accountId] = (totals[entry.accountId] || 0) + (Number(entry.amount) || 0);
      return totals;
    }, {});
    const accountInflowsById = postedSavingsEntries.reduce((totals, entry) => {
      if (entry.accountId) totals[entry.accountId] = (totals[entry.accountId] || 0) + (Number(entry.amount) || 0);
      return totals;
    }, {});
    const postedAccountOutflows = postedCashSpending + postedDebtPayments;
    const linkedPostedAccountOutflows = sum([...postedCashSpendingEntries, ...postedDebtPaymentEntries].filter((entry) => entry.accountId), (entry) => entry.amount);
    const unlinkedPostedAccountOutflows = Math.max(0, postedAccountOutflows - linkedPostedAccountOutflows);
    const linkedPostedSavings = sum(postedSavingsEntries.filter((entry) => entry.accountId), (entry) => entry.amount);
    const unlinkedPostedSavings = Math.max(0, postedSavings - linkedPostedSavings);
    const futureCashSpendingEntries = cashSpendingEntries.filter((entry) => entry.date > today());
    const billOccurrences = appData.finance.bills.flatMap((bill) => billOccurrencesInRange(bill, range)).sort((a, b) => a.date.localeCompare(b.date));
    const billsDue = sum(billOccurrences.filter((bill) => !bill.paid), (bill) => bill.amount);
    // A bill marked paid has left your account, so it lowers current money.
    const postedPaidBills = sum(appData.finance.bills.filter((bill) => bill.paid), (bill) => Number(bill.amount) || 0);
    const debtPaymentOccurrences = appData.finance.debts.flatMap((debt) => debtPaymentOccurrencesInRange(debt, range)).sort((a, b) => a.date.localeCompare(b.date));
    const debtPayments = sum(debtPaymentOccurrences, (payment) => payment.amount);
    const totalDebt = sum(appData.finance.debts, (debt) => debt.balance);
    const invested = sum(appData.finance.investments, investmentInvested);
    const investmentValue = sum(appData.finance.investments, investmentCurrentValue);
    const investmentGain = investmentValue - invested;
    const shopping = shoppingStats().remainingTotal;
    const accountMoney = rawAccountMoney + postedIncome + postedSavings - postedAccountOutflows - postedPaidBills;
    const currentMoney = accountMoney;
    const futureCashSpending = sum(futureCashSpendingEntries, (entry) => entry.amount);
    // Posted income is already in currentMoney, so the forecast only adds income still to come.
    const projectedBalance = currentMoney + futureNetIncome + futureSavings - billsDue - debtPayments - futureCashSpending - shopping;
    const netWorth = currentMoney + investmentValue - totalDebt;
    const lowestBalance = projectedLowestBalance(currentMoney, futureIncomeEntries, billOccurrences, debtPaymentOccurrences, futureCashSpendingEntries, futureSavingsEntries);
    const savingsAccountIds = new Set(savingsAccounts().map((account) => account.id));
    const savingsAccountBalance = sum(appData.finance.accounts.filter((account) => savingsAccountIds.has(account.id)), (account) => (Number(account.balance) || 0) + (accountInflowsById[account.id] || 0) - (accountOutflowsById[account.id] || 0));
    const postedSavingsOutsideSavingsAccounts = sum(postedSavingsEntries.filter((entry) => !entry.accountId || !savingsAccountIds.has(entry.accountId)), (entry) => entry.amount);
    const savingsBalance = savingsAccountBalance + postedSavingsOutsideSavingsAccounts;
    const savingsGoalProgress = appData.finance.savingsGoals.map((goal) => savingsGoalStats(goal));
    const safeToSpend = Math.max(0, Math.min(currentMoney, projectedBalance, lowestBalance));
    const dailyLimit = Math.max(0, safeToSpend / daysBetween(range.start, range.end));
    return {
      range,
      rawAccountMoney,
      accountMoney,
      currentMoney,
      incomeEntries,
      grossIncome,
      netIncome,
      postedIncome,
      futureNetIncome,
      taxTotal,
      taxBreakdown,
      workHours,
      spendingEntries,
      spending,
      cashSpendingEntries,
      creditSpendingEntries,
      savingsEntries,
      savings,
      postedSavingsEntries,
      postedSavings,
      futureSavingsEntries,
      futureSavings,
      cashSpending,
      creditSpending,
      postedCashSpending,
      postedDebtPaymentEntries,
      postedDebtPayments,
      postedAccountOutflows,
      linkedPostedAccountOutflows,
      unlinkedPostedAccountOutflows,
      accountOutflowsById,
      accountInflowsById,
      linkedPostedSavings,
      unlinkedPostedSavings,
      futureCashSpending,
      billOccurrences,
      billsDue,
      debtPaymentOccurrences,
      debtPayments,
      totalDebt,
      invested,
      investmentValue,
      investmentGain,
      savingsBalance,
      savingsGoalProgress,
      shopping,
      projectedBalance,
      safeToSpend,
      netWorth,
      lowestBalance,
      dailyLimit
    };
  }

  function savingsGoalStats(goal) {
    const saved = (Number(goal.initialAmount) || 0) + sum(appData.finance.savings.filter((entry) => entry.goalId === goal.id && entry.date <= today()), (entry) => entry.amount);
    const target = Math.max(0, Number(goal.targetAmount) || 0);
    const remaining = Math.max(0, target - saved);
    return {
      goal,
      saved,
      target,
      remaining,
      percent: pct(Math.min(saved, target), target)
    };
  }

  function generalGoalStats(goal) {
    const linkedGoal = goal.linkedSavingsGoalId ? findById(appData.finance.savingsGoals, goal.linkedSavingsGoalId) : null;
    const linkedStats = linkedGoal ? savingsGoalStats(linkedGoal) : null;
    const percent = goal.completed ? 100 : linkedStats ? linkedStats.percent : clamp(goal.progressPercent);
    return {
      goal,
      linkedGoal,
      linkedStats,
      percent
    };
  }

  function moneyTrendMonths(count = 6) {
    const now = new Date();
    return Array.from({ length: count }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
      const range = {
        start: dateString(startOfMonth(monthDate)),
        end: dateString(endOfMonth(monthDate)),
        label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(monthDate)
      };
      const finance = calculateFinance(range);
      return {
        ...range,
        income: finance.netIncome,
        spending: finance.spending,
        savings: finance.savings,
        net: finance.netIncome + finance.savings - finance.spending
      };
    });
  }

  function entryGrossIncome(entry) {
    if (entry.type === "hourly") return (Number(entry.hourlyWage) || 0) * (Number(entry.hours) || 0);
    return Number(entry.amount) || 0;
  }

  function entryNetIncome(entry) {
    const gross = entryGrossIncome(entry);
    return Math.max(0, gross - entryTaxEstimate(entry).total);
  }

  function normalizedIncomeTaxMode(entry = {}) {
    if (["none", "auto", "manual"].includes(entry.taxMode)) return entry.taxMode;
    if (Number(entry.manualTaxAmount) > 0 || Number(entry.deductionPercent) > 0) return "manual";
    return "none";
  }

  function entryTaxEstimate(entry) {
    const gross = entryGrossIncome(entry);
    const mode = normalizedIncomeTaxMode(entry);
    if (!gross) return emptyTaxEstimate();
    if (mode === "none" || (mode === "auto" && appData.settings.tax?.autoOhio === false)) {
      return {
        ...emptyTaxEstimate(),
        grossIncome: gross,
        netIncome: gross
      };
    }
    if (mode === "manual") {
      const manualAmount = Math.max(0, Number(entry.manualTaxAmount) || 0);
      const legacyPercentageAmount = gross * (clamp(entry.deductionPercent || 0, 0, 100) / 100);
      const total = Math.min(gross, manualAmount || legacyPercentageAmount);
      return {
        ...emptyTaxEstimate(),
        grossIncome: gross,
        manual: total,
        total,
        netIncome: Math.max(0, gross - total),
        effectiveRate: gross ? (total / gross) * 100 : 0
      };
    }

    const settings = taxSettings();
    const periods = payPeriodsForFrequency(settings.paycheckFrequency);
    const annualGross = Math.max(0, Number(entry.annualGrossIncome) || gross * periods);
    const annualEstimate = calculateTotalTaxes(annualGross, localTaxRates(settings), {
      filingStatus: entry.filingStatus || settings.filingStatus || "single",
      w2Income: entry.w2Income ?? settings.w2Income
    });
    return scaleTaxEstimate(annualEstimate, 1 / periods, gross);
  }

  function emptyTaxEstimate() {
    return {
      grossIncome: 0,
      federalTaxableIncome: 0,
      federal: 0,
      socialSecurity: 0,
      medicare: 0,
      fica: 0,
      ohio: 0,
      municipal: 0,
      schoolDistrict: 0,
      local: 0,
      manual: 0,
      total: 0,
      netIncome: 0,
      effectiveRate: 0
    };
  }

  function calculateFederalTax(grossIncome, filingStatus = "single") {
    const gross = Math.max(0, Number(grossIncome) || 0);
    const deduction = filingStatus === "single" ? taxConfig.federal.standardDeductionSingle : taxConfig.federal.standardDeductionSingle;
    const taxableIncome = Math.max(0, gross - deduction);
    return {
      taxableIncome,
      tax: calculateProgressiveTax(taxableIncome, taxConfig.federal.bracketsSingle)
    };
  }

  function calculateProgressiveTax(taxableIncome, brackets) {
    const taxable = Math.max(0, Number(taxableIncome) || 0);
    return brackets.reduce((total, bracket) => {
      if (taxable <= bracket.min) return total;
      const amount = Math.min(taxable, bracket.max) - bracket.min;
      return total + Math.max(0, amount) * bracket.rate;
    }, 0);
  }

  function calculateFicaTax(grossIncome, w2Income = true) {
    const gross = Math.max(0, Number(grossIncome) || 0);
    if (!w2Income) return { socialSecurity: 0, medicare: 0, total: 0 };
    const socialSecurity = Math.min(gross, taxConfig.fica.socialSecurityCap) * taxConfig.fica.socialSecurityRate;
    const medicare = gross * taxConfig.fica.medicareRate;
    return { socialSecurity, medicare, total: socialSecurity + medicare };
  }

  function calculateOhioTax(grossIncome) {
    const gross = Math.max(0, Number(grossIncome) || 0);
    if (gross <= taxConfig.ohio.exemptionThreshold) return 0;
    return (gross - taxConfig.ohio.exemptionThreshold) * taxConfig.ohio.flatRateAboveThreshold;
  }

  function calculateLocalTax(grossIncome, municipalRate = 0, schoolDistrictRate = 0) {
    const gross = Math.max(0, Number(grossIncome) || 0);
    const municipal = gross * Math.max(0, Number(municipalRate) || 0);
    const schoolDistrict = gross * Math.max(0, Number(schoolDistrictRate) || 0);
    return { municipal, schoolDistrict, total: municipal + schoolDistrict };
  }

  function calculateTotalTaxes(grossIncome, localRates = {}, options = {}) {
    const gross = Math.max(0, Number(grossIncome) || 0);
    const federal = calculateFederalTax(gross, options.filingStatus || "single");
    const fica = calculateFicaTax(gross, options.w2Income !== false);
    const ohio = calculateOhioTax(gross);
    const local = calculateLocalTax(gross, localRates.municipalRate, localRates.schoolDistrictRate);
    const total = federal.tax + fica.total + ohio + local.total;
    const netIncome = calculateNetIncome(gross, total);
    return {
      ...emptyTaxEstimate(),
      grossIncome: gross,
      federalTaxableIncome: federal.taxableIncome,
      federal: federal.tax,
      socialSecurity: fica.socialSecurity,
      medicare: fica.medicare,
      fica: fica.total,
      ohio,
      municipal: local.municipal,
      schoolDistrict: local.schoolDistrict,
      local: local.total,
      total,
      netIncome,
      effectiveRate: gross ? (total / gross) * 100 : 0,
      ...calculateIncomeBreakdown(netIncome)
    };
  }

  function calculateNetIncome(grossIncome, totalTaxes) {
    return Math.max(0, (Number(grossIncome) || 0) - (Number(totalTaxes) || 0));
  }

  function calculateIncomeBreakdown(netIncome) {
    const net = Math.max(0, Number(netIncome) || 0);
    return {
      monthly: net / 12,
      biweekly: net / 26,
      weekly: net / 52
    };
  }

  function scaleTaxEstimate(estimate, scale, grossOverride = null) {
    const grossIncome = grossOverride === null ? estimate.grossIncome * scale : Math.max(0, Number(grossOverride) || 0);
    const scaled = {
      ...estimate,
      grossIncome,
      federalTaxableIncome: estimate.federalTaxableIncome * scale,
      federal: estimate.federal * scale,
      socialSecurity: estimate.socialSecurity * scale,
      medicare: estimate.medicare * scale,
      fica: estimate.fica * scale,
      ohio: estimate.ohio * scale,
      municipal: estimate.municipal * scale,
      schoolDistrict: estimate.schoolDistrict * scale,
      local: estimate.local * scale,
      total: estimate.total * scale
    };
    scaled.netIncome = calculateNetIncome(grossIncome, scaled.total);
    scaled.effectiveRate = grossIncome ? (scaled.total / grossIncome) * 100 : 0;
    return scaled;
  }

  function combineTaxEstimates(estimates, grossIncome) {
    const combined = estimates.reduce((total, estimate) => {
      ["federal", "socialSecurity", "medicare", "fica", "ohio", "municipal", "schoolDistrict", "local", "manual", "total"].forEach((key) => {
        total[key] += Number(estimate[key]) || 0;
      });
      return total;
    }, emptyTaxEstimate());
    combined.grossIncome = Number(grossIncome) || 0;
    combined.netIncome = calculateNetIncome(combined.grossIncome, combined.total);
    combined.effectiveRate = combined.grossIncome ? (combined.total / combined.grossIncome) * 100 : 0;
    return combined;
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

  // The cash-flow projection should reserve only the required minimum payment,
  // not the accelerated amount needed to hit a payoff-by-date goal. The extra
  // toward the goal is discretionary, so counting it dragged the forecast down
  // and made "projected money" look far worse than reality. Falls back to the
  // planned amount only when no minimum is set.
  function debtProjectionAmount(debt) {
    if ((Number(debt.balance) || 0) <= 0) return 0;
    const minimum = Number(debt.minimumPayment) || 0;
    return minimum > 0 ? minimum : debtPaymentAmount(debt);
  }

  function debtPaymentOccurrencesInRange(debt, range) {
    const amount = debtProjectionAmount(debt);
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
      color: safeHexColor(debt.color, ""),
      minimumPayment: Number(debt.minimumPayment) || 0,
      targetPayment: monthlyDebtTarget(debt)
    }));
  }

  function projectedLowestBalance(current, incomeEntries, billOccurrences, debtPaymentOccurrences, spendingEntries, savingsEntries = []) {
    const events = [];
    incomeEntries.forEach((entry) => events.push({ date: incomeDate(entry), amount: entryNetIncome(entry) }));
    savingsEntries.forEach((entry) => events.push({ date: entry.date, amount: Number(entry.amount) || 0 }));
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
    // Completed / total are scoped to the range (by due date) so weekly/dashboard
    // counts reflect only the assignments that actually fall inside the window.
    const inRange = assignments.filter((assignment) => dateInRange(assignment.dueDate, range));
    const completed = inRange.filter(assignmentComplete);
    return { openDue, overdue, completed, percent: pct(completed.length, inRange.length), total: inRange.length };
  }

  function assignmentComplete(assignment) {
    return normalizedAssignmentStatus(assignment.status) === "completed";
  }

  function setAssignmentStatus(assignmentId, status, trigger = null) {
    const item = findById(appData.school.assignments, assignmentId);
    if (!item) return;
    const nextStatus = normalizedAssignmentStatus(status);
    const currentStatus = normalizedAssignmentStatus(item.status);
    if (nextStatus === currentStatus) return;

    const schoolFilterState = captureSchoolFilterState();
    const card = (trigger && typeof trigger.closest === "function" ? trigger.closest(".assignment-card") : null)
      || app.querySelector(`[data-assignment-card-id="${assignmentId}"]`);

    // Completing always plays the slide-out animation when the card is on screen.
    if (nextStatus === "completed" && card) {
      animateAssignmentCompletion(item, nextStatus, card, schoolFilterState);
      return;
    }

    // Non-completing changes (e.g. marking in progress) keep the card in place
    // and animate the highlight smoothly instead of doing a hard re-render.
    if (card && currentStatus !== "completed") {
      item.status = nextStatus;
      saveData();
      card.classList.toggle("in-progress", nextStatus === "in progress");
      card.querySelectorAll(".assignment-status-option").forEach((btn) => {
        const on = btn.getAttribute("data-assignment-next-status") === nextStatus;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      updateAssignmentBadge(card, item);
      card.classList.remove("status-pulse");
      void card.offsetWidth;
      card.classList.add("status-pulse");
      return;
    }

    item.status = nextStatus;
    saveData();
    render({ quiet: true, transition: "school-filter", schoolFilterState });
  }

  function updateAssignmentBadge(card, assignment) {
    const meta = card.querySelector(".item-meta");
    if (!meta) return;
    const status = normalizedAssignmentStatus(assignment.status);
    const complete = status === "completed";
    const overdue = !complete && isBeforeToday(assignment.dueDate);
    const inProgress = status === "in progress";
    const html = complete
      ? `<span class="assignment-status-tag complete">Completed</span>`
      : overdue
        ? `<span class="assignment-status-tag overdue">Overdue</span>`
        : inProgress
          ? `<span class="assignment-status-tag in-progress">In Progress</span>`
          : "";
    const existing = meta.querySelector(".assignment-status-tag");
    if (existing) existing.remove();
    if (html) meta.insertAdjacentHTML("beforeend", html);
  }

  function animateAssignmentCompletion(item, nextStatus, card, schoolFilterState) {
    card.querySelectorAll("button, select").forEach((control) => {
      control.disabled = true;
    });
    const height = card.getBoundingClientRect().height;
    card.style.height = `${height}px`;
    card.style.maxHeight = `${height}px`;
    card.style.willChange = "height, opacity, transform";
    card.getBoundingClientRect();
    window.requestAnimationFrame(() => {
      card.classList.add("is-completing");
    });
    window.setTimeout(() => {
      item.status = nextStatus;
      saveData();
      render({ quiet: true, transition: "school-filter", schoolFilterState });
    }, 280);
  }

  function animateTaskCompletion(item, card) {
    card.querySelectorAll("button, select").forEach((control) => {
      control.disabled = true;
    });
    const height = card.getBoundingClientRect().height;
    card.style.height = `${height}px`;
    card.style.maxHeight = `${height}px`;
    card.style.willChange = "height, opacity, transform";
    card.getBoundingClientRect();
    window.requestAnimationFrame(() => {
      card.classList.add("is-completing");
    });
    window.setTimeout(() => {
      item.completed = true;
      item.completedAt = nowIso();
      maybeSpawnRecurringTask(item);
      saveData();
      render({ quiet: true });
    }, 300);
  }

  function normalizedAssignmentStatus(status = "") {
    const value = String(status || "").toLowerCase();
    if (value === "submitted" || value === "graded" || value === "complete" || value === "completed") return "completed";
    if (value === "in progress") return "in progress";
    return "not started";
  }

  function assignmentStatusOptions() {
    return [
      { value: "not started", label: "Not Started" },
      { value: "in progress", label: "In Progress" },
      { value: "completed", label: "Completed" }
    ];
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
    const pointsGrade = possible ? (earned / possible) * 100 : null;
    const manualLetter = SCHOOL_GRADES.includes(klass.gradeLetter) ? klass.gradeLetter : "";
    const displayLetter = manualLetter || (pointsGrade !== null ? pctToLetter(pointsGrade) : null);
    const gradeSource = manualLetter ? "Chosen grade" : pointsGrade !== null ? "Estimated from points" : "No grade set yet";
    return {
      id: classId,
      name: klass.name || "Class",
      color: safeHexColor(klass.accentColor, "#7c5cff"),
      total: assignments.length,
      completed,
      percent: pct(completed, assignments.length),
      grade: pointsGrade,
      pointsGrade,
      manualLetter,
      displayLetter,
      gradeSource
    };
  }

  const SCHOOL_GRADES = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];

  function pctToLetter(p) {
    if (p >= 93) return "A";
    if (p >= 90) return "A-";
    if (p >= 87) return "B+";
    if (p >= 83) return "B";
    if (p >= 80) return "B-";
    if (p >= 77) return "C+";
    if (p >= 73) return "C";
    if (p >= 70) return "C-";
    if (p >= 67) return "D+";
    if (p >= 63) return "D";
    if (p >= 60) return "D-";
    return "F";
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
    const items = appData.shopping || [];
    const remaining = items.filter((item) => !item.purchased);
    const purchased = items.filter((item) => item.purchased);
    const groceryRemaining = remaining.filter((item) => !isWishlistItem(item));
    const wishlistRemaining = remaining.filter(isWishlistItem);
    return {
      remainingCount: remaining.length,
      remainingTotal: sum(remaining, (item) => item.estimatedPrice),
      purchasedTotal: sum(purchased, (item) => item.estimatedPrice),
      groceryCount: groceryRemaining.length,
      groceryTotal: sum(groceryRemaining, (item) => item.estimatedPrice),
      wishlistCount: wishlistRemaining.length,
      wishlistTotal: sum(wishlistRemaining, (item) => item.estimatedPrice)
    };
  }

  function remindersInRange(range) {
    return sortByDate(appData.reminders.filter((reminder) => dateInRange(reminder.date, range)), "date");
  }

  function recentWeekRange() {
    // Rolling 7-day window ending today, so yesterday's completions still count
    // even on the first day of a calendar week.
    return { start: dateString(addDays(new Date(), -6)), end: today(), label: "Last 7 days" };
  }

  function weeklySummary() {
    const range = recentWeekRange();
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

  // Background scroll lock. While a modal/overlay is open the page behind it must
  // not scroll (and on iOS must not be touch-scrollable), so we pin <body> and
  // restore the scroll position on close. Reference-counted so stacked overlays
  // (e.g. a form opened from the planner day) behave correctly.
  let scrollLockY = 0;
  let scrollLockCount = 0;
  function lockBodyScroll() {
    if (scrollLockCount === 0) {
      scrollLockY = window.scrollY || window.pageYOffset || 0;
      document.body.style.top = `-${scrollLockY}px`;
      document.body.classList.add("modal-open");
    }
    scrollLockCount += 1;
  }
  function unlockBodyScroll() {
    if (scrollLockCount === 0) return;
    scrollLockCount -= 1;
    if (scrollLockCount === 0) {
      document.body.classList.remove("modal-open");
      document.body.style.top = "";
      window.scrollTo(0, scrollLockY);
    }
  }

  // Long-press action sheet for a note: Edit or Delete.
  function openNoteActions(id) {
    const note = findById(appData.notes.items, id);
    if (!note) return;
    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <div class="action-sheet">
          <div class="action-sheet-title">${escapeHtml(note.title || "Untitled note")}</div>
          <div class="action-sheet-list">
            <button type="button" class="action-sheet-btn" data-note-edit>${icon("edit")}<span>Edit note</span></button>
            <button type="button" class="action-sheet-btn danger-action" data-note-delete>${icon("trash")}<span>Delete note</span></button>
          </div>
          <button type="button" class="action-sheet-cancel" data-action="close-modal">Cancel</button>
        </div>
      </div>`;
    lockBodyScroll();
    const backdrop = modalRoot.querySelector(".modal-backdrop");
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
    backdrop.querySelector("[data-note-edit]").addEventListener("click", () => {
      closeModal();
      ui.notesEditingId = id;
      notesFocusPending = true;
      render();
    });
    backdrop.querySelector("[data-note-delete]").addEventListener("click", () => {
      closeModal();
      if (confirm("Delete this note?")) {
        deleteById(appData.notes.items, id);
        if (ui.notesEditingId === id) ui.notesEditingId = "";
        saveData();
        render({ quiet: true });
      }
    });
  }

  // Interactive bulk-add: fill one assignment's boxes, "Add to list" collapses it
  // into a running summary, fresh boxes appear, repeat, then "Done" commits all.
  function openBulkAssignmentModal(classId = "") {
    const pending = [];
    const typeOptions = [
      { value: "assignment", label: "Assignment" },
      { value: "quiz", label: "Quiz" },
      { value: "exam", label: "Exam" },
      { value: "project", label: "Project" },
      { value: "homework", label: "Homework" },
      { value: "", label: "No type" }
    ];
    const classOptions = [{ value: "", label: "No class" }, ...appData.school.classes.map((k) => ({ value: k.id, label: k.name || "Class" }))];
    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal" id="bulk-modal">
          <div class="modal-header">
            <h2 class="modal-title">Bulk add assignments</h2>
            ${actionButton("close-modal", "", "Close", "x")}
          </div>
          <div class="modal-body">
            <label class="field"><span>Class</span>
              <select id="bulk-class">${classOptions.map((o) => `<option value="${escapeHtml(o.value)}" ${o.value === classId ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}</select>
            </label>

            <div class="bulk-summary" data-bulk-summary hidden></div>

            <div class="bulk-entry">
              <span class="bulk-entry-label" data-bulk-entry-label>New assignment</span>
              <label class="field"><span>Title</span><input id="bulk-title" type="text" placeholder="e.g. Problem set 1" autocomplete="off"></label>
              <div class="bulk-entry-grid">
                <label class="field"><span>Due date</span><input id="bulk-date" type="date"></label>
                <label class="field"><span>Time <em>(optional)</em></span><input id="bulk-time" type="time"></label>
              </div>
              <label class="field"><span>Type</span>
                <select id="bulk-type">${typeOptions.map((o) => `<option value="${escapeHtml(o.value)}" ${o.value === "assignment" ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}</select>
              </label>
              <button type="button" class="secondary bulk-add-btn" data-bulk-add>${icon("plus")}<span>Add to list</span></button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="secondary" data-action="close-modal">Cancel</button>
            <button type="button" class="primary" data-bulk-done>Done <span class="bulk-done-count" data-bulk-count></span></button>
          </div>
        </div>
      </div>
    `;
    lockBodyScroll();

    const modal = modalRoot.querySelector("#bulk-modal");
    const summaryEl = modal.querySelector("[data-bulk-summary]");
    const titleEl = modal.querySelector("#bulk-title");
    const dateEl = modal.querySelector("#bulk-date");
    const timeEl = modal.querySelector("#bulk-time");
    const typeEl = modal.querySelector("#bulk-type");
    const countEl = modal.querySelector("[data-bulk-count]");
    const labelEl = modal.querySelector("[data-bulk-entry-label]");

    const typeLabel = (v) => (typeOptions.find((o) => o.value === v) || {}).label || "";
    const renderSummary = () => {
      countEl.textContent = pending.length ? `· add ${pending.length}` : "";
      labelEl.textContent = pending.length ? `Assignment ${pending.length + 1}` : "New assignment";
      if (!pending.length) { summaryEl.hidden = true; summaryEl.innerHTML = ""; return; }
      summaryEl.hidden = false;
      summaryEl.innerHTML = `
        <span class="bulk-summary-head">${pending.length} added</span>
        ${pending.map((a, i) => `
          <div class="bulk-chip">
            <span class="bulk-chip-main">
              <span class="bulk-chip-title">${escapeHtml(a.title)}</span>
              <span class="bulk-chip-meta">${[a.dueDate ? formatDate(a.dueDate) : "No date", a.dueTime ? formatTime(a.dueTime) : "", typeLabel(a.type)].filter(Boolean).join(" · ")}</span>
            </span>
            <button type="button" class="bulk-chip-del" data-bulk-remove="${i}" aria-label="Remove">${icon("x")}</button>
          </div>`).join("")}
      `;
    };

    const addCurrent = () => {
      const title = titleEl.value.trim();
      if (!title) { titleEl.focus(); modal.querySelector(".bulk-entry").classList.add("bulk-shake"); window.setTimeout(() => modal.querySelector(".bulk-entry")?.classList.remove("bulk-shake"), 400); return false; }
      pending.push({ title, dueDate: dateEl.value || "", dueTime: timeEl.value || "", type: typeEl.value || "" });
      // Keep date + type for the next one (semesters repeat); clear title + time.
      titleEl.value = "";
      timeEl.value = "";
      renderSummary();
      titleEl.focus();
      return true;
    };

    modal.querySelector("[data-bulk-add]").addEventListener("click", addCurrent);
    titleEl.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addCurrent(); } });
    summaryEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-bulk-remove]");
      if (!btn) return;
      pending.splice(Number(btn.dataset.bulkRemove), 1);
      renderSummary();
    });
    modal.querySelector("[data-bulk-done]").addEventListener("click", () => {
      // Include a filled-but-not-yet-added current entry so nothing is lost.
      if (titleEl.value.trim()) addCurrent();
      if (!pending.length) { closeModal(); return; }
      const cls = modal.querySelector("#bulk-class").value || "";
      pending.forEach((a) => appData.school.assignments.push(makeItem({ classId: cls, title: a.title, dueDate: a.dueDate, dueTime: a.dueTime, type: a.type, status: "not started" })));
      saveData();
      closeModal();
      render({ quiet: true });
    });
    window.requestAnimationFrame(() => titleEl.focus());
  }

  function openForm({ title, fields, initial = {}, submitLabel = "Save", onSubmit, livePreview = null, deleteAction = null, deleteId = "", deleteLabel = "Delete" }) {
    const showDelete = Boolean(deleteAction && deleteId);
    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <form class="modal" id="active-form">
          <div class="modal-header">
            <h2 class="modal-title">${escapeHtml(title)}</h2>
            ${actionButton("close-modal", "", "Close", "x")}
          </div>
          <div class="modal-body">
            <div class="form-grid">
              ${fields.map((field) => `<div class="form-field-wrap" data-field-wrap="${escapeHtml(field.name)}">${renderField(field, initial[field.name])}</div>`).join("")}
            </div>
            ${livePreview ? `<div class="form-live-preview" data-form-live-preview>${livePreview(initial)}</div>` : ""}
            ${showDelete ? `
            <div class="modal-delete-zone">
              <button type="button" class="modal-delete-btn" data-form-delete>${icon("trash")}<span>${escapeHtml(deleteLabel)}</span></button>
            </div>` : ""}
          </div>
          <div class="modal-footer">
            <button type="button" class="secondary" data-action="close-modal">Cancel</button>
            <button type="submit" class="primary">${escapeHtml(submitLabel)}</button>
          </div>
        </form>
      </div>
    `;
    lockBodyScroll();
    const form = document.getElementById("active-form");

    // Progressive disclosure: fields with a showIf(values) predicate appear/hide
    // as the controlling fields change, so the form only shows what's relevant.
    const hasConditional = fields.some((field) => typeof field.showIf === "function");
    const applyConditional = () => {
      if (!hasConditional) return;
      const values = collectFormValues(form, fields);
      fields.forEach((field) => {
        if (typeof field.showIf !== "function") return;
        const wrap = form.querySelector(`[data-field-wrap="${field.name}"]`);
        if (wrap) wrap.hidden = !field.showIf(values);
      });
    };
    if (hasConditional) {
      form.addEventListener("input", applyConditional);
      form.addEventListener("change", applyConditional);
      applyConditional();
    }

    // Stepper number pickers and add/remove exercise rows (used by the exercises field).
    form.addEventListener("click", (event) => handleFormControlClick(event, form));

    if (showDelete) {
      const delBtn = form.querySelector("[data-form-delete]");
      if (delBtn) delBtn.addEventListener("click", () => {
        closeModal();
        window.setTimeout(() => handleAction(deleteAction, { dataset: { id: deleteId }, closest: () => null }), 10);
      });
    }
    if (livePreview) {
      const updatePreview = () => {
        const preview = form.querySelector("[data-form-live-preview]");
        if (!preview) return;
        preview.innerHTML = livePreview({ ...initial, ...collectFormValues(form, fields) });
      };
      form.addEventListener("input", updatePreview);
      form.addEventListener("change", updatePreview);
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = collectFormValues(form, fields);
      if (onSubmit(values) === false) return;
      closeModal();
      saveData();
      render({ quiet: true });
    });
  }

  // ---------- Stepper / exercise field helpers ----------
  function stepperHtml(key, label, value, { min = 0, max = "", step = 1 } = {}) {
    const val = Number(value) || 0;
    return `
      <div class="stepper" data-stepper="${escapeHtml(key)}" data-value="${val}" data-min="${min}" data-max="${max}" data-step="${step}">
        <span class="stepper-label">${escapeHtml(label)}</span>
        <div class="stepper-controls">
          <button type="button" class="stepper-btn" data-stepper-dec aria-label="Decrease ${escapeHtml(label)}">−</button>
          <span class="stepper-value">${val}</span>
          <button type="button" class="stepper-btn" data-stepper-inc aria-label="Increase ${escapeHtml(label)}">+</button>
        </div>
      </div>
    `;
  }

  function exerciseRowHtml(ex = {}) {
    return `
      <div class="exercise-row" data-exercise-row>
        <div class="exercise-row-top">
          <input type="text" class="exercise-name" placeholder="Exercise name" value="${escapeHtml(ex.name && ex.name !== "Exercise" ? ex.name : "")}">
          <button type="button" class="exercise-remove" data-exercise-remove aria-label="Remove exercise">${icon("trash")}</button>
        </div>
        <div class="exercise-steppers">
          ${stepperHtml("sets", "Sets", ex.sets ?? 3, { min: 0, max: 20, step: 1 })}
          ${stepperHtml("reps", "Reps", ex.reps ?? 10, { min: 0, max: 100, step: 1 })}
          ${stepperHtml("weight", "Weight", ex.weight ?? 0, { min: 0, max: 2000, step: 5 })}
        </div>
      </div>
    `;
  }

  function handleFormControlClick(event, form) {
    const stepBtn = event.target.closest("[data-stepper-inc], [data-stepper-dec]");
    if (stepBtn) {
      const stepper = stepBtn.closest("[data-stepper]");
      if (!stepper) return;
      const min = stepper.dataset.min !== "" ? Number(stepper.dataset.min) : 0;
      const max = stepper.dataset.max !== "" ? Number(stepper.dataset.max) : Infinity;
      const step = Number(stepper.dataset.step) || 1;
      let val = Number(stepper.dataset.value) || 0;
      val += stepBtn.hasAttribute("data-stepper-inc") ? step : -step;
      val = Math.max(min, Math.min(max, val));
      stepper.dataset.value = String(val);
      stepper.querySelector(".stepper-value").textContent = String(val);
      return;
    }
    if (event.target.closest("[data-exercise-add]")) {
      const rows = form.querySelector("[data-exercise-rows]");
      if (rows) {
        rows.insertAdjacentHTML("beforeend", exerciseRowHtml({}));
        rows.lastElementChild?.querySelector(".exercise-name")?.focus();
      }
      return;
    }
    const removeBtn = event.target.closest("[data-exercise-remove]");
    if (removeBtn) {
      removeBtn.closest("[data-exercise-row]")?.remove();
    }
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
    if (field.type === "color-swatches") {
      const current = String(value ?? field.default ?? "");
      return `
        <fieldset class="field color-field">
          <legend>${escapeHtml(field.label)}</legend>
          <div class="color-swatches">
            ${field.options.map((option, index) => {
              const opt = typeof option === "string" ? { value: option, label: option } : option;
              const optionId = `field-${field.name}-${index}`;
              const selected = current === String(opt.value);
              const swatchStyle = opt.value ? ` style="--swatch-color:${escapeHtml(opt.value)}"` : "";
              return `
                <label class="color-choice" for="${escapeHtml(optionId)}" title="${escapeHtml(opt.label)}">
                  <input id="${escapeHtml(optionId)}" type="radio" name="${escapeHtml(field.name)}" value="${escapeHtml(opt.value)}" ${selected ? "checked" : ""}>
                  <span class="color-swatch ${opt.value ? "" : "no-color"}"${swatchStyle}></span>
                  <span>${escapeHtml(opt.label)}</span>
                </label>
              `;
            }).join("")}
          </div>
          ${field.help ? `<span class="tiny">${escapeHtml(field.help)}</span>` : ""}
        </fieldset>
      `;
    }
    if (field.type === "exercises") {
      const list = Array.isArray(value) ? value : (Array.isArray(field.default) ? field.default : []);
      const rows = list.length ? list : [{}];
      return `
        <fieldset class="field exercises-field">
          <legend>${escapeHtml(field.label)}</legend>
          <div class="exercise-rows" data-exercise-rows>
            ${rows.map((ex) => exerciseRowHtml(ex)).join("")}
          </div>
          <button type="button" class="exercise-add" data-exercise-add>${icon("plus")}<span>Add exercise</span></button>
          ${field.help ? `<span class="tiny">${escapeHtml(field.help)}</span>` : ""}
        </fieldset>
      `;
    }
    if (field.type === "weekdays") {
      const raw = Array.isArray(value) ? value : (Array.isArray(field.default) ? field.default : []);
      const current = raw.map(Number);
      return `
        <fieldset class="field weekdays-field">
          <legend>${escapeHtml(field.label)}</legend>
          <div class="weekday-options">
            ${["S", "M", "T", "W", "T", "F", "S"].map((lbl, i) => {
              const on = current.includes(i);
              return `
                <label class="weekday-choice" title="${escapeHtml(WEEKDAY_SHORT[i])}">
                  <input type="checkbox" name="${escapeHtml(field.name)}" value="${i}" ${on ? "checked" : ""}>
                  <span>${escapeHtml(lbl)}</span>
                </label>`;
            }).join("")}
          </div>
          ${field.help ? `<span class="tiny">${escapeHtml(field.help)}</span>` : ""}
        </fieldset>
      `;
    }
    if (field.type === "chips") {
      const current = String(value ?? field.default ?? "");
      return `
        <fieldset class="field chips-field">
          <legend>${escapeHtml(field.label)}</legend>
          <div class="chips-options">
            ${field.options.map((option, index) => {
              const opt = typeof option === "string" ? { value: option, label: option } : option;
              const optionId = `field-${field.name}-${index}`;
              const selected = current === String(opt.value);
              return `
                <label class="chip-choice" for="${escapeHtml(optionId)}">
                  <input id="${escapeHtml(optionId)}" type="radio" name="${escapeHtml(field.name)}" value="${escapeHtml(opt.value)}" ${selected ? "checked" : ""}>
                  <span>${escapeHtml(opt.label)}</span>
                </label>`;
            }).join("")}
          </div>
          ${field.help ? `<span class="tiny">${escapeHtml(field.help)}</span>` : ""}
        </fieldset>
      `;
    }
    if (field.type === "textarea") {
      return `${label}<textarea ${common} ${placeholder}>${escapeHtml(value ?? field.default ?? "")}</textarea>${field.help ? `<span class="tiny">${escapeHtml(field.help)}</span>` : ""}</label>`;
    }
    if (field.type === "checkbox") {
      return `<label class="checkbox-row"><input type="checkbox" name="${escapeHtml(field.name)}" ${value ?? field.default ? "checked" : ""}> <span>${escapeHtml(field.label)}${field.help ? `<small>${escapeHtml(field.help)}</small>` : ""}</span></label>`;
    }
    return `${label}<input type="${escapeHtml(field.type || "text")}" ${common} ${placeholder} ${step} ${min} ${max} value="${escapeHtml(value ?? field.default ?? "")}">${field.help ? `<span class="tiny">${escapeHtml(field.help)}</span>` : ""}</label>`;
  }

  function collectFormValues(form, fields) {
    const values = {};
    fields.forEach((field) => {
      // Skip fields hidden by progressive disclosure so stale values aren't saved.
      const wrap = form.querySelector(`[data-field-wrap="${field.name}"]`);
      if (wrap && wrap.hidden) return;
      if (field.type === "exercises") {
        const rows = [...form.querySelectorAll("[data-exercise-row]")];
        values[field.name] = rows.map((row) => {
          const rawName = row.querySelector(".exercise-name")?.value.trim() || "";
          const stepVal = (key) => Number(row.querySelector(`[data-stepper="${key}"]`)?.dataset.value) || 0;
          return { name: rawName, sets: stepVal("sets"), reps: stepVal("reps"), weight: stepVal("weight") };
        }).filter((ex) => ex.name || ex.sets || ex.reps || ex.weight).map((ex) => ({ ...ex, name: ex.name || "Exercise" }));
        return;
      }
      if (field.type === "weekdays") {
        const nodes = form.querySelectorAll(`input[name="${field.name}"]`);
        values[field.name] = [...nodes].filter((node) => node.checked).map((node) => Number(node.value)).sort((a, b) => a - b);
        return;
      }
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
    unlockBodyScroll();
    backdrop.classList.add("closing");
    window.setTimeout(() => {
      if (backdrop.isConnected) modalRoot.innerHTML = "";
    }, 155);
  }

  function handleDetailsSummaryClick(event) {
    const summary = event.target.closest("summary");
    if (!summary) return false;
    const details = summary.parentElement;
    if (!details || details.tagName?.toLowerCase() !== "details") return false;
    if (event.target.closest("button, [data-action], a, input, select, textarea, label")) return false;

    event.preventDefault();
    if (details.classList.contains("is-closing")) return true;
    toggleDetails(details, summary);
    return true;
  }

  const DETAILS_ANIM_MS = 460;

  const DETAILS_EASE = "cubic-bezier(0.22, 0.72, 0.18, 1)";
  const prefersReducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Smooth collapse via the Web Animations API: it animates the body's height to
  // an EXACT pixel target (0 when closing) and fires `finish` precisely at the
  // end — no grid `fr` residual that "stops short", and no fallback-timer pause.
  function toggleDetails(details, summary = details.querySelector(":scope > summary")) {
    const body = details.querySelector(":scope > .details-body");
    if (!body || typeof body.animate !== "function") return toggleDetailsHeight(details, summary);
    if (details.dataset.animating === "1") return;

    if (prefersReducedMotion()) {
      details.open = !details.open;
      return;
    }

    details.dataset.animating = "1";
    details.classList.add("is-details-animating");
    // Move the body's padding into a single inner `.dcl` wrapper so the body
    // itself has zero padding and collapses to a TRUE 0 (otherwise the body's
    // bottom padding floors the height at ~14px = the "stops short" residual).
    if (!body.querySelector(":scope > .dcl")) {
      const inner = document.createElement("div");
      inner.className = "dcl";
      while (body.firstChild) inner.appendChild(body.firstChild);
      body.appendChild(inner);
      body.classList.add("dcl-host");
    }
    const clearFlags = () => {
      body.style.willChange = "";
      details.dataset.animating = "";
      details.classList.remove("is-details-animating");
    };
    body.style.overflow = "hidden";
    body.style.willChange = "height";

    if (details.open) {
      // Close: animate to exactly 0 and KEEP it pinned at 0 — this engine does not
      // hide details content on open=false, so clearing height would spring it back.
      const start = body.scrollHeight;
      const anim = body.animate(
        [{ height: `${start}px` }, { height: "0px" }],
        { duration: DETAILS_ANIM_MS, easing: DETAILS_EASE, fill: "none" }
      );
      const done = () => {
        body.style.height = "0px";
        body.style.overflow = "hidden";
        details.open = false;
        clearFlags();
      };
      anim.onfinish = done;
      anim.oncancel = done;
    } else {
      details.open = true;
      body.style.height = "0px";
      const end = body.scrollHeight;
      const anim = body.animate(
        [{ height: "0px" }, { height: `${end}px` }],
        { duration: DETAILS_ANIM_MS, easing: DETAILS_EASE, fill: "none" }
      );
      const done = () => {
        body.style.height = "";
        body.style.overflow = "";
        clearFlags();
      };
      anim.onfinish = done;
      anim.oncancel = done;
    }
  }

  function toggleDetailsHeight(details, summary = details.querySelector(":scope > summary")) {
    if (details.open) {
      const collapsedHeight = (summary?.offsetHeight || 0);
      const startHeight = details.offsetHeight;
      details.style.height = `${startHeight}px`;
      details.classList.add("is-details-animating", "is-closing");
      details.offsetHeight;
      window.requestAnimationFrame(() => {
        if (details.isConnected) details.style.height = `${collapsedHeight}px`;
      });
      window.setTimeout(() => {
        if (!details.isConnected) return;
        details.open = false;
        details.style.height = "";
        details.classList.remove("is-details-animating", "is-closing");
      }, DETAILS_ANIM_MS + 20);
    } else {
      const startHeight = details.offsetHeight;
      details.open = true;
      const endHeight = details.scrollHeight;
      details.style.height = `${startHeight}px`;
      details.classList.add("is-details-animating", "is-opening");
      details.offsetHeight;
      window.requestAnimationFrame(() => {
        if (details.isConnected) details.style.height = `${endHeight}px`;
      });
      window.setTimeout(() => {
        if (!details.isConnected) return;
        details.style.height = "";
        details.classList.remove("is-details-animating", "is-opening");
      }, DETAILS_ANIM_MS + 20);
    }
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

  function habitFields(initial = {}) {
    return [
      { name: "title", label: "Daily task name", required: true },
      { name: "days", label: "Repeat on", type: "weekdays", default: habitDays(initial), help: "Pick the days this habit is scheduled (e.g. gym on Mon/Wed/Sat). Leave all off to repeat every day. Completion only counts the days you choose, so rest days never lower your %." }
    ];
  }

  const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function habitScheduleLabel(habit) {
    const days = habitDays(habit);
    if (!days.length || days.length === 7) return "Every day";
    return [...days].sort((a, b) => a - b).map((d) => WEEKDAY_SHORT[d]).join(" · ");
  }

  function taskFields(initial = {}) {
    return [
      { name: "title", label: "Title", required: true },
      { name: "category", label: "Category", type: "select", options: [{ value: "", label: "No category" }, ...appData.settings.taskCategories.map((category) => ({ value: category, label: category }))], default: initial.category || "" },
      { name: "dueDate", label: "Date", type: "date", default: initial.dueDate ?? today(), help: "Optional. Leave blank for an \"Anytime\" task with no timeframe; pick a date to sort it into Today / Upcoming / Overdue." },
      { name: "repeat", label: "Repeat", type: "select", options: [{ value: "", label: "Don't repeat" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "biweekly", label: "Every 2 weeks" }, { value: "monthly", label: "Monthly" }], default: initial.repeat || "", help: "Needs a date. When you complete this task, the next one is created automatically on its next date." },
      { name: "startTime", label: "Start time", type: "time", default: initial.startTime || initial.reminderTime || "", help: "Optional. Add a time to place this on the calendar." },
      { name: "endTime", label: "End time", type: "time", default: initial.endTime || "", help: "Optional. Set with a start time for a scheduled block (e.g. a meeting)." },
      { name: "classId", label: "Class (optional)", type: "select", options: [{ value: "", label: "No class" }, ...appData.school.classes.map((klass) => ({ value: klass.id, label: klass.name || "Class" }))], default: initial.classId || "" },
      { name: "priority", label: "Priority", type: "select", options: [{ value: "", label: "No priority" }, "Low", "Medium", "High"], default: initial.priority || "" },
      { name: "color", label: "Calendar color", type: "color-swatches", options: [{ value: "", label: "Auto" }, ...colorSwatches.map((color) => ({ value: color, label: color }))], default: initial.color || "", help: "Pick a color for this item on the calendar. Auto uses the default type color." },
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
      { name: "hourlyWage", label: "Hourly wage", type: "number", step: "0.01" },
      { name: "hours", label: "Hours worked", type: "number", step: "0.1" },
      { name: "amount", label: "Manual amount", type: "number", step: "0.01" },
      { name: "date", label: "Date", type: "date", default: today(), required: true },
      { name: "payDate", label: "Pay date", type: "date" },
      { name: "taxMode", label: "Tax handling", type: "select", options: [{ value: "none", label: "No tax calculation" }, { value: "auto", label: "Automatic full estimate" }, { value: "manual", label: "Manual tax entry" }], default: "none" },
      { name: "manualTaxAmount", label: "Manual tax amount", type: "number", step: "0.01", min: 0, help: "Used only when Manual tax entry is selected." },
      { name: "annualGrossIncome", label: "Annual income override", type: "number", min: 0, step: "0.01", help: "Optional for automatic estimate. Leave blank to annualize this entry." },
      { name: "w2Income", label: "W-2 wage income", type: "checkbox", default: taxSettings().w2Income, help: "Used only for automatic estimates." },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function billFields() {
    return [
      { name: "name", label: "Bill name", required: true },
      { name: "amount", label: "Amount", type: "number", step: "0.01", required: true },
      { name: "dueDate", label: "Due date", type: "date", default: today(), required: true },
      { name: "billType", label: "Payment type", type: "select", options: [{ value: "bill", label: "Bill (mandatory)" }, { value: "subscription", label: "Subscription (optional)" }], default: "bill" },
      { name: "color", label: "Bill color", type: "color-swatches", options: [{ value: "", label: "No color" }, ...colorSwatches.map((color) => ({ value: color, label: color }))], default: "", help: "Use No color for a neutral bill card." },
      { name: "frequency", label: "Frequency", type: "select", options: ["weekly", "monthly", "yearly", "custom", "one-time"], default: "monthly" },
      { name: "customDays", label: "Custom frequency days", type: "number", min: 1, default: 30 },
      { name: "category", label: "Category", type: "select", options: [{ value: "", label: "No category" }, ...appData.settings.billCategories.map((category) => ({ value: category, label: category }))] },
      { name: "paid", label: "Paid", type: "checkbox" },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function spendingFields() {
    const cards = creditCardDebts();
    const accounts = appData.finance.accounts || [];
    return [
      { name: "amount", label: "Amount", type: "number", step: "0.01", required: true },
      { name: "category", label: "Category", type: "select", options: [{ value: "", label: "No category" }, ...appData.settings.spendingCategories.map((category) => ({ value: category, label: category }))] },
      { name: "date", label: "Date", type: "date", default: today(), required: true },
      { name: "note", label: "Note", type: "text" },
      {
        name: "paymentMethod",
        label: "Payment method",
        type: "select",
        options: ["Debit card", "Cash", "Credit card"],
        default: "Debit card",
        help: "Cash and debit lower available account balances. Credit raises the selected card balance."
      },
      {
        name: "accountId",
        label: "Paid from account",
        type: "select",
        options: [
          { value: "", label: accounts.length ? "Auto-select account" : "No accounts added" },
          ...accounts.map((account) => ({ value: account.id, label: account.name || "Account" }))
        ],
        help: "Which account this came out of.",
        showIf: (v) => v.paymentMethod !== "Credit card"
      },
      {
        name: "debtId",
        label: "Credit card account",
        type: "select",
        options: [
          { value: "", label: cards.length ? "No linked card" : "No credit cards added" },
          ...cards.map((debt) => ({ value: debt.id, label: debt.name || "Credit card" }))
        ],
        help: cards.length ? "This spending increases that card's balance." : "Add a credit card in Debt repayment to link spending.",
        showIf: (v) => v.paymentMethod === "Credit card"
      },
      { name: "necessary", label: "Necessary spending", type: "checkbox", default: true, help: "Used for needs vs wants analytics." }
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
      { name: "color", label: "Card color", type: "color-swatches", options: [{ value: "", label: "No color" }, ...colorSwatches.map((color) => ({ value: color, label: color }))], default: "", help: "Color-codes this debt on its card and the dashboard." },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function savingFields() {
    const accounts = appData.finance.accounts || [];
    const goals = appData.finance.savingsGoals || [];
    return [
      { name: "amount", label: "Saved amount", type: "number", step: "0.01", min: 0, required: true },
      { name: "date", label: "Date", type: "date", default: today(), required: true },
      {
        name: "accountId",
        label: "Savings account",
        type: "select",
        options: [
          { value: "", label: accounts.length ? "Auto-select savings account" : "No accounts added" },
          ...accounts.map((account) => ({ value: account.id, label: `${account.name || "Account"}${String(account.type || "").toLowerCase().includes("saving") ? " (savings)" : ""}` }))
        ],
        default: defaultSavingsAccountId(),
        help: "This deposit increases total current money and this account's available balance."
      },
      {
        name: "goalId",
        label: "Savings goal",
        type: "select",
        options: [
          { value: "", label: goals.length ? "No linked goal" : "No savings goals added" },
          ...goals.map((goal) => ({ value: goal.id, label: goal.name || "Savings goal" }))
        ]
      },
      { name: "note", label: "Note", type: "text" }
    ];
  }

  function savingsGoalFields() {
    return [
      { name: "name", label: "Goal name", required: true },
      { name: "targetAmount", label: "Target amount", type: "number", step: "0.01", min: 0, required: true },
      { name: "initialAmount", label: "Already saved", type: "number", step: "0.01", min: 0, help: "Use this if money was already in savings before tracking deposits here." },
      { name: "targetDate", label: "Target date", type: "date" },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function goalFields() {
    const savingsGoals = appData.finance.savingsGoals || [];
    return [
      { name: "title", label: "Goal title", required: true },
      { name: "category", label: "Category", default: "Personal" },
      { name: "targetDate", label: "Target date", type: "date" },
      {
        name: "linkedSavingsGoalId",
        label: "Linked savings goal",
        type: "select",
        options: [
          { value: "", label: savingsGoals.length ? "No linked savings goal" : "No savings goals added" },
          ...savingsGoals.map((goal) => ({ value: goal.id, label: goal.name || "Savings goal" }))
        ],
        help: "When linked, this dashboard goal uses the savings goal progress automatically."
      },
      { name: "progressPercent", label: "Manual progress", type: "number", min: 0, max: 100, step: "1", default: 0, help: "Used only when no savings goal is linked." },
      { name: "completed", label: "Goal completed", type: "checkbox" },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function debtPaymentFields() {
    const accounts = appData.finance.accounts || [];
    return [
      { name: "amount", label: "Payment amount", type: "number", step: "0.01", min: 0, required: true },
      {
        name: "accountId",
        label: "Paid from account",
        type: "select",
        options: [
          { value: "", label: accounts.length ? "Auto-select account" : "No accounts added" },
          ...accounts.map((account) => ({ value: account.id, label: account.name || "Account" }))
        ],
        default: defaultSpendingAccountId("Debit card")
      },
      { name: "date", label: "Payment date", type: "date", default: today() },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function investmentFields(initial = {}) {
    return [
      { name: "name", label: "Investment name", required: true },
      { name: "type", label: "Type", type: "select", options: ["stock", "crypto", "retirement", "other"] },
      { name: "shares", label: "Shares / units", type: "number", step: "0.0001", help: "Optional. For stocks/crypto, enter how many shares you hold and use the price fields below." },
      { name: "costBasis", label: "Avg buy price (per share)", type: "number", step: "0.01", help: "What you paid per share on average." },
      { name: "currentPrice", label: "Current price (per share)", type: "number", step: "0.01", help: "Update this as the price moves to keep value accurate." },
      { name: "amountInvested", label: "Total invested", type: "number", step: "0.01", help: "Used only if you don't enter shares & buy price." },
      { name: "currentValue", label: "Current total value", type: "number", step: "0.01", help: "Used only if you don't enter shares & current price." },
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

  const BULK_ASSIGNMENT_TYPES = ["assignment", "quiz", "exam", "project", "homework", "lab", "reading", "test", "paper", "essay", "other"];

  // Parse a flexible date string used by bulk assignment entry: 2026-09-05, 9/5,
  // 9/5/26, 9/5/2026, or anything Date can read. Returns "" if not a date.
  function parseFlexibleDate(str) {
    const s = String(str || "").trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (m) {
      const mo = Number(m[1]);
      const da = Number(m[2]);
      if (mo < 1 || mo > 12 || da < 1 || da > 31) return "";
      const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : new Date().getFullYear();
      return `${year}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? "" : dateString(d);
  }

  // Turn a multi-line block into assignments. Each line: "Title, due date, type"
  // (date and type optional, any order at the end). Titles may contain commas.
  function parseBulkAssignments(text, classId, defaultType) {
    const created = [];
    String(text || "").split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      if (!line) return;
      const segs = line.split(",").map((s) => s.trim());
      while (segs.length > 1 && !segs[segs.length - 1]) segs.pop();
      let type = defaultType || "";
      let dueDate = "";
      // Pull a trailing type keyword and a trailing date off the end, in any order.
      for (let pass = 0; pass < 2 && segs.length > 1; pass++) {
        const last = segs[segs.length - 1];
        if (!dueDate && parseFlexibleDate(last)) { dueDate = parseFlexibleDate(last); segs.pop(); continue; }
        if (BULK_ASSIGNMENT_TYPES.includes(last.toLowerCase())) { type = last.toLowerCase(); segs.pop(); continue; }
        break;
      }
      const title = segs.join(", ").trim();
      if (!title) return;
      created.push(makeItem({ classId: classId || "", title, type, dueDate, status: "not started" }));
    });
    return created;
  }

  function bulkAssignmentFields(classId = "") {
    return [
      { name: "classId", label: "Class", type: "select", options: [{ value: "", label: "No class" }, ...appData.school.classes.map((k) => ({ value: k.id, label: k.name || "Class" }))], default: classId },
      { name: "type", label: "Default type", type: "select", options: [{ value: "assignment", label: "Assignment" }, "quiz", "exam", "project", "homework", { value: "", label: "No type" }], default: "assignment", help: "Used for any row that doesn't name its own type." },
      { name: "bulk", label: "Assignments (one per line)", type: "textarea", required: true, help: "Title, due date, type — date & type optional. e.g. \"Problem set 1, 9/5\" · \"Midterm, 2026-10-14, exam\" · \"Final project\"" }
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
      { name: "status", label: "Status", type: "select", options: assignmentStatusOptions() },
      { name: "grade", label: "Grade", type: "text" },
      { name: "pointsEarned", label: "Points earned", type: "number", step: "0.01" },
      { name: "pointsPossible", label: "Points possible", type: "number", step: "0.01" },
      { name: "link", label: "Link", type: "url" },
      { name: "notes", label: "Notes", type: "textarea" }
    ];
  }

  function workoutFields(initial = {}) {
    const isLift = (v) => (v.type || "lift") === "lift";
    const isCardio = (v) => v.type === "run" || v.type === "other";
    return [
      { name: "date", label: "Date", type: "date", default: today(), required: true },
      { name: "type", label: "Type", type: "select", options: [{ value: "lift", label: "Lifting / Gym" }, { value: "run", label: "Run" }, { value: "other", label: "Other cardio" }], default: "lift", help: "Runs track distance & pace; lifts track sets and volume." },
      { name: "split", label: "Split / focus", type: "select", options: ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body", "Cardio", "Rest", "Custom"], showIf: isLift },
      { name: "distance", label: "Distance (miles)", type: "number", step: "0.01", help: "For runs and cardio.", showIf: isCardio },
      { name: "startTime", label: "Start time", type: "time", help: "Schedules this workout on your planner and calendar" },
      { name: "endTime", label: "End time", type: "time" },
      { name: "duration", label: "Duration minutes", type: "number", step: "1" },
      { name: "energy", label: "Energy level", type: "number", min: 1, max: 5, step: "1" },
      { name: "exercises", label: "Exercises", type: "exercises", default: initial.exercises || [], help: "Type the exercise name, then tap − / + to set sets, reps, and weight.", showIf: isLift },
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
      { name: "estimatedPrice", label: "Price", type: "number", step: "0.01" },
      { name: "listType", label: "List", type: "select", options: [{ value: "grocery", label: "Grocery cart" }, { value: "wishlist", label: "Wishlist item" }], default: "grocery", help: "Grocery items add into a cart total; wishlist items are bigger things you want to buy." },
      { name: "store", label: "Store / source", type: "text" },
      { name: "purchased", label: "Got it", type: "checkbox" },
      { name: "notes", label: "Notes", type: "textarea" }
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
    return spendingUsesCredit(entry) ? Number(entry?.amount) || 0 : 0;
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
    const normalizedValues = normalizeSpendingValues(values);
    const previous = id ? { ...findById(appData.finance.spending, id) } : null;
    const next = normalizeSpendingValues({ ...(previous || {}), ...normalizedValues });
    if (previous?.debtId && previous.debtId === next.debtId) {
      const item = upsert(appData.finance.spending, id, next);
      adjustDebtBalance(item.debtId, spendingDebtAmount(item) - spendingDebtAmount(previous));
      return item;
    }
    if (previous) applySpendingDebtImpact(previous, -1);
    const item = upsert(appData.finance.spending, id, next);
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
    if (action === "toggle-finance-bar") {
      ui.financeBarCollapsed = !ui.financeBarCollapsed;
      app.querySelector("[data-finance-bar]")?.classList.toggle("is-collapsed", ui.financeBarCollapsed);
      saveUi();
      return;
    }
    if (action === "set-income-gran") {
      ui.incomeChartGran = validIncomeGran(button.dataset.gran);
      saveUi();
      return refreshIncomeChart();
    }
    if (action === "toggle-income-compare") {
      ui.incomeCompareOn = !ui.incomeCompareOn;
      saveUi();
      const wrap = app.querySelector(".income-compare-wrap");
      if (!wrap) return refreshIncomeChart();
      wrap.toggleAttribute("data-open", ui.incomeCompareOn);
      button.classList.toggle("active", ui.incomeCompareOn);
      const label = button.querySelector("[data-compare-label]");
      if (label) label.textContent = ui.incomeCompareOn ? "Hide month comparison" : "Compare two months";
      if (ui.incomeCompareOn) {
        // re-trigger the bar grow once the panel is open
        wrap.querySelectorAll(".income-compare-bar i").forEach((bar) => {
          bar.style.animation = "none";
          void bar.offsetWidth;
          bar.style.animation = "";
        });
      }
      return;
    }
    if (action === "jump-finance-section") {
      const key = button.dataset.section;
      const target = key ? document.getElementById(`finance-section-${key}`) : null;
      if (!target) return;
      if (!target.open) target.open = true;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.remove("is-jump-target");
      void target.offsetWidth;
      target.classList.add("is-jump-target");
      window.setTimeout(() => {
        if (target.isConnected) target.classList.remove("is-jump-target");
      }, 1400);
      return;
    }
    if (action === "set-dashboard-span") {
      ui.dashboardSpan = button.dataset.span;
      return render({ quiet: true, transition: "period" });
    }
    if (action === "set-dashboard-style") {
      ui.dashboardStyle = button.dataset.style;
      return render({ quiet: true });
    }
    if (action === "set-finance-span") {
      ui.financeSpan = button.dataset.span;
      return render({ quiet: true, transition: "period" });
    }
    if (action === "set-finance-section") {
      ui.financeSection = button.dataset.section || "current-money";
      saveUi();
      return render({ quiet: true, transition: "period" });
    }
    if (action === "set-more-view") {
      const nextView = button.dataset.view;
      if (!nextView) return;
      const content = app.querySelector(".more-content");
      selectMoreRow(nextView, button);
      if (nextView === ui.moreView) {
        clearTimeout(moreSwitchTimer);
        morePendingView = null;
        if (content) content.classList.remove("is-leaving");
        return;
      }
      if (nextView === morePendingView) return;
      clearTimeout(moreSwitchTimer);
      morePendingView = nextView;
      if (content) {
        content.classList.add("is-leaving");
        moreSwitchTimer = window.setTimeout(() => {
          ui.moreView = morePendingView || nextView;
          morePendingView = null;
          saveUi();
          if (content.isConnected) {
            content.outerHTML = `
              <div class="more-content" data-more-content="${escapeHtml(ui.moreView)}">
                ${renderMoreView()}
              </div>
            `;
            const newContent = app.querySelector(".more-content");
            if (newContent) {
              animateProgressIndicators(newContent);
              animateCountElements(newContent);
            }
          } else {
            render({ quiet: true });
          }
        }, 115);
      } else {
        ui.moreView = nextView;
        morePendingView = null;
        render({ quiet: true });
      }
      return;
    }
    if (action === "set-school-class-filter") {
      const schoolFilterState = captureSchoolFilterState();
      ui.schoolClassFilter = button.dataset.classId || id || "all";
      return render({ quiet: true, transition: "school-filter", schoolFilterState, keepSelectedClassFilter: true });
    }
    if (action === "set-school-assignment-filter") {
      const schoolFilterState = captureSchoolFilterState();
      ui.schoolAssignmentFilter = button.dataset.assignmentFilter || "active";
      return render({ quiet: true, transition: "school-filter", schoolFilterState });
    }
    if (action === "set-school-span") {
      ui.schoolSpan = button.dataset.span || "all";
      return render({ quiet: true, transition: "period" });
    }
    if (action === "open-class") {
      ui.selectedClassId = id || button.dataset.id || "";
      ui.schoolView = "class";
      ui.calendarSelectedDate = "";
      window.scrollTo({ top: 0, behavior: "auto" });
      render();
      app.querySelector(".view")?.classList.add("view-slide-fwd");
      return;
    }
    if (action === "back-to-school") {
      ui.schoolView = "overview";
      ui.calendarSelectedDate = "";
      window.scrollTo({ top: 0, behavior: "auto" });
      render();
      app.querySelector(".view")?.classList.add("view-slide-back");
      return;
    }
    if (action === "school-calendar-prev" || action === "school-calendar-next") {
      // The school calendar card is always a month grid; its arrows step the
      // month regardless of the main calendar tab's view, and never touch it.
      const dir = action === "school-calendar-next" ? 1 : -1;
      ui.calendarMonth = shiftCalendarMonth(currentCalendarMonth(), dir);
      return render({ quiet: true });
    }
    if (action === "school-select-calendar-day") {
      // Selecting a day in the school card only toggles the detail panel; it
      // must not flip the main calendar into day view.
      const d = button.dataset.date || "";
      ui.calendarSelectedDate = ui.calendarSelectedDate === d ? "" : d;
      return render({ quiet: true });
    }
    if (action === "calendar-prev" || action === "calendar-next") {
      const dir = action === "calendar-next" ? 1 : -1;
      const view = ui.calendarView || "month";
      if (view === "day") {
        ui.calendarSelectedDate = dateString(addDays(parseDate(calendarAnchorDate()), dir));
      } else if (view === "week") {
        ui.calendarSelectedDate = dateString(addDays(parseDate(calendarAnchorDate()), dir * 7));
      } else {
        ui.calendarMonth = shiftCalendarMonth(currentCalendarMonth(), dir);
      }
      return refreshCalendarBody();
    }
    if (action === "calendar-month-day") {
      // Month view: tapping a day toggles its inline agenda without leaving the
      // month grid (the agenda's date header is what opens the full Day view).
      const d = button.dataset.date || "";
      ui.calendarSelectedDate = ui.calendarSelectedDate === d ? "" : d;
      return refreshCalendarBody();
    }
    if (action === "select-calendar-day") {
      ui.calendarSelectedDate = button.dataset.date || "";
      ui.calendarView = "day";
      return refreshCalendarBody();
    }
    if (action === "set-calendar-class") {
      const cid = button.dataset.classId || "";
      if (cid === "all" || !cid) {
        ui.calendarClasses = [];
      } else {
        const current = new Set(Array.isArray(ui.calendarClasses) ? ui.calendarClasses : []);
        if (current.has(cid)) current.delete(cid); else current.add(cid);
        ui.calendarClasses = [...current];
      }
      app.querySelectorAll(".class-chip").forEach((chip) => {
        const cid = chip.dataset.classId;
        const on = cid === "all" ? !(ui.calendarClasses || []).length : (ui.calendarClasses || []).includes(cid);
        chip.classList.toggle("active", on);
      });
      return refreshCalendarBody();
    }
    if (action === "set-calendar-kind") {
      ui.calendarKindFilter = button.dataset.kind || "all";
      return refreshCalendarBody();
    }
    if (action === "set-calendar-view") {
      ui.calendarView = ["month", "week", "day"].includes(button.dataset.view) ? button.dataset.view : "month";
      return refreshCalendarBody();
    }
    if (action === "planner-expand-day") {
      openPlannerDay(button.dataset.date || today(), button);
      return;
    }
    if (action === "set-workout-mode") {
      ui.workoutMode = button.dataset.workoutMode === "run" ? "run" : "lift";
      app.querySelectorAll(".seg-toggle [data-action='set-workout-mode']").forEach((b) => b.classList.toggle("active", b.dataset.workoutMode === ui.workoutMode));
      const body = app.querySelector("[data-workout-body]");
      if (body) {
        body.innerHTML = ui.workoutMode === "run" ? renderRunningSummary() : renderLiftingSummary();
        body.classList.remove("cal-body-swap");
        void body.offsetWidth;
        body.classList.add("cal-body-swap");
        animateProgressIndicators();
      } else {
        render({ quiet: true });
      }
      saveUi();
      return;
    }
    if (action === "set-health-view") {
      ui.healthView = button.dataset.healthView === "nutrition" ? "nutrition" : "workouts";
      const body = app.querySelector("[data-health-body]");
      app.querySelectorAll(".health-toggle .seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.healthView === ui.healthView));
      if (body) {
        body.innerHTML = ui.healthView === "nutrition" ? renderNutrition() : renderWorkoutsSection();
        body.classList.remove("cal-body-swap");
        void body.offsetWidth;
        body.classList.add("cal-body-swap");
        animateProgressIndicators();
      } else {
        render({ quiet: true });
      }
      saveUi();
      return;
    }
    if (action === "go-calendar") {
      ui.activeTab = "calendar";
      window.scrollTo({ top: 0, behavior: "auto" });
      return render();
    }
    if (action === "dash-go") {
      const tab = button.dataset.tab;
      if (["dashboard", "tasks", "finance", "school", "calendar", "health", "notes", "travel", "more"].includes(tab)) {
        ui.activeTab = tab;
        window.scrollTo({ top: 0, behavior: "auto" });
        return render();
      }
      return;
    }
    if (action === "show-up-next") {
      const kind = button.dataset.kind;
      const evId = button.dataset.id;
      const ev = scheduleHorizonEvents(45).find((e) => e.id === evId && e.kind === kind);
      if (ev) openUpNextDetail(ev);
      return;
    }
    if (action === "up-next-go") {
      const kind = button.dataset.kind;
      const goId = button.dataset.id;
      closeModal();
      navigateToKind(kind, goId);
      return;
    }
    if (action === "set-assignment-status") {
      const nextStatus = normalizedAssignmentStatus(button.getAttribute("data-assignment-next-status"));
      const visibleAssignmentFilter = app.querySelector(".assignment-status-filter .status-chip.active")?.getAttribute("data-assignment-filter") || ui.schoolAssignmentFilter;
      const card = button.closest(".assignment-card");
      if (nextStatus === "completed" && visibleAssignmentFilter === "active" && card) {
        const item = findById(appData.school.assignments, id);
        const schoolFilterState = captureSchoolFilterState();
        if (!item || normalizedAssignmentStatus(item.status) === nextStatus) return;
        animateAssignmentCompletion(item, nextStatus, card, schoolFilterState);
        return;
      }
      return setAssignmentStatus(id, nextStatus, button);
    }
    if (action === "undo-finance-delete") return undoFinanceDelete();
    if (action === "open-quick-add") return openQuickAdd();
    if (action === "travel-open") {
      const c = button.dataset.country || "";
      ui.travelStateFocus = "";
      // Tapping the country that's already open de-selects it and returns to the world.
      ui.travelFocus = ui.travelFocus === c ? "" : c;
      window.scrollTo({ top: 0, behavior: "auto" });
      return render();
    }
    if (action === "travel-back") {
      ui.travelFocus = "";
      ui.travelStateFocus = "";
      window.scrollTo({ top: 0, behavior: "auto" });
      return render();
    }
    if (action === "set-travel-view") {
      ui.travelView = button.dataset.travelView === "trips" ? "trips" : "map";
      saveUi();
      return render({ quiet: true });
    }
    if (action === "travel-open-state") {
      const s = button.dataset.state || "";
      ui.travelStateFocus = ui.travelStateFocus === s ? "" : s;
      window.scrollTo({ top: 0, behavior: "auto" });
      return render();
    }
    if (action === "travel-back-states") {
      ui.travelStateFocus = "";
      window.scrollTo({ top: 0, behavior: "auto" });
      return render();
    }
    if (action === "travel-zoom-in") return travelZoomBy(0.8, null, null, true);
    if (action === "travel-zoom-out") return travelZoomBy(1.25, null, null, true);
    if (action === "travel-zoom-reset") {
      const svg = app.querySelector(".travel-map");
      if (svg && !ui.travelFocus) {
        const w = TRAVEL_WORLD_VB.split(/\s+/).map(Number);
        travelManualVB = null;
        travelAnimateVB(svg, { x: w[0], y: w[1], w: w[2], h: w[3] }, 420);
      } else {
        ui.travelFocus = "";
        return render();
      }
      return;
    }

    const rerender = () => {
      saveData();
      render({ quiet: true });
    };

    const openEdit = (config) => openForm(config);

    switch (action) {
      case "add-daily-habit":
      case "edit-daily-habit": {
        const item = id ? findById(appData.dailyHabits, id) : {};
        openEdit({ title: id ? "Edit daily habit" : "Add daily habit", fields: habitFields(item), initial: item, onSubmit: (values) => upsert(appData.dailyHabits, id, values), deleteAction: id ? "delete-daily-habit" : null, deleteId: id });
        break;
      }
      case "toggle-daily-habit": {
        const habitDate = button.dataset.date || today();
        appData.habitCompletions[habitDate] = appData.habitCompletions[habitDate] || {};
        appData.habitCompletions[habitDate][id] = !appData.habitCompletions[habitDate][id];
        if (habitDate === today()) {
          recentCompletion = { id, complete: Boolean(appData.habitCompletions[habitDate][id]) };
        }
        rerender();
        window.setTimeout(() => {
          if (recentCompletion?.id === id) recentCompletion = null;
        }, 700);
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
        openEdit({ title: id ? "Edit task" : "Add task", fields: taskFields(item), initial: item, onSubmit: (values) => upsert(appData.tasks, id, { ...values, completed: item.completed || false }), deleteAction: id ? "delete-task" : null, deleteId: id });
        break;
      }
      case "toggle-task": {
        const item = findById(appData.tasks, id);
        if (!item) break;
        if (!item.completed && ui.activeTab === "tasks") {
          const card = typeof button.closest === "function" ? button.closest(".tk-row, .item-card") : null;
          const inHistory = card && card.closest(".task-history-group");
          if (card && !inHistory) {
            animateTaskCompletion(item, card);
            break;
          }
        }
        item.completed = !item.completed;
        item.completedAt = item.completed ? nowIso() : "";
        if (item.completed) maybeSpawnRecurringTask(item);
        recentCompletion = { id, complete: Boolean(item.completed) };
        rerender();
        window.setTimeout(() => {
          if (recentCompletion?.id === id) recentCompletion = null;
        }, 700);
        break;
      }
      case "delete-task":
        if (confirm("Delete this task?")) {
          deleteById(appData.tasks, id);
          rerender();
        }
        break;
      case "add-goal":
      case "edit-goal": {
        const item = id ? findById(appData.goals, id) : { category: "Personal", progressPercent: 0, completed: false };
        openEdit({
          title: id ? "Edit goal" : "Add goal",
          fields: goalFields(),
          initial: item,
          onSubmit: (values) => upsert(appData.goals, id, normalizeGoal({ ...(id ? item : {}), ...values }))
        });
        break;
      }
      case "toggle-goal-complete": {
        const item = findById(appData.goals, id);
        if (!item) break;
        item.completed = !item.completed;
        if (item.completed) item.progressPercent = 100;
        rerender();
        break;
      }
      case "delete-goal":
        if (confirm("Delete this goal?")) {
          deleteById(appData.goals, id);
          rerender();
          showToast("Goal deleted.");
        }
        break;
      case "set-task-filter":
        ui.taskFilter = button.dataset.taskCat || "All";
        return render({ quiet: true, transition: "period" });
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
        const item = id ? findById(appData.finance.income, id) : { type: "hourly", source: "Job", taxMode: "none", manualTaxAmount: "", deductionPercent: "", w2Income: taxSettings().w2Income };
        openEdit({
          title: id ? "Edit income" : "Add income",
          fields: incomeFields(),
          initial: item,
          onSubmit: (values) => upsert(appData.finance.income, id, normalizeIncomeValues({ ...(id ? item : {}), ...values }))
        });
        break;
      }
      case "estimate-income-tax": {
        const item = findById(appData.finance.income, id);
        if (item) {
          item.taxMode = "auto";
          item.w2Income = item.w2Income ?? taxSettings().w2Income;
          saveData();
          render({ quiet: true });
          showToast("Income tax estimate applied.");
        }
        break;
      }
      case "set-tax-gross": {
        const gross = Math.max(0, Number(button.dataset.gross) || 0);
        appData.settings.tax.annualGrossIncome = gross;
        appData.settings.tax.paycheckFrequency = normalizePaycheckFrequency(appData.settings.tax.paycheckFrequency);
        appData.settings.tax.payPeriodsPerYear = payPeriodsForFrequency(appData.settings.tax.paycheckFrequency);
        saveData();
        document.querySelectorAll('[data-tax-input="annualGrossIncome"]').forEach((input) => {
          input.value = String(gross);
        });
        document.querySelectorAll(".tax-summary-pill").forEach((pill) => {
          pill.textContent = `${formatCurrency(gross)} base`;
        });
        updateTaxLiveSummaries();
        showToast(`Tax calculator set to ${button.dataset.label || "selected income"}.`);
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
        const item = id ? findById(appData.finance.bills, id) : { frequency: "monthly", billType: "bill", paid: false };
        openEdit({ title: id ? "Edit bill" : "Add bill", fields: billFields(), initial: normalizeBill({ ...(item || {}) }), onSubmit: (values) => upsert(appData.finance.bills, id, normalizeBill({ ...(id ? item : {}), ...values })), deleteAction: id ? "delete-bill" : null, deleteId: id });
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
        const item = id ? findById(appData.finance.spending, id) : { necessary: true, paymentMethod: "Debit card", accountId: defaultSpendingAccountId("Debit card") };
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
      case "add-saving":
      case "edit-saving": {
        const item = id ? findById(appData.finance.savings, id) : { accountId: defaultSavingsAccountId(), date: today() };
        openEdit({
          title: id ? "Edit savings deposit" : "Add savings",
          fields: savingFields(),
          initial: item,
          onSubmit: (values) => upsert(appData.finance.savings, id, normalizeSavingEntry({ ...(id ? item : {}), ...values }))
        });
        break;
      }
      case "delete-saving":
        if (confirm("Delete this savings entry?")) {
          deleteFinanceItem(appData.finance.savings, id, "savings entry");
          rerender();
          showToast("Savings entry deleted.");
        }
        break;
      case "add-budget":
      case "edit-budget": {
        appData.finance.budgets = appData.finance.budgets || [];
        const item = id ? findById(appData.finance.budgets, id) : {};
        openEdit({
          title: id ? "Edit budget" : "Add budget",
          fields: budgetFields(item),
          initial: item,
          onSubmit: (values) => upsert(appData.finance.budgets, id, { ...values, amount: Number(values.amount) || 0 }),
          deleteAction: id ? "delete-budget" : null,
          deleteId: id
        });
        break;
      }
      case "delete-budget":
        if (confirm("Delete this budget?")) {
          deleteById(appData.finance.budgets, id);
          rerender();
          showToast("Budget deleted.");
        }
        break;
      case "search-open": {
        const type = button.dataset.type;
        const sid = button.dataset.id;
        ui.dashboardSearch = "";
        if (type === "task") {
          ui.activeTab = "tasks";
        } else if (type === "assignment") {
          ui.activeTab = "school";
          ui.schoolView = "overview";
        } else if (type === "note") {
          ui.activeTab = "notes";
          ui.notesEditingId = sid;
        } else if (type === "spending" || type === "income" || type === "bill") {
          ui.activeTab = "finance";
          ui.financeSection = type === "spending" ? "spending" : type === "income" ? "income" : "bills";
        }
        saveUi();
        window.scrollTo({ top: 0, behavior: "auto" });
        render();
        break;
      }
      case "add-savings-goal":
      case "edit-savings-goal": {
        const item = id ? findById(appData.finance.savingsGoals, id) : {};
        openEdit({
          title: id ? "Edit savings goal" : "Add savings goal",
          fields: savingsGoalFields(),
          initial: item,
          onSubmit: (values) => upsert(appData.finance.savingsGoals, id, normalizeSavingsGoal({ ...(id ? item : {}), ...values }))
        });
        break;
      }
      case "delete-savings-goal":
        if (confirm("Delete this savings goal? Savings deposits linked to it will stay in history.")) {
          deleteFinanceItem(appData.finance.savingsGoals, id, "savings goal");
          appData.finance.savings.forEach((entry) => {
            if (entry.goalId === id) entry.goalId = "";
          });
          appData.goals.forEach((goal) => {
            if (goal.linkedSavingsGoalId === id) goal.linkedSavingsGoalId = "";
          });
          rerender();
          showToast("Savings goal deleted.");
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
          },
          deleteAction: id ? "delete-debt" : null,
          deleteId: id
        });
        break;
      }
      case "make-debt-payment": {
        const debt = findById(appData.finance.debts, id);
        openEdit({
          title: "Make debt payment",
          fields: debtPaymentFields(),
          initial: { accountId: defaultSpendingAccountId("Debit card"), date: today() },
          onSubmit(values) {
            const amount = Math.max(0, Number(values.amount) || 0);
            const balance = Number(debt.balance) || 0;
            const accountId = values.accountId || defaultSpendingAccountId("Debit card");
            // Recording a payment is just bookkeeping for money that already moved,
            // so we don't block it on a computed "available balance" (which the
            // account-balance model can understate). Only require a real amount;
            // overpayments simply zero out the remaining balance.
            if (!amount) {
              alert("Enter a payment amount.");
              return false;
            }
            if (amount > balance) {
              const ok = confirm(`This payment of ${formatCurrency(amount)} is more than the ${formatCurrency(balance)} remaining on this debt. Record it anyway and mark the debt paid off?`);
              if (!ok) return false;
            }
            debt.balance = Math.max(0, balance - amount);
            debt.paymentHistory = debt.paymentHistory || [];
            debt.paymentHistory.push(makeItem({ ...values, amount, accountId, date: values.date || today() }));
            return true;
          }
        });
        break;
      }
      case "edit-debt-payment": {
        const { debt, payment } = findDebtForPayment(id);
        if (!debt || !payment) break;
        const oldAmount = Math.max(0, Number(payment.amount) || 0);
        openEdit({
          title: "Edit payment",
          fields: debtPaymentFields(),
          initial: { amount: payment.amount, accountId: payment.accountId || defaultSpendingAccountId("Debit card"), date: paymentHistoryDate(payment), notes: payment.notes || "" },
          onSubmit(values) {
            const amount = Math.max(0, Number(values.amount) || 0);
            if (!amount) {
              alert("Enter a payment amount.");
              return false;
            }
            // Re-apply the difference to the running balance: the old amount was
            // already deducted, so add it back and subtract the new amount.
            const restored = (Number(debt.balance) || 0) + oldAmount;
            if (amount > restored) {
              const ok = confirm(`This payment of ${formatCurrency(amount)} is more than the ${formatCurrency(restored)} that would be owed. Record it anyway and mark the debt paid off?`);
              if (!ok) return false;
            }
            debt.balance = Math.max(0, restored - amount);
            payment.amount = amount;
            payment.accountId = values.accountId || defaultSpendingAccountId("Debit card");
            payment.date = values.date || today();
            payment.notes = values.notes || "";
            return true;
          },
          deleteAction: "delete-debt-payment",
          deleteId: id
        });
        break;
      }
      case "delete-debt-payment": {
        const { debt, payment } = findDebtForPayment(id);
        if (!debt || !payment) break;
        if (confirm("Delete this payment? The amount will be added back to the balance.")) {
          debt.balance = (Number(debt.balance) || 0) + (Number(payment.amount) || 0);
          debt.paymentHistory = debt.paymentHistory.filter((p) => p.id !== id);
          rerender();
          showToast("Payment deleted.");
        }
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
        openEdit({ title: id ? "Edit class" : "Add class", fields: classFields(), initial: item, onSubmit: (values) => upsert(appData.school.classes, id, values), deleteAction: id ? "delete-class" : null, deleteId: id });
        break;
      }
      case "edit-class-grade": {
        const klass = findById(appData.school.classes, id);
        if (!klass) break;
        openEdit({
          title: `Grade · ${klass.name || "Class"}`,
          fields: [
            { name: "gradeLetter", label: "Letter grade", type: "chips", options: [{ value: "", label: "Auto" }, ...SCHOOL_GRADES.map((g) => ({ value: g, label: g }))], default: SCHOOL_GRADES.includes(klass.gradeLetter) ? klass.gradeLetter : "", help: "Auto uses the points-based estimate from graded assignments." }
          ],
          submitLabel: "Save grade",
          onSubmit(values) {
            klass.gradeLetter = SCHOOL_GRADES.includes(values.gradeLetter) ? values.gradeLetter : "";
          }
        });
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
        openEdit({ title: id ? "Edit assignment" : "Add assignment", fields: assignmentFields(), initial: { ...item, status: normalizedAssignmentStatus(item.status) }, onSubmit: (values) => upsert(appData.school.assignments, id, { ...values, status: normalizedAssignmentStatus(values.status) }), deleteAction: id ? "delete-assignment" : null, deleteId: id });
        break;
      }
      case "bulk-add-assignment": {
        const classId = id || button.dataset.id || "";
        openBulkAssignmentModal(classId);
        break;
      }
      case "delete-assignment":
        if (confirm("Delete this assignment?")) {
          deleteById(appData.school.assignments, id);
          rerender();
        }
        break;
      case "add-trip":
        openEdit({
          title: "Add trip",
          fields: tripFields(),
          onSubmit: (v) => {
            appData.travel.trips.push(makeItem({ name: v.name, startDate: v.startDate, endDate: v.endDate, notes: v.notes, legs: [] }));
          }
        });
        break;
      case "edit-trip": {
        const trip = findById(appData.travel.trips, id);
        if (!trip) break;
        openEdit({
          title: "Edit trip",
          fields: tripFields(trip),
          initial: trip,
          onSubmit: (v) => { trip.name = v.name; trip.startDate = v.startDate; trip.endDate = v.endDate; trip.notes = v.notes; },
          deleteAction: "delete-trip",
          deleteId: trip.id
        });
        break;
      }
      case "delete-trip":
        if (confirm("Delete this trip?")) {
          deleteById(appData.travel.trips, id);
          rerender();
        }
        break;
      case "add-trip-leg": {
        const trip = findById(appData.travel.trips, id);
        if (!trip) break;
        openEdit({
          title: "Add leg",
          submitLabel: "Add leg",
          fields: legFields(),
          onSubmit: (v) => {
            const from = resolveTravelCity(v.from);
            const to = resolveTravelCity(v.to);
            if (!from || !to) return;
            trip.legs = trip.legs || [];
            trip.legs.push(makeItem({ from, to, roundTrip: v.roundTrip !== false && v.roundTrip !== "false" }));
          }
        });
        break;
      }
      case "delete-trip-leg": {
        const trip = findById(appData.travel.trips, id);
        if (!trip) break;
        const legId = button.dataset.leg;
        trip.legs = (trip.legs || []).filter((leg) => leg.id !== legId);
        rerender();
        break;
      }
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
      case "add-run":
      case "schedule-workout":
      case "edit-workout": {
        closePlannerDay(); // release the planner overlay (and its scroll lock) first
        const item = id ? findById(appData.gym.workouts, id) : {};
        const presetDate = button.dataset.date || "";
        const presetType = action === "add-run" ? "run" : (item.type || "lift");
        openEdit({
          title: id ? "Edit workout" : (action === "add-run" ? "Log run" : action === "schedule-workout" ? "Schedule workout" : "Add workout"),
          fields: workoutFields(item),
          initial: { ...item, type: presetType, exercises: item.exercises || [], date: item.date || presetDate || today() },
          onSubmit(values) {
            upsert(appData.gym.workouts, id, { ...values, exercises: values.exercises || [] });
          },
          deleteAction: id ? "delete-workout" : null,
          deleteId: id
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
      case "add-order":
      case "edit-order": {
        const item = id ? findById(appData.orders, id) : { status: "Ordered" };
        openEdit({ title: id ? "Edit order" : "Add order", fields: orderFields(), initial: item, onSubmit: (values) => upsert(appData.orders, id, values), deleteAction: id ? "delete-order" : null, deleteId: id });
        break;
      }
      case "delete-order":
        if (confirm("Delete this order?")) {
          deleteById(appData.orders, id);
          rerender();
        }
        break;
      case "add-bucket": {
        const input = document.getElementById("bucket-input");
        const text = (input?.value || "").trim();
        if (!text) return showToast("Type something first.");
        appData.bucketList.push(makeItem({ text, done: false, completedAt: "" }));
        rerender();
        break;
      }
      case "toggle-bucket": {
        const item = findById(appData.bucketList, id);
        if (item) {
          item.done = !item.done;
          item.completedAt = item.done ? nowIso() : "";
          rerender();
        }
        break;
      }
      case "delete-bucket":
        if (confirm("Delete this bucket-list item?")) {
          deleteById(appData.bucketList, id);
          rerender();
        }
        break;
      case "new-note": {
        const folderId = (ui.notesFolderId && !["all", "pinned", "unfiled"].includes(ui.notesFolderId) && findById(appData.notes.folders, ui.notesFolderId)) ? ui.notesFolderId : "";
        const note = makeItem({ title: "", body: "", folderId, color: "", pinned: false, updatedAt: nowIso() });
        appData.notes.items.push(note);
        ui.notesEditingId = note.id;
        ui.noteEditMode = true; // new notes open straight into edit mode
        notesFocusPending = true;
        saveData();
        render();
        break;
      }
      case "open-note":
        ui.notesEditingId = id;
        ui.noteEditMode = false; // open into the read view first
        render();
        break;
      case "enter-note-edit":
        ui.noteEditMode = true;
        notesFocusPending = true;
        render();
        break;
      case "note-done-edit":
        ui.noteEditMode = false;
        render();
        break;
      case "notes-back":
        ui.notesEditingId = "";
        ui.noteEditMode = false;
        render();
        break;
      case "set-notes-folder":
        ui.notesFolderId = button.dataset.folder || "all";
        render({ quiet: true });
        break;
      case "toggle-note-pin": {
        const note = findById(appData.notes.items, id);
        if (note) {
          note.pinned = !note.pinned;
          note.updatedAt = nowIso();
          recentPinId = id;
          rerender();
          window.setTimeout(() => { if (recentPinId === id) recentPinId = null; }, 500);
        }
        break;
      }
      case "set-note-color": {
        const note = findById(appData.notes.items, id);
        if (note) { note.color = button.dataset.color || ""; note.updatedAt = nowIso(); rerender(); }
        break;
      }
      case "delete-note":
        if (confirm("Delete this note?")) {
          deleteById(appData.notes.items, id);
          if (ui.notesEditingId === id) ui.notesEditingId = "";
          rerender();
        }
        break;
      case "add-note-folder":
      case "edit-note-folder": {
        const folder = id ? findById(appData.notes.folders, id) : {};
        openEdit({
          title: id ? "Rename folder" : "New folder",
          fields: [
            { name: "name", label: "Folder name", required: true },
            { name: "color", label: "Folder color", type: "color-swatches", options: [{ value: "", label: "No color" }, ...colorSwatches.map((color) => ({ value: color, label: color }))], default: "" }
          ],
          initial: folder,
          onSubmit(values) {
            if (id && folder) {
              folder.name = values.name;
              folder.color = safeHexColor(values.color, "");
            } else {
              const created = makeItem({ name: values.name, color: safeHexColor(values.color, "") });
              appData.notes.folders.push(created);
              ui.notesFolderId = created.id;
            }
          }
        });
        break;
      }
      case "delete-note-folder":
        if (confirm("Delete this folder? Notes inside it become unfiled.")) {
          appData.notes.items.forEach((note) => { if (note.folderId === id) note.folderId = ""; });
          deleteById(appData.notes.folders, id);
          if (ui.notesFolderId === id) ui.notesFolderId = "all";
          rerender();
        }
        break;
      case "toggle-visit-country": {
        const country = button.dataset.country;
        if (!country) break;
        appData.travel.countries[country] = !appData.travel.countries[country];
        if (appData.travel.countries[country]) recentVisitKey = "c:" + country;
        rerender();
        const ck = "c:" + country;
        window.setTimeout(() => { if (recentVisitKey === ck) recentVisitKey = null; }, 600);
        break;
      }
      case "toggle-visit-state": {
        const state = button.dataset.state;
        if (!state) break;
        appData.travel.states[state] = !appData.travel.states[state];
        if (appData.travel.states[state]) {
          appData.travel.countries["United States"] = true;
          recentVisitKey = "s:" + state;
        }
        rerender();
        const sk = "s:" + state;
        window.setTimeout(() => { if (recentVisitKey === sk) recentVisitKey = null; }, 600);
        break;
      }
      case "toggle-visit-city": {
        const country = button.dataset.country;
        const city = button.dataset.city;
        if (!country || !city) break;
        const key = travelCityKey(country, city);
        const nowOn = !appData.travel.cities[key];
        appData.travel.cities[key] = nowOn;
        if (nowOn) {
          if (button.dataset.scope === "state") {
            appData.travel.states[country] = true;
            appData.travel.countries["United States"] = true;
          } else {
            appData.travel.countries[country] = true;
          }
        }
        rerender();
        break;
      }
      case "add-reminder":
      case "edit-reminder": {
        const item = id ? findById(appData.reminders, id) : {};
        openEdit({ title: id ? "Edit reminder" : "Add reminder", fields: reminderFields(), initial: item, onSubmit: (values) => upsert(appData.reminders, id, values), deleteAction: id ? "delete-reminder" : null, deleteId: id });
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
      case "set-school-progress-shape":
        appData.settings.schoolProgressShape = ["bar", "ring", "halfring"].includes(button.dataset.shape) ? button.dataset.shape : "bar";
        rerender();
        break;
      case "set-school-progress-mode":
        appData.settings.schoolProgressMode = ["class", "combined", "overall"].includes(button.dataset.mode) ? button.dataset.mode : "class";
        rerender();
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
        appData.settings.tax.paycheckFrequency = normalizePaycheckFrequency(appData.settings.tax.paycheckFrequency);
        appData.settings.tax.payPeriodsPerYear = payPeriodsForFrequency(appData.settings.tax.paycheckFrequency);
        appData.settings.tax.municipalTaxRate = normalizePercentInput(appData.settings.tax.municipalTaxRate);
        appData.settings.tax.schoolDistrictTaxRate = normalizePercentInput(appData.settings.tax.schoolDistrictTaxRate);
        appData.settings.tax.ohioLocalRate = appData.settings.tax.municipalTaxRate;
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
      const tab = nav.dataset.tab;
      // Re-tapping the tab you're already on scrolls back to the top (a reset),
      // like the iOS status-bar tap, instead of pointlessly re-rendering.
      if (tab === ui.activeTab) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      ui.activeTab = tab;
      render();
      return;
    }
    const button = event.target.closest("[data-action]");
    if (button) {
      event.preventDefault();
      handleAction(button.dataset.action, button);
      return;
    }
    if (handleDetailsSummaryClick(event)) return;
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.dataset?.taxInput) {
      updateTaxSettingFromControl(target);
      saveData();
      updateTaxLiveSummaries();
    }
    if (target.dataset?.notesSearch !== undefined) {
      ui.notesSearch = target.value;
      const caret = target.selectionStart;
      render({ quiet: true });
      const again = app.querySelector("[data-notes-search]");
      if (again) {
        again.focus();
        try { again.setSelectionRange(caret, caret); } catch {}
      }
    }
    if (target.dataset?.dashSearch !== undefined) {
      ui.dashboardSearch = target.value;
      const caret = target.selectionStart;
      render({ quiet: true });
      const again = app.querySelector("[data-dash-search]");
      if (again) {
        again.focus();
        try { again.setSelectionRange(caret, caret); } catch {}
      }
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.taxInput) {
      updateTaxSettingFromControl(target);
      saveData();
      updateTaxLiveSummaries();
      return;
    }
    if (target.id === "task-filter") {
      ui.taskFilter = target.value;
      render();
      return;
    }
    if (target.dataset.incomeCompare) {
      if (target.dataset.incomeCompare === "a") ui.incomeCompareA = target.value;
      else ui.incomeCompareB = target.value;
      saveUi();
      refreshIncomeChart();
      return;
    }
    if (target.dataset.dashboardCustom) {
      ui.dashboardCustom[target.dataset.dashboardCustom] = target.value;
      render({ quiet: true, transition: "period" });
      return;
    }
    if (target.dataset.financeCustom) {
      ui.financeCustom[target.dataset.financeCustom] = target.value;
      render({ quiet: true, transition: "period" });
      return;
    }
    if (target.dataset.schoolCustom) {
      ui.schoolCustom = ui.schoolCustom || { start: today(), end: today() };
      ui.schoolCustom[target.dataset.schoolCustom] = target.value;
      render({ quiet: true, transition: "period" });
      return;
    }
    if (target.dataset.assignmentStatus) {
      setAssignmentStatus(target.dataset.assignmentStatus, target.value, target);
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

  // Keep the app pinned like a native app: block iOS Safari's pinch-zoom
  // gestures and any multi-finger zoom the viewport meta doesn't already catch.
  ["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
    document.addEventListener(type, (event) => event.preventDefault(), { passive: false });
  });
  document.addEventListener("touchmove", (event) => {
    if (event.touches && event.touches.length > 1) event.preventDefault();
  }, { passive: false });

  // Edge-swipe back: a drag in from the very left edge fires the on-screen back
  // button (class detail, note editor, travel country) — alongside the button.
  let edgeSwipe = null;
  document.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) { edgeSwipe = null; return; }
    const t = event.touches[0];
    if (t.clientX > 26) { edgeSwipe = null; return; }
    if (modalRoot.querySelector(".modal-backdrop")) { edgeSwipe = null; return; }
    const back = app.querySelector(".back-link");
    edgeSwipe = back ? { x: t.clientX, y: t.clientY, back, fired: false } : null;
  }, { passive: true });
  document.addEventListener("touchmove", (event) => {
    if (!edgeSwipe || edgeSwipe.fired || event.touches.length !== 1) return;
    const t = event.touches[0];
    if (t.clientX - edgeSwipe.x > 64 && Math.abs(t.clientY - edgeSwipe.y) < 44) {
      edgeSwipe.fired = true;
      edgeSwipe.back.click();
    }
  }, { passive: true });
  document.addEventListener("touchend", () => { edgeSwipe = null; }, { passive: true });

  // Long-press a note to get an Edit / Delete action sheet.
  let notePressTimer = null;
  let noteLongPressed = false;
  const clearNotePress = () => { if (notePressTimer) { clearTimeout(notePressTimer); notePressTimer = null; } };
  document.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    const row = event.target.closest?.(".note-row");
    if (!row || !row.dataset.id) return;
    const id = row.dataset.id;
    notePressTimer = window.setTimeout(() => {
      notePressTimer = null;
      noteLongPressed = true;
      if (navigator.vibrate) try { navigator.vibrate(8); } catch {}
      openNoteActions(id);
    }, 480);
  }, { passive: true });
  document.addEventListener("touchmove", clearNotePress, { passive: true });
  document.addEventListener("touchend", clearNotePress, { passive: true });
  document.addEventListener("touchcancel", clearNotePress, { passive: true });
  // Swallow the click that fires when the finger lifts after a long-press.
  document.addEventListener("click", (event) => {
    if (noteLongPressed) { noteLongPressed = false; event.stopPropagation(); event.preventDefault(); }
  }, true);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
    if ((event.key === "Enter" || event.key === " ") && event.target?.matches?.("summary")) {
      handleDetailsSummaryClick(event);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      const activatable = event.target?.closest?.('[data-action][role="button"]');
      if (activatable) {
        event.preventDefault();
        handleAction(activatable.dataset.action, activatable);
      }
    }
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
