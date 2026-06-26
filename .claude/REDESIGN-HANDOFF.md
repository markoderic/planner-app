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

- **No text selection.** `html,body { user-select:none; -webkit-touch-callout:none }`; inputs/textareas/selects/contenteditable re-enabled to `user-select:text`. Stops accidental highlight on long-press.
- **Chart tooltip robustness.** `setupFinanceChartInstance` `show()` now positions the tip in **pixels**, clamped inside the chart rect, flipping below the point when near the top — never clipped. `.fin-chart-tip` CSS reset to `left/top:0` (JS drives position); removed pin-left/right + fixed top.
- **Loader redesign.** `index.html` loader is now `.loader-ring` (conic-gradient blue→purple→pink arc, `loaderSpin` 1s) + pulsing `PLANNER` wordmark. Replaced the old `.loader-track` progress bar. NOTE: `index.html` is SW-cached (no `?v=`), so loader/markup changes need a SW cache bump (CACHE_NAME) + a reload or two to show; app.js/styles.css use `?v=` so they refresh immediately.

- **Calendar highlight color fix.** `.cal-day.is-today/.is-selected` now use `--accent`/`--accent-rgb` (the settings accent) instead of hardcoded orange.
- **Edge-swipe back.** Global touch handlers: a drag in from `clientX<=26` that moves right >64px (|dy|<44) clicks the visible `.back-link` (all back buttons share that class) — works for class detail / note editor / travel. Skipped when a modal is open.
- **Note long-press menu.** Long-press (480ms) a `.note-row` opens `openNoteActions(id)` — an `.action-sheet` modal with Edit / Delete (+ Cancel + backdrop close). A capture-phase click guard swallows the post-long-press click. `.action-sheet*` CSS.
- **School top overview redesign + customizable progress.** Replaced the stat-chips with `renderSchoolProgress(range)` — assignment completion for the selected span. Settings (`appData.settings.schoolProgressShape` = bar|ring|halfring, default **bar**; `schoolProgressMode` = class|combined|overall, default **class**) via "School progress" card in Settings (`set-school-progress-shape`/`-mode` handlers). Shapes: `progBar/progRing/progHalf`; combined ring/half = `progConcentric`/`progHalfConcentric` (concentric, one per class, Apple-Watch style); combined bar = `progStacked` (segments per class). `schoolProgressData(range)` computes overall + per-class (incl. "No class"). `.school-progress`/`.sp-*`/`.prog-*` CSS.
- **Note-editor "paper" redesign (DONE).** `renderNoteEditor` now has read + edit modes via `ui.noteEditMode` (default false; `open-note`→read, `new-note`→edit, handlers `enter-note-edit`/`note-done-edit`; `notes-back` resets). Read mode = `.note-sheet` paper (big `.note-doc-title`, meta, pre-wrap `.note-doc-body`), tap or Edit pill → edit. Edit mode = `.note-edit-meta` (color swatches + folder) + `.note-sheet-edit` borderless title/textarea (paper feel) + Done/Delete. Note color = sheet top edge via `--note-accent` (`box-shadow: inset 0 3px 0`). `setupNotesEditor` retargeted to `.note-doc-view`, only wires fields in edit mode, auto-grows the textarea. CSS "Note editor — paper read/edit".

## Service worker
Already has `self.skipWaiting()` (install) + `self.clients.claim()` (activate) AND a **network-first** fetch handler — so updates apply on reload when online; cache is for offline. No change needed (confirmed for user).

- **Slimmer collapse boxes (app-wide).** Base `details summary` min-height 54→44 (padding `4px 14px`); `.timeline-card`/`.calendar-card`/`.grade-card`/`.grades-overview` summaries 54→44; `.assignment-group` summary 48→42. `.fin-entry` transaction rows untouched (content-driven 58px).
- **Finance chart smooth span morph.** `renderFinanceChart` now resamples the series to a fixed `FIN_CHART.samples` (64) via `resampleSeries`, draws the line as `<path d>` (was polyline). On span change, `setupFinanceChartInstance` applies the previous span's `d` (stashed in `finChartPrevD[gradId]`) then rAFs to the new `d`, and CSS `transition: d 480ms` morphs it. Same 64-point count both sides = smooth interpolation.
- **Chart scrubbing reliability.** `.fin-chart-hit` now `inset:-8px 0` + `touch-action:none` → scrub works touching anywhere in the chart (not just on the line), no accidental page scroll; mouse hover still shows it. (Tooltip px-clamping from before keeps it always visible.)
- **Order Tracking tool (More · Tools).** `appData.orders[]`, `ui.moreView==="orders"`. `renderOrders`/`renderOrderCard`, `orderFields` (name, carrier/store, tracking #, status [Ordered→Delivered], order date, ETA, optional tracking URL → Track button, notes). Handlers `add/edit/delete-order`. Delivered collapse into a `<details>`. `package` icon added. `.order-*` CSS (status color chips).

- **Bill paid now subtracts from balance (bug fix).** `calculateFinance` adds `postedPaidBills` (sum of `bills.filter(b=>b.paid)` amounts) and subtracts it from `accountMoney`/`currentMoney`. `financeBalanceSeries` also pushes paid bills as dated negative flows so the chart matches.
- **Finance graph really animates now.** CSS `transition: d` doesn't animate the SVG `d` *attribute*; replaced with a JS rAF tween in `setupFinanceChartInstance` (interpolates the 64 y-values prev→new over 520ms, easeOutCubic, `finChartPrevYs`/`finChartAnims`). Chart line is `<path>` with fixed 64 samples (`resampleSeries`) so spans morph.
- **Chart scrubbing** `.fin-chart-hit` `inset:-8px 0` + `touch-action:none` (works touching anywhere).
- **Class↔School slide.** `open-class`→`.view-slide-fwd`, `back-to-school`→`.view-slide-back` (CSS keyframes). Works with edge-swipe too.
- **School overview redesigned (final).** Stat tiles DROPPED. Just `renderSchoolProgress(range)`: shape = `appData.settings.schoolProgressShape` (halfring DEFAULT | ring | bar). ring/halfring = concentric (one ring per class, Better-Canvas style, `progConcentric`/`progHalfConcentric`, stroke 10/gap 5) with centered "% · done/total · Complete" label; bar = per-class labeled bars. Legend OFF by default (`schoolProgressLegend`) + counts toggle (`schoolProgressLegendCounts`) in Settings. Rings animate via `.sp-svg circle/path { transition: stroke-dashoffset }`. (`schoolProgressMode` setting removed; old `set-school-progress-mode` handler now dead/unused.)

- **Progress fill animation.** School progress shapes mount EMPTY (arcs at full dash-offset / bars at width 0) with the real value in `data-target`; `setupSchoolProgress()` (post-render hook, school tab) sets them to target after a 40ms timeout so the CSS transition (`.sp-svg circle/path` stroke-dashoffset 760ms, `.prog-bar i` width 700ms) fills them up — on view, on completing an assignment, and on span change. (`progBar(...,animate)`, `progConcentric`/`progHalfConcentric` emit `data-target`.)
- **Interactive swipe-back.** Replaced the threshold edge-swipe with a drag: touchstart at `clientX<=28` over a `.view` with a `.back-link`; touchmove translates the view with the finger (light resistance past full width) + slight fade, `preventDefault` once horizontal; touchend commits (glide off → `back.click()`) past 38% of width, else springs back with overshoot `cubic-bezier(0.34,1.56,0.64,1)`. Cancels on vertical scroll / open modal.

- **Searchable city picker (trips).** New `datalist` field type in `renderField` (text input + `<datalist>`). `legFields` from/to use it (options = `travelCityDisplayList()` "City, Country"). `resolveTravelCity` now resolves display strings (via `travelCityDisplayMap`) and old "Country||City".
- **Map pan/zoom responsiveness.** `setupTravelPanZoom`: removed the early `return` on `[data-action]` so a drag pans even when started on a country; tracks `moved` and swallows the follow-up click (`suppressClickUntil`) so dragging never opens a country; pinch exponent 0.55→0.9, wheel 0.93/1.08→0.85/1.18.
- **Task checkmark centering.** `.tk-check`/`.hb-check` switched from `display:grid;place-items:center` to flexbox + `.icon{display:block}` (the inline-block icon wasn't centering). Now 5.5px on all sides.
- **Money trend redesign (Dashboard).** `renderDashboardMoneyGraph` rebuilt as refined grouped bars (`.mt-*`): header net (`data-mt-net`, signed/colored) + a live readout (`data-mt-readout`) + 6 month columns (current highlighted) + legend. `setupMoneyTrend` (dashboard post-render hook) grows bars from 0 and wires pointer scrub (`data-mt-bars`, touch-action pan-y) to highlight a month and update the readout/net. Months embedded as `data-months` JSON. Old `.money-*` CSS now unused.

- **Swipe-back now REVEALS the destination.** The edge-swipe drags `#app` (`.app-main`) off your finger while a fixed `.back-reveal` layer behind it shows the destination (parallax `-25%→0` + dim fade). `backDestinationHtml(action)` renders it: back-to-school→`renderSchoolOverview`, notes-back→`renderNotesList`, travel-back→`renderTravel` (focus temporarily cleared). Commit ≥38% → glide off + `back.click()` + remove reveal; cancel → spring back. `clearBackReveal()` resets. CSS `.back-reveal*` (z 40) + `#app.is-back-dragging` (z 41); bottom-nav (z 20) is covered during the swipe (full-screen reveal).

## Future direction (user goal, NOT started)
User wants to eventually **rewrite the app in Swift** for the App Store and make **every single thing customizable**. Keep new features customizable/data-driven where reasonable.

Current versions: styles v111, app v110, SW v135.

## Collapse animation (already fixed — don't regress)
`toggleDetails` in app.js animates a `.details-body` wrapped in a single `.dcl` inner via **WAAPI height** (460ms, `--ease-out`), collapsing to a true 0 (no padding residual, no fallback-timer pause). Don't go back to grid `fr` or JS-rAF height.

## Functional fixes already shipped (don't redo)
School calendar month nav; assignment in-progress merged into "To do" + animations; tasks "Anytime" (no-date); per-weekday habits; income chart (solid green line, Weekly/Monthly/Yearly, compare two months); month-to-date; collapsible lift/run log; modal centering + body scroll-lock; inputs no horizontal scroll; projection uses **minimum** debt payment (not payoff-goal); investments share-based (shares×price); credit-card payment validation relaxed + editable payment history; dashboard Up-Next overlap + detail popup; cohesive global pass (tokens/SF/nav/chips/empty states); unified kind colors; nav slimmed (height 56) + zoom-locked PWA (`maximum-scale=1,user-scalable=no`, `touch-action`, gesture preventDefault); flipped income-history chevron.

## How to continue in a new chat
Open a new chat **in this same project folder**. Say e.g. "continue the planner redesign — build the Calendar section, I pick direction A" (or ask to see a mockup first). Point it at this file: `.claude/REDESIGN-HANDOFF.md`.
