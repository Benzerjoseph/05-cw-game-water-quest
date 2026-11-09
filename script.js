// ---------- Difficulty settings ----------
const MODES = {
  easy:   { goal: 15, duration: 40, spawnMs: 800, badChance: 0.2, penalty: 2 },
  normal: { goal: 20, duration: 30, spawnMs: 650, badChance: 0.3, penalty: 3 },
  hard:   { goal: 25, duration: 25, spawnMs: 450, badChance: 0.4, penalty: 4 }
};

// ---------- Milestones (percent of goal -> message) ----------
const MILESTONES = [
  { pct: 0.25, text: 'Nice start! A quarter of the way there.' },
  { pct: 0.5,  text: 'Halfway to the goal. Keep going!' },
  { pct: 0.75, text: 'So close. Almost there!' }
];

// ---------- Elements ----------
const field = document.getElementById('field');
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const bestEl = document.getElementById('best');
const goalEl = document.getElementById('goal');
const msgEl = document.getElementById('msg');
const modeButtons = document.querySelectorAll('.mode');

// ---------- State ----------
let mode = 'normal';
let score = 0, timeLeft = MODES.normal.duration;
let spawnTimer, clockTimer, running = false;
const best = { easy: 0, normal: 0, hard: 0 };
let shownMilestones = new Set();

// ---------- Sound (Web Audio, no files needed) ----------
let audioCtx;
function beep(freq, dur, type = 'sine', delay = 0) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    const t = audioCtx.currentTime + delay;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + dur);
  } catch (e) { /* sound is optional */ }
}
const sounds = {
  collect: () => beep(660, 0.12),
  dirty:   () => beep(150, 0.3, 'sawtooth'),
  click:   () => beep(440, 0.06, 'square'),
  win:     () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.2, 'triangle', i * 0.12)),
  lose:    () => [330, 262, 196].forEach((f, i) => beep(f, 0.25, 'sine', i * 0.15))
};

// ---------- Helpers ----------
function say(text) { msgEl.textContent = text; }

function setScore(n, cls) {
  score = Math.max(0, n);
  scoreEl.textContent = score;
  scoreEl.classList.remove('bump', 'hurt');
  void scoreEl.offsetWidth; // restart the animation
  scoreEl.classList.add(cls);
}

function applyMode(name) {
  mode = name;
  const m = MODES[name];
  goalEl.textContent = m.goal;
  timeEl.textContent = m.duration;
  bestEl.textContent = best[name];
  modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === name));
  document.getElementById('op').textContent =
    `Tap clean blue drops for +1. Dirty drops cost you ${m.penalty}. Reach ${m.goal} points in ${m.duration} seconds to win.`;
}

function checkMilestone() {
  const goal = MODES[mode].goal;
  for (const m of MILESTONES) {
    const target = Math.ceil(goal * m.pct);
    if (score >= target && !shownMilestones.has(m.pct)) {
      shownMilestones.add(m.pct);
      say(m.text);
      return true;
    }
  }
  return false;
}

// ---------- Gameplay ----------
function spawnDrop() {
  const m = MODES[mode];
  const bad = Math.random() < m.badChance;
  const d = document.createElement('button');
  d.className = 'drop' + (bad ? ' bad' : '');
  d.setAttribute('aria-label', bad ? 'Dirty drop' : 'Clean drop');
  d.style.left = Math.random() * (field.clientWidth - 50) + 'px';
  d.style.animationDuration = (2.2 + Math.random() * 1.8) * (mode === 'hard' ? 0.75 : 1) + 's';

  d.addEventListener('pointerdown', () => {
    if (!running) return;
    if (bad) {
      setScore(score - m.penalty, 'hurt');
      say(`Dirty water! -${m.penalty} points`);
      sounds.dirty();
    } else {
      setScore(score + 1, 'bump');
      sounds.collect();
      if (!checkMilestone()) say('Clean water collected! +1');
      if (score >= m.goal) { d.remove(); endGame(true); return; }
    }
    d.remove(); // remove the drop from the DOM when clicked
  });
  d.addEventListener('animationend', () => d.remove()); // missed drops also leave the DOM
  field.appendChild(d);
}

function startGame() {
  const m = MODES[mode];
  sounds.click();
  clearInterval(spawnTimer); clearInterval(clockTimer);
  field.querySelectorAll('.drop').forEach(d => d.remove());
  score = 0; timeLeft = m.duration; running = true;
  shownMilestones = new Set();
  scoreEl.textContent = 0; timeEl.textContent = m.duration;
  modeButtons.forEach(b => b.disabled = true);
  overlay.classList.add('hidden');
  say('Go go go!');
  spawnTimer = setInterval(spawnDrop, m.spawnMs);
  clockTimer = setInterval(() => {
    timeLeft--; timeEl.textContent = timeLeft;
    if (timeLeft <= 0) endGame(score >= m.goal);
  }, 1000);
}

function endGame(won) {
  if (!running) return;
  const m = MODES[mode];
  running = false;
  clearInterval(spawnTimer); clearInterval(clockTimer);
  field.querySelectorAll('.drop').forEach(d => d.remove());
  modeButtons.forEach(b => b.disabled = false);
  if (score > best[mode]) { best[mode] = score; bestEl.textContent = score; }
  document.getElementById('ot').textContent = won ? 'You did it!' : "Time's up";
  document.getElementById('op').textContent = won
    ? `${score} drops collected. Every drop counts toward clean water for all. Donate at charitywater.org!`
    : `You got ${score} of ${m.goal}. Give it another shot!`;
  document.getElementById('start').textContent = 'Play again';
  overlay.classList.remove('hidden');
  if (won) { sounds.win(); confetti(); } else { sounds.lose(); }
}

function resetGame() {
  sounds.click();
  running = false;
  clearInterval(spawnTimer); clearInterval(clockTimer);
  field.querySelectorAll('.drop').forEach(d => d.remove());
  score = 0; scoreEl.textContent = 0;
  modeButtons.forEach(b => b.disabled = false);
  applyMode(mode);
  document.getElementById('ot').textContent = 'Ready?';
  document.getElementById('start').textContent = 'Start game';
  overlay.classList.remove('hidden');
  say('Catch blue drops. Dodge the dirty brown ones.');
}

function confetti() {
  const colors = ['#FFC907', '#2E9DF7', '#003A70', '#fff'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('i');
    c.className = 'conf';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = Math.random() * 0.6 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3500);
  }
}

// ---------- Events ----------
document.getElementById('start').addEventListener('click', startGame);
document.getElementById('reset').addEventListener('click', resetGame);
modeButtons.forEach(b => b.addEventListener('click', () => {
  if (running) return;
  sounds.click();
  applyMode(b.dataset.mode);
}));

applyMode(mode);
