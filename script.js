import { initVisuals, setMood as updateMoodDisplay } from './visuals.js';

const screen = document.getElementById('screen');
const input = document.getElementById('command');

const bootLines = [
  'LITTLE TERMINAL v0.3',
  'MEMORY TEST … OK',
  'NETWORK … PARTIAL',
  'ENTER COMMAND >'
];

const localCommands = {
  help: [
    'Known commands:',
    'help | status | whoami | ping | clear'
  ],
  status: [
    'Subsystems: AUX OK / COMM WARN',
    'Recommend contacting maintainer if network degrades.'
  ],
  whoami: ['You are the assigned attendant for the Atrium kiosk.'],
  ping: ['Pinging loopback…', 'Reply from 127.0.0.1 in 0.3ms'],
  clear: []
};

const REST_IDLE_MS = 90_000;
const TYPE_DELAY_RANGE = [30, 90];

let typingQueue = Promise.resolve();
let cursorEl = null;
let idleTimer = null;
let sessionId = initSessionId();
let glitchTimer = null;
let audioCtx;
let currentMood = 'boot';
let promptPlaceholderActive = false;

initVisuals();
updateMood('boot');

function updateMood(name) {
  currentMood = name;
  updateMoodDisplay(name);
}

function initSessionId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function ensureAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      return null;
    }
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(frequency, duration = 0.08, gain = 0.06) {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = frequency;
  amp.gain.value = gain;
  osc.connect(amp).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playKeyBeep() {
  playTone(750, 0.05, 0.05);
}

function playChime() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  [523, 659, 784].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    amp.gain.value = 0.05;
    amp.gain.setValueAtTime(0.05, now + index * 0.12);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.6);
    osc.connect(amp).connect(ctx.destination);
    osc.start(now + index * 0.12);
    osc.stop(now + index * 0.12 + 0.6);
  });
}

function enqueue(fn) {
  typingQueue = typingQueue.then(() => fn());
  return typingQueue;
}

function setCursor(lineEl) {
  if (cursorEl) {
    cursorEl.remove();
  }
  cursorEl = document.createElement('span');
  cursorEl.className = 'cursor';
  cursorEl.textContent = '█';
  lineEl.appendChild(cursorEl);
}

function writeCharacter(char) {
  cursorEl?.insertAdjacentText('beforebegin', char);
}

function getDelay() {
  const [min, max] = TYPE_DELAY_RANGE;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function typeLine(rawText) {
  return enqueue(
    () =>
      new Promise((resolve) => {
        const text = rawText.replace(/\u001b\[2J/g, '');
        const line = document.createElement('div');
        line.className = 'line';
        screen.appendChild(line);
        setCursor(line);
        let index = 0;

        const printNext = () => {
          if (index >= text.length) {
            resolve();
            return;
          }
          writeCharacter(text[index]);
          index += 1;
          screen.scrollTop = screen.scrollHeight;
          setTimeout(printNext, getDelay());
        };

        if (!text.length) {
          resolve();
          return;
        }
        printNext();
      })
  );
}

function typeLines(lines) {
  return lines.reduce((promise, line) => promise.then(() => typeLine(line)), Promise.resolve());
}

function clearScreen() {
  screen.innerHTML = '';
  cursorEl = null;
  promptPlaceholderActive = false;
}

function removePromptPlaceholder() {
  if (!promptPlaceholderActive) {
    return;
  }
  const lastLine = screen.lastElementChild;
  if (lastLine?.classList.contains('line')) {
    lastLine.remove();
  }
  cursorEl = null;
  promptPlaceholderActive = false;
}

function resetIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
  }
  idleTimer = setTimeout(handleIdleState, REST_IDLE_MS);
  if (currentMood === 'idle') {
    updateMood('listening');
  }
}

function handleIdleState() {
  input.disabled = true;
  updateMood('idle');
  typeLine('SYSTEM IDLE').then(() => {
    screen.classList.add('fade-out');
    setTimeout(() => window.location.reload(), 2200);
  });
}

function scheduleGlitch() {
  glitchTimer = setInterval(() => {
    if (document.hidden) {
      return;
    }
    if (Math.random() < 0.1) {
      typeLine('[DATA ERROR 0x02]').catch(() => {});
    }
  }, 15000);
}

async function handleCommand(commandText) {
  const normalized = commandText.trim().toLowerCase();
  if (!normalized) {
    return;
  }

  if (normalized === 'clear') {
    clearScreen();
    updateMood('listening');
    return;
  }

  if (localCommands[normalized]) {
    await typeLines(localCommands[normalized]);
    updateMood('listening');
    return;
  }

  try {
    const response = await fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: commandText, sessionId })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (payload.sessionId) {
      sessionId = payload.sessionId;
    }
    const lines = Array.isArray(payload.lines)
      ? payload.lines
      : String(payload.response || '').split('\n');

    await typeLines(lines);

    if (payload.secretRevealed) {
      updateMood('secret');
      playChime();
    } else {
      updateMood('listening');
    }
  } catch (err) {
    await typeLine('CONNECTION ERROR. TRY AGAIN.');
    updateMood('error');
    setTimeout(() => {
      if (currentMood === 'error') {
        updateMood('listening');
      }
    }, 2500);
  }
}

async function processInput() {
  const value = input.value.trim();
  if (!value) {
    return;
  }
  playKeyBeep();
  input.value = '';
  resetIdleTimer();
  removePromptPlaceholder();
  await typeLine(`> ${value}`);
  updateMood('processing');
  await handleCommand(value);
  await typeLine('');
  promptPlaceholderActive = true;
}

function handleKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    processInput();
  } else if (event.key.length === 1) {
    playKeyBeep();
  }
}

function bindEvents() {
  input.addEventListener('keydown', handleKeydown);
  ['mousemove', 'keydown', 'pointerdown'].forEach((evt) =>
    document.addEventListener(evt, resetIdleTimer, { passive: true })
  );
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      resetIdleTimer();
    }
  });
  window.addEventListener('beforeunload', () => {
    if (glitchTimer) {
      clearInterval(glitchTimer);
    }
  });
}

function showBootSequence() {
  return typeLines(bootLines);
}

async function init() {
  resetIdleTimer();
  bindEvents();
  scheduleGlitch();
  await showBootSequence();
  updateMood('listening');
  input.focus();
}

init();
