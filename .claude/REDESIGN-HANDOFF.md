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

## STATUS — ALL DONE (user picked direction A for every section, built 2026-06-24)
All built presentation-only, logic preserved.
- **Calendar** → DONE **A · Month + agenda**. `renderCalendarMonthBody` appends an inline agenda for the selected day (sorted, `renderCalendarEventRow`), date header is a button → full Day view. Month cells use action `calendar-month-day` (toggles selection inline, stays in month, `refreshCalendarBody`). Today/selected day = orange (`.cal-day.is-today/.is-selected`). CSS `.cal-agenda*`.
- **Nutrition** (Health tab) → DONE **A · Calorie ring + macros + meals**. `renderNutrition` + helpers `calorieRing(percent,eaten,goal)` (orange ring) and `macroBar(label,value,goal,color)` (protein blue / carbs orange / fat pink). Meals list keeps all entries + edit/delete. CSS "Nutrition · calorie ring + macros".
- **Notes** → DONE **A · Notes list**. Added `search` icon, `ui.notesSearch` state, search box (`data-notes-search`, live filter via global input listener with caret/focus restore + `render({quiet})`), grouped rows via `renderNoteRow` (`.note-row-group`/`.note-row`). Pinned/Recent groups. Delete lives in note editor.
- **Travel** → DONE **A · Map hero + 3-stat row + list**. Map/zoom/search already existed; added a Progress 3-stat row (Visited / To go / % of world — no continent data in GEO so % used) before `renderTravelList`, only when no country focused. CSS `.travel-stats`.
- **More** → DONE **A · Grouped settings**. `renderMore` now renders labeled groups (Tools / App) of `.more-row2` inset rows with colored icon tiles + chevrons; kept real sections (Shopping/Bucket/Weekly Review/Settings) + `set-more-view`. NOTE: `selectMoreRow` updated to target `.more-row2` (was `.more-row`). No profile header (no name/email stored in appData). CSS "More · grouped settings".

Redesign of all planned sections is COMPLETE.

## Finance "current money" history chart (built 2026-06-24)
The hero sparkline was replaced with a real interactive stock-style chart.
- `financeBalanceSeries(days, currentMoney)` reconstructs a **real daily balance history** by walking backward from today's balance through every posted dated flow (income `entryNetIncome`, savings, cash spending, debt-payment history). Last point always == `finance.currentMoney`.
- `financeHistoryDays()` maps `ui.financeSpan` → trailing window (7/14/30, month→since 1st, paycheck→14, today→7, custom→range length). Chart rebuilds on span change (set-finance-span does full render).
- `renderFinanceChart(points,color)` draws SVG line + gradient area + overlay (`.fin-chart`, geometry consts `FIN_CHART`). `setupFinanceChart()` (called in finance post-render hook beside `setupFinanceHistory`) wires pointer scrub: touch/drag or hover shows a guide line, dot, and tooltip with exact balance + date. `.fh-trend` shows delta + % over the window.
- GOTCHA fixed: `.fin-chart-tip` sets `display:flex` which beat the `hidden` attribute → added `.fin-chart-tip[hidden]{display:none}`. Touch scroll handled via `touch-action:pan-y` on `.fin-chart`.
- Old `financeBalancePoints`/`sparklineSvg` kept but no longer used by the hero.

## Feature additions (built 2026-06-24)
- **Recurring tasks.** `taskFields` has a "Repeat" select (daily/weekly/biweekly/monthly). On completion (both `toggle-task` and `animateTaskCompletion` paths) `maybeSpawnRecurringTask(item)` creates the next occurrence (`nextRecurrenceDate`); `recurrenceSpawned` guard prevents dupes. Row shows a ↻ pill (`TASK_REPEAT_LABELS`, `.tk-repeat`, new `repeat` icon).
- **Spending → By category.** `renderCategoryBreakdown(byCategory,total)` = colored stacked bar + legend (`CATEGORY_COLORS`). Uses **month-to-date** (`monthByCategory`) not the forward span, so it stays meaningful.
- **Spending → Monthly budgets.** `appData.finance.budgets [{id,category,amount}]` (added to finance defaults). `renderSpendingBudgets()` shows spent-this-month vs amount with ok/warn/over states. `budgetFields`, handlers `add-budget`/`edit-budget`/`delete-budget`. `.budget-*` CSS.
- **Net worth over time chart.** In Current money section (`renderAccounts`). `financeNetWorthSeries(days,finance)` = cash series + investments(flat, no history) − debt(reconstructed from payment history). Purple chart.
- **Interactive finance chart now multi-instance.** `renderFinanceChart(points,color,gradId)`, `setupFinanceChart()` loops over all `[data-fin-chart]` via `setupFinanceChartInstance`; dot color from `--chart-color`.
- **Global search (Dashboard).** `ui.dashboardSearch` + `.dash-search` box (reuses `.notes-search`), live filter via global input listener (focus/caret restore). `globalSearchResults(query)` searches tasks/assignments/notes/spending/income/bills; `renderSearchResults` groups them (`SEARCH_GROUPS`). `search-open` handler routes to the right tab/section (notes opens the note). When query non-empty the dashboard body is replaced by results.

- **Bulk-add assignments.** `bulk-add-assignment` action (class-detail To-do header + school Assignments header) → `openBulkAssignmentModal(classId)`: a bespoke modal (not openForm) — class select on top, fill one assignment's boxes (title/date/optional time/type) → "Add to list" pushes it to a `pending[]` and collapses it into a `.bulk-chip` summary (removable), fresh "Assignment N" boxes appear (title+time cleared, date+type kept), → "Done · add N" commits all via makeItem. A filled-but-not-added entry is auto-included on Done. CSS "Bulk add assignments modal". (Old textarea `parseBulkAssignments`/`bulkAssignmentFields` kept but unused; `parseFlexibleDate` still handy.) Icons added: `list`, `plane`, `pin2`.
- **Slim dashboard search.** `.dash-search` overrides `.notes-search` (padding 6px/12px, input `min-height:0;height:26px;padding:0`) → ~40px tall vs the global 44px input min-height.
- **Trip planner + auto mileage (Travel).** `ui.travelView` map|trips, segmented toggle in `renderTravel`. `appData.travel.trips[]` (each {name,startDate,endDate,notes,legs:[{from,to,roundTrip}]}). City coords are equirectangular (`cityLatLng`: lng=(x/1000)*360−180, lat=90−(y/500)*180 — verified vs Kabul/NYC-Paris). `haversineMiles` great-circle; `travelCityIndex`/`travelCityOptions`/`resolveTravelCity` (value "Country||City"); `legMiles` (×2 if roundTrip), `tripMiles`, `travelTotalMiles`. `renderTravelTrips`/`renderTripCard`, `tripFields`/`legFields`. Handlers: `set-travel-view` (early if-chain, before openEdit), `add/edit/delete-trip` + `add-trip-leg`/`delete-trip-leg` (switch cases, after openEdit). CSS "Travel · trip planner" (teal). Possible v2: per-leg dates → calendar events; per-leg round-trip already supported.

## Home-screen tab reordering (described to user, NOT built — awaiting go-ahead)
Recommended approach: a "Customize tabs" screen in Settings — a drag-reorder list of all 9 sections split into "Bottom bar" (top ~5) vs "More menu" (rest), persisted in settings. Fixes the overcrowded 9-tab scrolling nav. Fancier alt: iOS jiggle long-press drag on the nav itself.

## iOS notifications (explained to user, NOT built)
Web push on iOS needs: app installed to Home Screen (done) → permission prompt on a tap → service-worker `pushManager` subscription → a **backend/cron** to send pushes (app is currently client-side localStorage only). Pure local scheduled notifications aren't reliable on iOS web. Easiest no-backend win = in-app "due today/overdue" banner on the dashboard.

- **Assignments simplified.** Removed the status filter bar (`schoolAssignmentFilterToggle`, now unused) from the school Assignments section — kept the class filter. `renderAssignmentGroups` always builds Overdue / To do / Completed and hides any empty group (`if (!g.items.length) return ""`); in-progress is not its own group. Class-detail + school section both head "Assignments".
- **Tasks hide empty groups.** `renderTaskGroup` returns "" when the group has no tasks (no more placeholder boxes); when all of Today/Overdue/Upcoming/Anytime/history are empty, one empty state shows instead.

Current versions: styles v100, app v97, SW v121.

## Collapse animation (already fixed — don't regress)
`toggleDetails` in app.js animates a `.details-body` wrapped in a single `.dcl` inner via **WAAPI height** (460ms, `--ease-out`), collapsing to a true 0 (no padding residual, no fallback-timer pause). Don't go back to grid `fr` or JS-rAF height.

## Functional fixes already shipped (don't redo)
School calendar month nav; assignment in-progress merged into "To do" + animations; tasks "Anytime" (no-date); per-weekday habits; income chart (solid green line, Weekly/Monthly/Yearly, compare two months); month-to-date; collapsible lift/run log; modal centering + body scroll-lock; inputs no horizontal scroll; projection uses **minimum** debt payment (not payoff-goal); investments share-based (shares×price); credit-card payment validation relaxed + editable payment history; dashboard Up-Next overlap + detail popup; cohesive global pass (tokens/SF/nav/chips/empty states); unified kind colors; nav slimmed (height 56) + zoom-locked PWA (`maximum-scale=1,user-scalable=no`, `touch-action`, gesture preventDefault); flipped income-history chevron.

## How to continue in a new chat
Open a new chat **in this same project folder**. Say e.g. "continue the planner redesign — build the Calendar section, I pick direction A" (or ask to see a mockup first). Point it at this file: `.claude/REDESIGN-HANDOFF.md`.
