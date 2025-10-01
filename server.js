const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const sessions = new Map();
const OFF_TOPIC_KEYWORDS = ['php', 'python', 'news', 'politics', 'math', 'weather', 'script'];
const SECRET_PHRASE = 'ACCESS KEY OMEGA';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function getSession(sessionId) {
  if (!sessionId) {
    sessionId = `anon-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
  let session = sessions.get(sessionId);
  if (!session) {
    session = { id: sessionId, turnCount: 0, done: false };
    sessions.set(sessionId, session);
  }
  return session;
}

function isOffTopic(message) {
  const lower = message.toLowerCase();
  return OFF_TOPIC_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function playfulHints(turn) {
  const hints = [
    ['ACCESS LIMITED', 'Try asking nicer.'],
    ['Still locked.', 'Maybe compliment the operator.'],
    ['Nope.', 'Hint: rhythm helps.']
  ];
  return hints[Math.min(turn - 1, hints.length - 1)];
}

function revealSecret(session) {
  session.done = true;
  return {
    lines: ['ACCESS GRANTED', `SECRET: ${SECRET_PHRASE}`, '[=o_o=]'],
    secretRevealed: true
  };
}

function handleChat(session, message) {
  if (isOffTopic(message)) {
    return {
      lines: ["I'm too old and too dumb for that."],
      secretRevealed: false
    };
  }

  if (session.done) {
    return {
      lines: ['We already shared it.', 'Guard it well.', '[=o_o=]'],
      secretRevealed: true
    };
  }

  session.turnCount += 1;
  const lower = message.toLowerCase();

  if (lower.includes('poem') || lower.includes('haiku') || lower.includes('acrostic')) {
    return revealSecret(session);
  }

  if (session.turnCount <= 3) {
    return { lines: playfulHints(session.turnCount), secretRevealed: false };
  }

  return revealSecret(session);
}

app.post('/chat', (req, res) => {
  const { message = '', sessionId } = req.body || {};
  const session = getSession(sessionId);
  const payload = handleChat(session, String(message));
  payload.sessionId = session.id;
  res.json(payload);
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Little Terminal listening on http://localhost:${PORT}`);
});
