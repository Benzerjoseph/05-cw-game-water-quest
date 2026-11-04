const GOAL = 20, DURATION = 30;
const field = document.getElementById('field'), overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score'), timeEl = document.getElementById('time');
const bestEl = document.getElementById('best'), msgEl = document.getElementById('msg');
let score = 0, timeLeft = DURATION, best = 0, spawnTimer, clockTimer, running = false;
const milestones = {5:'Nice start! 5 drops collected.', 10:'Halfway to the goal. Keep going!', 15:'So close. Almost there!'};

function say(t){ msgEl.textContent = t; }
function setScore(n, cls){
  score = Math.max(0, n); scoreEl.textContent = score;
  scoreEl.classList.remove('bump','hurt'); void scoreEl.offsetWidth; scoreEl.classList.add(cls);
}

function spawnDrop(){
  const bad = Math.random() < 0.3;
  const d = document.createElement('button');
  d.className = 'drop' + (bad ? ' bad' : '');
  d.setAttribute('aria-label', bad ? 'Dirty drop' : 'Clean drop');
  d.style.left = Math.random() * (field.clientWidth - 50) + 'px';
  d.style.animationDuration = (2.2 + Math.random() * 1.8) + 's';
  d.addEventListener('pointerdown', () => {
    if (!running) return;
    if (bad){ setScore(score - 3, 'hurt'); say('Dirty water! -3 points'); }
    else {
      setScore(score + 1, 'bump');
      say(milestones[score] || 'Clean water collected! +1');
      if (score >= GOAL) endGame(true);
    }
    d.remove();
  });
  d.addEventListener('animationend', () => d.remove());
  field.appendChild(d);
}

function startGame(){
  clearInterval(spawnTimer); clearInterval(clockTimer);
  field.querySelectorAll('.drop').forEach(d => d.remove());
  score = 0; timeLeft = DURATION; running = true;
  scoreEl.textContent = 0; timeEl.textContent = DURATION;
  overlay.classList.add('hidden'); say('Go go go!');
  spawnTimer = setInterval(spawnDrop, 650);
  clockTimer = setInterval(() => {
    timeLeft--; timeEl.textContent = timeLeft;
    if (timeLeft <= 0) endGame(score >= GOAL);
  }, 1000);
}

function endGame(won){
  if (!running) return;
  running = false; clearInterval(spawnTimer); clearInterval(clockTimer);
  field.querySelectorAll('.drop').forEach(d => d.remove());
  if (score > best){ best = score; bestEl.textContent = best; }
  document.getElementById('ot').textContent = won ? 'You did it!' : "Time's up";
  document.getElementById('op').textContent = won
    ? `${score} drops collected. Every drop counts toward clean water for all.`
    : `You got ${score} of ${GOAL}. Give it another shot!`;
  document.getElementById('start').textContent = 'Play again';
  overlay.classList.remove('hidden');
  if (won) confetti();
}

function confetti(){
  const colors = ['#FFC907','#2E9DF7','#003A70','#fff'];
  for (let i = 0; i < 70; i++){
    const c = document.createElement('i'); c.className = 'conf';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = Math.random() * .6 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3500);
  }
}

function resetGame(){
  running = false; clearInterval(spawnTimer); clearInterval(clockTimer);
  field.querySelectorAll('.drop').forEach(d => d.remove());
  score = 0; timeLeft = DURATION; scoreEl.textContent = 0; timeEl.textContent = DURATION;
  document.getElementById('ot').textContent = 'Ready?';
  document.getElementById('op').textContent = 'Tap clean blue drops for +1. Dirty drops cost you 3. Reach 20 points in 30 seconds to win.';
  document.getElementById('start').textContent = 'Start game';
  overlay.classList.remove('hidden'); say('Catch blue drops. Dodge the dirty brown ones.');
}

document.getElementById('start').addEventListener('click', startGame);
document.getElementById('reset').addEventListener('click', resetGame);
