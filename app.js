/* ═══════════════════════════════════════════════════
   CHALLENGE TRACKER v2 — app.js
   Features:
   • Custom habit management (add / edit / delete)
   • Only TODAY is editable; past AND future are locked
   • Bold "Today" column with glow indicator
   • Duration selector: 21 / 30 / 60 / 75 / 90 / 100 days
   • LocalStorage persistence — zero backend
═══════════════════════════════════════════════════ */
'use strict';

/* ─────── STORAGE KEYS ─────── */
const SK_STATE    = 'ct_state_v2';
const SK_HABITS   = 'ct_habits_v2';
const SK_START    = 'ct_start_v2';
const SK_DURATION = 'ct_duration_v2';

/* ─────── DEFAULTS ─────── */
const DEFAULT_HABITS = [
  { id: 'workout',  icon: '🏋️', label: 'Workout (45 min)',       color: '#E07A5F' },
  { id: 'diet',     icon: '🥗', label: 'Follow your diet plan',  color: '#81C784' },
  { id: 'water',    icon: '💧', label: 'Drink 3L of water',      color: '#64B5F6' },
  { id: 'read',     icon: '📖', label: 'Read 10 pages',          color: '#BA68C8' },
  { id: 'outdoor',  icon: '🚶', label: '10-min outdoor walk',    color: '#FFB74D' },
  { id: 'nojunk',   icon: '🚫', label: 'No junk food / alcohol', color: '#F06292' },
  { id: 'progress', icon: '📸', label: 'Progress photo',         color: '#A1887F' },
];

const BANNERS = [
  '✨ "Every day you show up is a victory, love. Let\'s do this together!"',
  '🌸 "Small steps every day lead to big changes. I\'m so proud of you!"',
  '💛 "You promised yourself this, and you\'re keeping that promise. Beautiful."',
  '🌿 "Even on tough days, you still tried. That\'s everything to me."',
  '🌟 "Choosing yourself every single day — I\'ll be cheering you on always."',
  '☀️ "Progress, not perfection. You\'re already incredible, my love."',
  '🍃 "One checkbox at a time. We\'ll get there — together."',
];

const SUCCESS_MSGS = [
  '🌸 Well done!<br>All habits done!',
  '🎉 You nailed it!<br>Perfect day!',
  '💚 So proud of you!<br>Complete!',
  '✨ Amazing!<br>Full marks today!',
];
const PUSH_MSGS = [
  '💪 Stay strong,<br>you\'ve got this!',
  '🌼 Keep going,<br>almost there!',
  '🤍 One more step,<br>don\'t stop now!',
  '🌿 Believe in<br>yourself, love!',
];

/* ─────── LIVE STATE ─────── */
let checkState   = {};
let TASKS        = [];
let TOTAL_DAYS   = 75;
let pendingHabits = [];
let selectedDuration = 75;

/* ─────── DATE UTILS ─────── */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getStartDate() {
  let s = localStorage.getItem(SK_START);
  if (!s) { s = todayStr(); localStorage.setItem(SK_START, s); }
  return s;
}
function currentDay() {
  const start = new Date(getStartDate());
  const now   = new Date(todayStr());
  const diff  = Math.floor((now - start) / 86400000) + 1;
  return Math.max(1, Math.min(diff, TOTAL_DAYS));
}

/* ─────── DAY CLASSIFICATION ─────── */
// ONLY today is editable. Past AND future are both locked.
function isEditable(day) { return day === currentDay(); }
function isFuture(day)   { return day > currentDay(); }
function isPast(day)     { return day < currentDay(); }

/* ─────── PERSISTENCE ─────── */
function loadAll() {
  try { checkState = JSON.parse(localStorage.getItem(SK_STATE) || '{}'); } catch { checkState = {}; }
  try {
    const h = localStorage.getItem(SK_HABITS);
    TASKS = h ? JSON.parse(h) : JSON.parse(JSON.stringify(DEFAULT_HABITS));
  } catch { TASKS = JSON.parse(JSON.stringify(DEFAULT_HABITS)); }
  TOTAL_DAYS = parseInt(localStorage.getItem(SK_DURATION) || '75');
}
function saveState()  { localStorage.setItem(SK_STATE, JSON.stringify(checkState)); }
function saveHabits() { localStorage.setItem(SK_HABITS, JSON.stringify(TASKS)); }

function ckey(day, tid) { return `${day}_${tid}`; }
function isChecked(day, tid)     { return !!checkState[ckey(day, tid)]; }
function setChecked(day, tid, v) { checkState[ckey(day, tid)] = v; saveState(); }

function dayCount(day) { return TASKS.reduce((a, t) => a + (isChecked(day, t.id) ? 1 : 0), 0); }
function isDayFull(day) { return TASKS.length > 0 && dayCount(day) === TASKS.length; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ─────── APP TITLE ─────── */
function updateTitle() {
  const labels = { 21:'21-Day', 30:'30-Day', 60:'60-Day', 75:'75-Day', 90:'90-Day', 100:'100-Day' };
  document.getElementById('app-title').textContent =
    (labels[TOTAL_DAYS] || `${TOTAL_DAYS}-Day`) + ' Challenge Tracker';
}

/* ─────── TODAY HERO ─────── */
function renderTodayHero() {
  const cur  = currentDay();
  const done = dayCount(cur);
  const tot  = TASKS.length;
  document.getElementById('today-day-num').textContent = `Day ${cur}`;
  document.getElementById('today-sub').textContent =
    done === tot && tot > 0
      ? `🎉 Perfect day! Every habit done — I'm so proud of you!`
      : `${done} of ${tot} habits done today${tot - done > 0 ? ` — ${tot - done} more to go! 💪` : ''}`;

  document.getElementById('today-task-chips').innerHTML = TASKS.map(t => {
    const checked = isChecked(cur, t.id);
    return `<div class="today-chip${checked ? ' done' : ''}" data-task="${t.id}">
      <span class="chip-icon">${t.icon}</span>
      <span>${t.label}</span>
      <span class="chip-check">✓</span>
    </div>`;
  }).join('');
}

/* ─────── TABLE HEADER ─────── */
function buildHeader() {
  const cur = currentDay();
  let html = '<tr><th class="th-task">Habit</th>';
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const today  = d === cur;
    const past   = isPast(d);
    const future = isFuture(d);
    const done   = past && isDayFull(d);
    let cls = 'th-day';
    if (today)  cls += ' today-col';
    else if (done)   cls += ' day-done past-col';
    else if (past)   cls += ' past-col';
    else if (future) cls += ' future-col';
    html += `<th class="${cls}" data-day="${d}">
      <div class="day-badge">
        <span class="day-num">D${d}</span>
        <span class="day-sub">${
          today  ? '✦ TODAY' :
          done   ? '✓ done'  :
          past   ? '🔒'      : ''
        }</span>
      </div></th>`;
  }
  html += '<th class="th-analyzer">✨ Analyzer</th></tr>';
  document.getElementById('sheet-head').innerHTML = html;
}

/* ─────── TABLE BODY ─────── */
function buildBody() {
  const cur = currentDay();
  let html = '';
  for (const task of TASKS) {
    html += `<tr data-task="${task.id}">
      <td class="td-task"><div class="task-label-inner">
        <span class="task-icon">${task.icon}</span>
        <span>${task.label}</span>
      </div></td>`;

    for (let d = 1; d <= TOTAL_DAYS; d++) {
      const editable = isEditable(d);
      const future   = isFuture(d);
      const past     = isPast(d);
      const today    = d === cur;
      const checked  = isChecked(d, task.id);

      let tdCls = 'td-check';
      if (today)       tdCls += ' today-col';
      else if (past)   tdCls += ' past-col';
      else if (future) tdCls += ' future-col';

      const titleAttr = future
        ? `title="This day hasn't arrived yet, love! 🌙"`
        : past
        ? `title="Past days are safely locked. Your record is gold! 🔒"`
        : '';

      html += `<td class="${tdCls}">
        <label class="check-wrap" ${!editable ? titleAttr : ''}>
          <input type="checkbox" class="check-input"
            data-day="${d}" data-task="${task.id}"
            ${checked  ? 'checked'  : ''}
            ${!editable ? 'disabled' : ''}
          />
          <span class="check-box${!editable ? ' locked' : ''}"></span>
        </label></td>`;
    }

    html += `<td class="td-analyzer" id="az-${task.id}"></td></tr>`;
  }

  // Analyzer summary row
  html += `<tr><td class="td-task" style="font-weight:700;font-style:italic;color:var(--ink-light);font-size:.76rem;">Day Summary 🌟</td>`;
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    let tdCls = 'td-check';
    if (d === cur)    tdCls += ' today-col';
    else if (isPast(d))   tdCls += ' past-col';
    else if (isFuture(d)) tdCls += ' future-col';
    html += `<td class="${tdCls}" id="day-az-${d}" style="padding:5px 3px;"></td>`;
  }
  html += `<td class="td-analyzer"></td></tr>`;

  document.getElementById('sheet-body').innerHTML = html;
}

/* ─────── ANALYZER ─────── */
function analyzeDay(day) {
  const cell = document.getElementById(`day-az-${day}`);
  if (!cell) return;
  if (isFuture(day)) {
    cell.innerHTML = `<span style="font-size:.6rem;color:var(--ink-light);opacity:.35;">—</span>`;
    return;
  }
  const n = dayCount(day);
  if (n === 0) {
    cell.innerHTML = `<span class="analyzer-empty" style="font-size:.6rem;">Not<br>started</span>`;
  } else if (n === TASKS.length) {
    cell.innerHTML = `<span class="analyzer-success" style="font-size:.6rem;">${pick(SUCCESS_MSGS)}</span>`;
    const th = document.querySelector(`th[data-day="${day}"]`);
    if (th && isPast(day)) { th.classList.add('day-done'); }
  } else {
    cell.innerHTML = `<span class="analyzer-push" style="font-size:.6rem;">${pick(PUSH_MSGS)}</span>`;
  }
}
function analyzeAll() { for (let d = 1; d <= TOTAL_DAYS; d++) analyzeDay(d); }

/* ─────── STATS ─────── */
function renderStats() {
  const cur = currentDay();
  let full = 0, totalDone = 0, streak = 0, streakOn = true;
  for (let d = cur; d >= 1; d--) {
    const n = dayCount(d);
    totalDone += n;
    if (isDayFull(d)) { full++; if (streakOn) streak++; }
    else streakOn = false;
  }
  const possible = cur * TASKS.length;
  const pct = possible > 0 ? Math.round((totalDone / possible) * 100) : 0;

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="stat-value">${cur}</div><div class="stat-label">Current Day</div></div>
    <div class="stat-card"><div class="stat-value">${TOTAL_DAYS}</div><div class="stat-label">Total Days</div></div>
    <div class="stat-card"><div class="stat-value">${full}</div><div class="stat-label">Perfect Days 🌟</div></div>
    <div class="stat-card"><div class="stat-value">${streak}</div><div class="stat-label">Day Streak 🔥</div></div>
    <div class="stat-card"><div class="stat-value">${totalDone}</div><div class="stat-label">Tasks Completed</div></div>
    <div class="stat-card"><div class="stat-value">${pct}%</div><div class="stat-label">Completion Rate</div></div>
    <div class="stat-card"><div class="stat-value">${Math.max(0, TOTAL_DAYS - cur)}</div><div class="stat-label">Days Remaining</div></div>
  `;

  const barPct = Math.round((full / TOTAL_DAYS) * 100);
  document.getElementById('overall-progress-bar').style.width = barPct + '%';
  document.getElementById('overall-progress-label').textContent = `${full} / ${TOTAL_DAYS} perfect days`;
}

/* ─────── TOAST ─────── */
let toastT;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.innerHTML = msg;
  el.className = 'toast show' + (type ? ' ' + type + '-toast' : '');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ─────── SCROLL TO TODAY ─────── */
function scrollToToday() {
  const th = document.querySelector(`th.today-col`);
  if (!th) return;
  setTimeout(() => {
    const w = document.getElementById('sheet-wrapper');
    w.scrollLeft = th.offsetLeft - w.clientWidth / 2 + th.offsetWidth / 2;
  }, 100);
}

/* ─────── REBUILD ALL ─────── */
function rebuild() {
  updateTitle();
  buildHeader();
  buildBody();
  analyzeAll();
  renderStats();
  renderTodayHero();
  scrollToToday();
}

/* ─────── MANAGE HABITS MODAL ─────── */
function openHabitsModal() {
  pendingHabits = JSON.parse(JSON.stringify(TASKS));
  document.getElementById('habits-warning').style.display = 'none';
  document.getElementById('new-habit-icon').value = '';
  document.getElementById('new-habit-label').value = '';
  renderHabitList();
  document.getElementById('habits-overlay').classList.add('open');
}
function closeHabitsModal() { document.getElementById('habits-overlay').classList.remove('open'); }

function renderHabitList() {
  const list = document.getElementById('habits-list');
  if (!pendingHabits.length) {
    list.innerHTML = `<p style="text-align:center;color:var(--ink-light);font-size:.82rem;padding:14px;">No habits yet — add one below! 🌱</p>`;
    return;
  }
  list.innerHTML = pendingHabits.map((h, i) => `
    <div class="habit-row" id="hr-${i}" data-i="${i}">
      <span class="habit-row-icon">${h.icon}</span>
      <span class="habit-row-label">${h.label}</span>
      <button class="habit-edit-icon" data-act="edit" data-i="${i}" title="Edit">✏️</button>
      <button class="habit-delete-btn" data-act="del" data-i="${i}" title="Remove">✕</button>
    </div>`).join('');
}

function startEdit(i) {
  const h = pendingHabits[i];
  document.getElementById(`hr-${i}`).innerHTML = `
    <input class="habit-icon-edit" id="ei-${i}" value="${h.icon}" maxlength="2" />
    <input class="habit-edit-input" id="el-${i}" value="${h.label}" maxlength="50" />
    <button class="btn-add-habit" data-act="save" data-i="${i}" style="padding:5px 12px;font-size:.75rem;">Save</button>
    <button class="habit-delete-btn" data-act="cancel" data-i="${i}">✕</button>`;
  document.getElementById(`el-${i}`).focus();
}

function saveEdit(i) {
  const icon  = (document.getElementById(`ei-${i}`).value.trim() || '📌');
  const label = document.getElementById(`el-${i}`).value.trim();
  if (!label) { showToast('💛 Please give your habit a name!'); return; }
  pendingHabits[i].icon  = icon;
  pendingHabits[i].label = label;
  renderHabitList();
}

function delHabit(i) {
  pendingHabits.splice(i, 1);
  document.getElementById('habits-warning').style.display = 'block';
  renderHabitList();
}

function addHabit() {
  const icon  = document.getElementById('new-habit-icon').value.trim() || '📌';
  const label = document.getElementById('new-habit-label').value.trim();
  if (!label) { showToast('💛 Please type a habit name first!'); return; }
  const palette = ['#E07A5F','#81C784','#64B5F6','#BA68C8','#FFB74D','#F06292','#A1887F','#4DB6AC'];
  pendingHabits.push({ id: 'h_' + Date.now(), icon, label, color: palette[pendingHabits.length % palette.length] });
  document.getElementById('new-habit-icon').value  = '';
  document.getElementById('new-habit-label').value = '';
  renderHabitList();
  showToast(`🌱 "${label}" added! Hit Save when ready.`);
}

function saveHabits() {
  if (!pendingHabits.length) { showToast('🥺 Add at least one habit!'); return; }
  TASKS = JSON.parse(JSON.stringify(pendingHabits));
  saveHabits_ls();
  closeHabitsModal();
  rebuild();
  showToast('🌸 Habits updated! Your journey continues, love!', 'success');
}
function saveHabits_ls() { localStorage.setItem(SK_HABITS, JSON.stringify(TASKS)); }

/* ─────── SETTINGS MODAL ─────── */
function openSettingsModal() {
  selectedDuration = TOTAL_DAYS;
  document.querySelectorAll('.dur-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.days) === selectedDuration);
  });
  document.getElementById('settings-warning').style.display = 'none';
  document.getElementById('settings-overlay').classList.add('open');
}
function closeSettingsModal() { document.getElementById('settings-overlay').classList.remove('open'); }

function applySettings() {
  if (selectedDuration === TOTAL_DAYS) { closeSettingsModal(); return; }
  // Reset everything and set new duration
  localStorage.removeItem(SK_STATE);
  localStorage.removeItem(SK_START);
  localStorage.setItem(SK_DURATION, String(selectedDuration));
  closeSettingsModal();
  showToast(`🌟 Starting your ${selectedDuration}-day challenge! Let's go!`, 'success');
  setTimeout(() => location.reload(), 600);
}

/* ─────── EVENT BINDING ─────── */
function bindEvents() {

  /* Checkbox toggle in table */
  document.getElementById('sheet').addEventListener('change', e => {
    const inp = e.target;
    if (!inp.classList.contains('check-input')) return;
    const day = parseInt(inp.dataset.day), tid = inp.dataset.task;
    setChecked(day, tid, inp.checked);
    analyzeDay(day);
    renderStats();
    renderTodayHero();
    const n = dayCount(day);
    if (inp.checked && n === TASKS.length)
      showToast('🌸 Perfect day! All habits done — I\'m so proud!', 'success');
    else if (inp.checked)
      showToast(`💛 Logged! ${TASKS.length - n} more habit${TASKS.length - n !== 1 ? 's' : ''} to go!`);
    else
      showToast('🤍 Unchecked — you can still do it today!');
  });

  /* Today hero chip clicks */
  document.getElementById('today-task-chips').addEventListener('click', e => {
    const chip = e.target.closest('.today-chip');
    if (!chip) return;
    const tid = chip.dataset.task, cur = currentDay();
    const newVal = !isChecked(cur, tid);
    setChecked(cur, tid, newVal);
    const cb = document.querySelector(`.check-input[data-day="${cur}"][data-task="${tid}"]`);
    if (cb) cb.checked = newVal;
    analyzeDay(cur);
    renderStats();
    renderTodayHero();
    const n = dayCount(cur);
    if (newVal && n === TASKS.length) showToast('🌸 All done today! You\'re absolutely amazing!', 'success');
    else if (newVal) showToast(`💛 Nice! ${TASKS.length - n} more to go today!`);
  });

  /* Reset modal */
  document.getElementById('reset-btn').addEventListener('click', () =>
    document.getElementById('modal-overlay').classList.add('open'));
  document.getElementById('modal-cancel').addEventListener('click', () =>
    document.getElementById('modal-overlay').classList.remove('open'));
  document.getElementById('modal-confirm').addEventListener('click', () => {
    [SK_STATE, SK_START, SK_HABITS, SK_DURATION].forEach(k => localStorage.removeItem(k));
    document.getElementById('modal-overlay').classList.remove('open');
    showToast('✨ Fresh start! You\'ve got this, love!', 'push');
    setTimeout(() => location.reload(), 600);
  });
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay'))
      document.getElementById('modal-overlay').classList.remove('open');
  });

  /* Habits modal */
  document.getElementById('manage-btn').addEventListener('click', openHabitsModal);
  document.getElementById('habits-close').addEventListener('click', closeHabitsModal);
  document.getElementById('habits-cancel').addEventListener('click', closeHabitsModal);
  document.getElementById('habits-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('habits-overlay')) closeHabitsModal();
  });
  document.getElementById('habits-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act, i = parseInt(btn.dataset.i);
    if (act === 'edit')   startEdit(i);
    else if (act === 'del')    delHabit(i);
    else if (act === 'save')   saveEdit(i);
    else if (act === 'cancel') renderHabitList();
  });
  document.getElementById('habits-list').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const saveBtn = e.target.closest('.habit-row')?.querySelector('[data-act="save"]');
    if (saveBtn) saveBtn.click();
  });
  document.getElementById('btn-add-habit').addEventListener('click', addHabit);
  document.getElementById('new-habit-label').addEventListener('keydown', e => {
    if (e.key === 'Enter') addHabit();
  });
  document.getElementById('habits-save').addEventListener('click', saveHabits);

  /* Settings modal */
  document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
  document.getElementById('settings-close').addEventListener('click', closeSettingsModal);
  document.getElementById('settings-cancel').addEventListener('click', closeSettingsModal);
  document.getElementById('settings-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('settings-overlay')) closeSettingsModal();
  });
  document.getElementById('duration-grid').addEventListener('click', e => {
    const btn = e.target.closest('.dur-btn');
    if (!btn) return;
    selectedDuration = parseInt(btn.dataset.days);
    document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('settings-warning').style.display =
      selectedDuration !== TOTAL_DAYS ? 'block' : 'none';
  });
  document.getElementById('settings-save').addEventListener('click', applySettings);
}

/* ─────── INIT ─────── */
function init() {
  loadAll();
  document.getElementById('banner-text').textContent = pick(BANNERS);
  rebuild();
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
