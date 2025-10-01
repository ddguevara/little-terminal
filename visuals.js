const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+-<>░▒▓';
const moodFaceEl = document.getElementById('mood-face');
const moodLabelEl = document.getElementById('mood-label');

const MOODS = {
  boot: { face: '[-_-]', label: 'Booting' },
  listening: { face: '[o_o]', label: 'Listening' },
  processing: { face: '[=^=]', label: 'Processing' },
  secret: { face: '[^_^]', label: 'Access granted' },
  error: { face: '[x_x]', label: 'Connection fault' },
  idle: { face: '(-.-) zZ', label: 'Idle' }
};

let animationFrameId = null;
let canvas;
let ctx;
let drops = [];
let fontSize = 20;
let columnCount = 0;
let horizontalDrift = [];

function initCanvas() {
  canvas = document.getElementById('matrix');
  if (!canvas) {
    return;
  }
  ctx = canvas.getContext('2d');
  resizeCanvas();
  startMatrix();
  window.addEventListener('resize', handleResize, { passive: true });
}

function handleResize() {
  stopMatrix();
  resizeCanvas();
  startMatrix();
}

function resizeCanvas() {
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  fontSize = Math.max(18, Math.floor(rect.width / 42));
  columnCount = Math.max(1, Math.floor(rect.width / fontSize));
  drops = new Array(columnCount).fill(0);
  horizontalDrift = new Array(columnCount).fill(0);
}

function drawMatrix() {
  const height = canvas.height / (window.devicePixelRatio || 1);
  const width = canvas.width / (window.devicePixelRatio || 1);
  ctx.fillStyle = 'rgba(0, 12, 0, 0.22)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#39ff14';
  ctx.font = `${fontSize}px 'VT323', monospace`;

  for (let i = 0; i < columnCount; i += 1) {
    const char = characters[Math.floor(Math.random() * characters.length)];
    const x = i * fontSize;
    const y = drops[i] * fontSize;

    ctx.fillText(char, x + horizontalDrift[i], y);

    if (y * fontSize > height && Math.random() > 0.99) {
      drops[i] = 0;
      horizontalDrift[i] = 0;
    } else {
      const fallSpeed = 0.28 + Math.random() * 0.22;
      const sway = (Math.random() - 0.5) * 0.3;
      horizontalDrift[i] = Math.max(-fontSize / 2, Math.min(fontSize / 2, horizontalDrift[i] + sway));
      drops[i] += fallSpeed;
    }
  }

  animationFrameId = requestAnimationFrame(() => {
    setTimeout(drawMatrix, 55);
  });
}

function startMatrix() {
  if (animationFrameId) {
    return;
  }
  animationFrameId = requestAnimationFrame(drawMatrix);
}

function stopMatrix() {
  if (!animationFrameId) {
    return;
  }
  cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
}

function applyMoodClass() {
  if (!moodFaceEl) {
    return;
  }
  moodFaceEl.classList.remove('mood-pulse');
  // trigger reflow to restart animation
  void moodFaceEl.offsetWidth;
  moodFaceEl.classList.add('mood-pulse');
}

function setMood(name) {
  if (!moodFaceEl || !moodLabelEl) {
    return;
  }
  const mood = MOODS[name] || MOODS.listening;
  moodFaceEl.textContent = mood.face;
  moodFaceEl.setAttribute('aria-label', mood.label);
  moodLabelEl.textContent = mood.label;
  applyMoodClass();
}

function initVisuals() {
  initCanvas();
  setMood('boot');
}

export { initVisuals, setMood, MOODS, stopMatrix };
