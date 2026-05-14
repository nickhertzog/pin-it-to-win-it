import React, { useEffect, useMemo, useRef, useState } from "react";

const GAME_SECONDS = 30;
const FLASH_SECONDS = 2;
const STARTING_LIVES = 3;
const LEADERBOARD_KEY = "pinItToWinItLeaderboard";

const PIN_LAYOUT = {
  7: { x: 22, y: 42, size: 58, z: 1 },
  8: { x: 40.5, y: 42, size: 58, z: 1 },
  9: { x: 59.5, y: 42, size: 58, z: 1 },
  10: { x: 78, y: 42, size: 58, z: 1 },
  4: { x: 31, y: 56, size: 66, z: 2 },
  5: { x: 50, y: 56, size: 66, z: 2 },
  6: { x: 69, y: 56, size: 66, z: 2 },
  2: { x: 40.5, y: 70, size: 74, z: 3 },
  3: { x: 59.5, y: 70, size: 74, z: 3 },
  1: { x: 50, y: 84, size: 84, z: 4 },
};

const DRAW_ORDER = [7, 8, 9, 10, 4, 5, 6, 2, 3, 1];

function makeAllTwoPinQuestions() {
  const combos = [];
  for (let first = 1; first <= 10; first += 1) {
    for (let second = first + 1; second <= 10; second += 1) {
      combos.push({ label: `${first}-${second}`, answer: [first, second] });
    }
  }
  return combos;
}

const QUESTIONS = [
  { label: "1", answer: [1] },
  { label: "2", answer: [2] },
  { label: "3", answer: [3] },
  { label: "4", answer: [4] },
  { label: "5", answer: [5] },
  { label: "6", answer: [6] },
  { label: "7", answer: [7] },
  { label: "8", answer: [8] },
  { label: "9", answer: [9] },
  { label: "10", answer: [10] },
  ...makeAllTwoPinQuestions(),
  { label: "2-4-5", answer: [2, 4, 5] },
  { label: "3-5-6", answer: [3, 5, 6] },
  { label: "2-4-5-8", answer: [2, 4, 5, 8] },
  { label: "3-5-6-9", answer: [3, 5, 6, 9] },
  { label: "1-2-3-5", answer: [1, 2, 3, 5] },
  { label: "2-4-7", answer: [2, 4, 7] },
  { label: "3-6-10", answer: [3, 6, 10] },
  { label: "2-7-10", answer: [2, 7, 10] },
  { label: "3-7-10", answer: [3, 7, 10] },
  { label: "4-7-10", answer: [4, 7, 10] },
  { label: "5-7-10", answer: [5, 7, 10] },
  { label: "6-7-10", answer: [6, 7, 10] },
  { label: "1-2-4-10", answer: [1, 2, 4, 10] },
  { label: "1-3-6-7", answer: [1, 3, 6, 7] },
  { label: "1-2-7", answer: [1, 2, 7] },
  { label: "1-3-10", answer: [1, 3, 10] },
  { label: "1-2-4-7", answer: [1, 2, 4, 7] },
  { label: "1-3-6-10", answer: [1, 3, 6, 10] },
  { label: "1-2-8-10", answer: [1, 2, 8, 10] },
  { label: "1-3-7-9", answer: [1, 3, 7, 9] },
  { label: "1-2-4", answer: [1, 2, 4] },
  { label: "1-2-8", answer: [1, 2, 8] },
  { label: "1-3-6", answer: [1, 3, 6] },
  { label: "1-3-9", answer: [1, 3, 9] },
  { label: "2-5-8", answer: [2, 5, 8] },
  { label: "3-5-9", answer: [3, 5, 9] },
  { label: "4-7-8", answer: [4, 7, 8] },
  { label: "6-9-10", answer: [6, 9, 10] },
  { label: "2-4-7-8", answer: [2, 4, 7, 8] },
  { label: "3-6-9-10", answer: [3, 6, 9, 10] },
  { label: "4-6-7-10", answer: [4, 6, 7, 10] },
  { label: "7-8-9-10", answer: [7, 8, 9, 10] },
  { label: "4-6-7-8-10", answer: [4, 6, 7, 8, 10] },
  { label: "4-6-7-9-10", answer: [4, 6, 7, 9, 10] },
  { label: "2-4-6-7-10", answer: [2, 4, 6, 7, 10] },
  { label: "3-4-6-7-10", answer: [3, 4, 6, 7, 10] },
];

function normalizePins(pins) {
  return [...pins].sort((a, b) => a - b).join("-");
}

function arePinsEqual(a, b) {
  return normalizePins(a) === normalizePins(b);
}

function getFlashLevel(correctCount) {
  if (correctCount >= 20) return 5;
  if (correctCount >= 15) return 4;
  if (correctCount >= 10) return 3;
  if (correctCount >= 5) return 2;
  return 1;
}

function getFlashAnswerSeconds(correctCount) {
  const level = getFlashLevel(correctCount);
  return Math.max(2.25, 5 - (level - 1) * 0.75);
}

function getFlashDisplaySeconds(correctCount) {
  return getFlashLevel(correctCount) >= 5 ? 1 : FLASH_SECONDS;
}

function shuffleQuestions(previousLabel = "") {
  const pool = QUESTIONS.filter((question) => question.label !== previousLabel);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function getLeaderboardKey(mode) {
  return `${LEADERBOARD_KEY}:${mode || "race"}`;
}

function getLeaderboard(mode) {
  try {
    const stored = window.localStorage.getItem(getLeaderboardKey(mode));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(mode, entries) {
  try {
    window.localStorage.setItem(getLeaderboardKey(mode), JSON.stringify(entries));
  } catch {
    // localStorage may be blocked. Ignore.
  }
}

function addScoreToLeaderboard({ mode, score, correct, wrong, accuracy }) {
  const entry = { score, correct, wrong, accuracy, date: new Date().toLocaleDateString() };
  const updated = [...getLeaderboard(mode), entry]
    .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy || b.correct - a.correct)
    .slice(0, 5);
  saveLeaderboard(mode, updated);
  return updated;
}

function PinSprite({ size }) {
  return (
    <svg viewBox="0 0 120 250" className="pin-svg" style={{ width: `${size}px` }} aria-hidden="true">
      <defs>
        <linearGradient id="realPinBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#cfcfcf" />
          <stop offset="12%" stopColor="#f6f6f6" />
          <stop offset="35%" stopColor="#ffffff" />
          <stop offset="62%" stopColor="#fbfbfb" />
          <stop offset="86%" stopColor="#e3e3e3" />
          <stop offset="100%" stopColor="#bebebe" />
        </linearGradient>
        <linearGradient id="pinSideShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0.16)" />
          <stop offset="30%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.12)" />
        </linearGradient>
        <radialGradient id="pinTopGlow" cx="42%" cy="14%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="pinSoftShadow" x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.3" />
        </filter>
        <clipPath id="pinBodyClip">
          <path d="M60 7 C42 7 35 24 36 43 C37 58 47 71 47 88 C47 109 35 133 27 162 C21 184 17 211 31 232 C38 243 82 243 89 232 C103 211 99 184 93 162 C85 133 73 109 73 88 C73 71 83 58 84 43 C85 24 78 7 60 7Z" />
        </clipPath>
      </defs>
      <g filter="url(#pinSoftShadow)">
        <path d="M60 7 C42 7 35 24 36 43 C37 58 47 71 47 88 C47 109 35 133 27 162 C21 184 17 211 31 232 C38 243 82 243 89 232 C103 211 99 184 93 162 C85 133 73 109 73 88 C73 71 83 58 84 43 C85 24 78 7 60 7Z" fill="url(#realPinBody)" stroke="#15100e" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
        <g clipPath="url(#pinBodyClip)">
          <path d="M38 61 C47 64 73 64 82 61 L82 72 C73 75 47 75 38 72Z" fill="#d40000" />
          <path d="M39 80 C49 83 71 83 81 80 L81 92 C71 95 49 95 39 92Z" fill="#d40000" />
        </g>
        <path d="M60 7 C42 7 35 24 36 43 C37 58 47 71 47 88 C47 109 35 133 27 162 C21 184 17 211 31 232 C38 243 82 243 89 232 C103 211 99 184 93 162 C85 133 73 109 73 88 C73 71 83 58 84 43 C85 24 78 7 60 7Z" fill="url(#pinSideShade)" opacity="0.42" pointerEvents="none" />
        <ellipse cx="53" cy="35" rx="18" ry="26" fill="url(#pinTopGlow)" />
        <path d="M47 18 C40 31 41 50 45 62 C48 72 51 78 50 89 C48 118 34 151 31 183" fill="none" stroke="#ffffff" strokeWidth="5" strokeOpacity="0.46" strokeLinecap="round" />
        <path d="M76 30 C78 46 72 63 71 82 C70 112 86 151 91 188" fill="none" stroke="#000000" strokeWidth="6" strokeOpacity="0.08" strokeLinecap="round" />
        <path d="M31 232 C40 239 80 239 89 232 C85 244 36 244 31 232Z" fill="#d7d7d7" opacity="0.9" />
      </g>
    </svg>
  );
}

function PinShadow({ size }) {
  return (
    <div
      className="pin-shadow"
      style={{ width: `${size * 0.62}px`, height: `${Math.max(7, size * 0.13)}px` }}
    />
  );
}

function RackPin({ pin }) {
  const pos = PIN_LAYOUT[pin];
  const baseY = pos.y + 10;
  return (
    <div className="rack-pin" style={{ left: `${pos.x}%`, top: `${baseY}%`, zIndex: pos.z }}>
      <div className="pin-wrap">
        <PinShadow size={pos.size} />
        <PinSprite size={pos.size} />
      </div>
    </div>
  );
}

function PuzzleRack({ standingPins }) {
  const standingSet = new Set(standingPins);
  return (
    <div className="rack">
      <div className="lane-bg" />
      <div className="gutter gutter-left" />
      <div className="gutter gutter-right" />
      <div className="boards" />
      <div className="lane-fade" />
      {DRAW_ORDER.filter((pin) => standingSet.has(pin)).map((pin) => (
        <RackPin key={pin} pin={pin} />
      ))}
    </div>
  );
}

function AnswerPad({ selectedPins, feedback, quitMessage, onTogglePin, onClear, onSubmit, large = false }) {
  const disabled = Boolean(feedback) || quitMessage;
  const testItems = [1, 6, 2, 7, 3, 8, 4, 9, 5, 10];
  const clearDisabled = disabled || selectedPins.length === 0;

  function handlePointerDown(event, action) {
    event.preventDefault();
    if (disabled) return;
    action();
  }

  return (
    <div className="answer-pad">
      <div className="test-grid">
        {testItems.map((item) => {
          const selected = selectedPins.includes(item);
          return (
            <button
              key={item}
              type="button"
              onPointerDown={(event) => handlePointerDown(event, () => onTogglePin(item))}
              disabled={disabled}
              className={`${large ? "pad-btn pad-btn-large" : "pad-btn"} ${selected ? "selected" : ""}`}
            >
              {item}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onPointerDown={(event) => handlePointerDown(event, onSubmit)}
        disabled={disabled}
        className={large ? "submit-btn submit-btn-large" : "submit-btn"}
      >
        Submit
      </button>

      <button
        type="button"
        onPointerDown={(event) => {
          event.preventDefault();
          if (!clearDisabled) onClear();
        }}
        disabled={clearDisabled}
        className={large ? "clear-btn clear-btn-large" : "clear-btn"}
      >
        Clear
      </button>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(null);
  const [gameState, setGameState] = useState("title");
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [selectedPins, setSelectedPins] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [quitMessage, setQuitMessage] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(() => QUESTIONS[0]);
  const [flashVisible, setFlashVisible] = useState(false);
  const [flashAnswerTimeLeft, setFlashAnswerTimeLeft] = useState(FLASH_ANSWER_BASE_SECONDS);
  const [showLevelIntro, setShowLevelIntro] = useState(false);
  const [levelIntroValue, setLevelIntroValue] = useState(1);

  const timerRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);
  const flashTimeoutRef = useRef(null);
  const answerTimerRef = useRef(null);
  const levelIntroTimeoutRef = useRef(null);
  const questionBagRef = useRef([]);
  const latestRef = useRef({
    gameState: "title",
    mode: null,
    feedback: null,
    quitMessage: false,
    correct: 0,
    lives: STARTING_LIVES,
  });

  useEffect(() => {
    latestRef.current = { gameState, mode, feedback, quitMessage, correct, lives };
  }, [gameState, mode, feedback, quitMessage, correct, lives]);

  const accuracy = useMemo(() => {
    const total = correct + wrong;
    if (!total) return 0;
    return Math.round((correct / total) * 100);
  }, [correct, wrong]);

  function drawQuestion(previousLabel = "") {
    if (!questionBagRef.current.length) {
      questionBagRef.current = shuffleQuestions(previousLabel);
    }

    let next = questionBagRef.current.pop();
    if (!next || next.label === previousLabel) {
      questionBagRef.current = shuffleQuestions(previousLabel);
      next = questionBagRef.current.pop() || QUESTIONS[0];
    }
    return next;
  }

  function clearAllTimers() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (answerTimerRef.current) window.clearInterval(answerTimerRef.current);
    if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);
    if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    if (levelIntroTimeoutRef.current) window.clearTimeout(levelIntroTimeoutRef.current);
  }

  function nextQuestion(correctCountForRound = correct) {
    const activeMode = latestRef.current.mode || mode;
    setSelectedPins([]);
    setFeedback(null);

    setCurrentQuestion((prev) => {
      const next = drawQuestion(prev.label);
      if (activeMode === "flash") {
        beginFlash(correctCountForRound);
      } else {
        setFlashVisible(true);
      }
      return next;
    });
  }

  function loseFlashLife(correctCountForRound) {
    const latest = latestRef.current;
    if (latest.gameState !== "playing" || latest.mode !== "flash" || latest.feedback || latest.quitMessage) return;

    if (answerTimerRef.current) window.clearInterval(answerTimerRef.current);
    if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);

    const nextLives = Math.max(0, latest.lives - 1);
    setWrong((prev) => prev + 1);
    setLives(nextLives);
    setSelectedPins([]);
    setFeedback("wrong");

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
      if (nextLives <= 0) {
        setGameState("finished");
        return;
      }
      nextQuestion(correctCountForRound);
    }, 300);
  }

  function startFlashAnswerTimer(correctCountForRound = correct) {
    if (answerTimerRef.current) window.clearInterval(answerTimerRef.current);
    setFlashAnswerTimeLeft(getFlashAnswerSeconds(correctCountForRound));

    answerTimerRef.current = window.setInterval(() => {
      setFlashAnswerTimeLeft((prev) => {
        const next = Math.max(0, Number((prev - 0.1).toFixed(1)));
        if (next <= 0) {
          window.clearInterval(answerTimerRef.current);
          loseFlashLife(correctCountForRound);
        }
        return next;
      });
    }, 100);
  }

  function beginFlash(correctCountForRound = correct) {
    setFlashVisible(true);
    setShowLevelIntro(false);
    setFlashAnswerTimeLeft(getFlashAnswerSeconds(correctCountForRound));

    if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    if (answerTimerRef.current) window.clearInterval(answerTimerRef.current);

    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashVisible(false);
      startFlashAnswerTimer(correctCountForRound);
    }, getFlashDisplaySeconds(correctCountForRound) * 1000);
  }

  function runLevelIntroIfNeeded(nextCorrect, continueFn) {
    if (mode !== "flash") {
      continueFn();
      return;
    }

    const previousLevel = getFlashLevel(Math.max(0, nextCorrect - 1));
    const newLevel = getFlashLevel(nextCorrect);

    if (newLevel > previousLevel) {
      setLives((prev) => Math.min(STARTING_LIVES, prev + 1));
      setShowLevelIntro(true);
      setLevelIntroValue(newLevel);
      setSelectedPins([]);
      setFeedback(null);
      setFlashVisible(false);
      setFlashAnswerTimeLeft(getFlashAnswerSeconds(nextCorrect));

      if (levelIntroTimeoutRef.current) window.clearTimeout(levelIntroTimeoutRef.current);
      levelIntroTimeoutRef.current = window.setTimeout(() => {
        setShowLevelIntro(false);
        continueFn();
      }, 1200);
    } else {
      continueFn();
    }
  }

  useEffect(() => {
    if (gameState !== "playing" || mode !== "race") return undefined;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        const next = Math.max(0, Number((prev - 0.1).toFixed(1)));
        if (next <= 0) {
          window.clearInterval(timerRef.current);
          setGameState("finished");
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(timerRef.current);
  }, [gameState, mode]);

  useEffect(() => {
    if (mode !== "bumpers" && mode !== "padtest" && lives <= 0 && gameState === "playing") {
      window.clearInterval(timerRef.current);
      window.clearInterval(answerTimerRef.current);
      setGameState("finished");
    }
  }, [lives, gameState, mode]);

  useEffect(() => {
    if (gameState !== "finished" || scoreSaved || mode === "bumpers" || mode === "padtest") return;
    const updated = addScoreToLeaderboard({ mode, score, correct, wrong, accuracy });
    setLeaderboard(updated);
    setScoreSaved(true);
  }, [gameState, scoreSaved, score, correct, wrong, accuracy, mode]);

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  function startGame(selectedMode, startingCorrect = 0) {
    clearAllTimers();
    questionBagRef.current = [];
    const next = drawQuestion(currentQuestion.label);

    setMode(selectedMode);
    setLeaderboard(getLeaderboard(selectedMode));
    setGameState("playing");
    setTimeLeft(GAME_SECONDS);
    setLives(STARTING_LIVES);
    setScore(startingCorrect);
    setCorrect(startingCorrect);
    setWrong(0);
    setSelectedPins([]);
    setFeedback(null);
    setQuitMessage(false);
    setScoreSaved(false);
    setShowLevelIntro(false);
    setLevelIntroValue(getFlashLevel(startingCorrect));
    setCurrentQuestion(next);
    setFlashAnswerTimeLeft(FLASH_ANSWER_BASE_SECONDS);

    if (selectedMode === "flash") {
      beginFlash(startingCorrect);
    } else {
      setFlashVisible(true);
    }
  }

  function resetToModeSelect() {
    clearAllTimers();
    questionBagRef.current = [];
    setMode(null);
    setGameState("modeSelect");
    setTimeLeft(GAME_SECONDS);
    setLives(STARTING_LIVES);
    setScore(0);
    setCorrect(0);
    setWrong(0);
    setSelectedPins([]);
    setFeedback(null);
    setQuitMessage(false);
    setScoreSaved(false);
    setFlashVisible(false);
    setShowLevelIntro(false);
    setLevelIntroValue(1);
    setFlashAnswerTimeLeft(FLASH_ANSWER_BASE_SECONDS);
    setCurrentQuestion(drawQuestion());
  }

  function handleQuit() {
    if (gameState !== "playing") return;
    clearAllTimers();
    setSelectedPins([]);
    setFeedback(null);
    setFlashVisible(false);
    setShowLevelIntro(false);
    setQuitMessage(true);
  }

  function togglePin(pin) {
    if (gameState !== "playing" || feedback || quitMessage || showLevelIntro) return;
    setSelectedPins((prev) =>
      prev.includes(pin) ? prev.filter((p) => p !== pin) : [...prev, pin]
    );
  }

  function clearAnswer() {
    if (gameState !== "playing" || feedback || quitMessage || showLevelIntro) return;
    setSelectedPins([]);
  }

  function submitAnswer() {
    if (gameState !== "playing" || feedback || quitMessage || showLevelIntro) return;
    if (mode === "flash" && flashVisible) return;
    if (mode === "flash" && answerTimerRef.current) window.clearInterval(answerTimerRef.current);

    const isCorrect = arePinsEqual(selectedPins, currentQuestion.answer);

    if (isCorrect) {
      const nextCorrect = correct + 1;

      if (mode !== "bumpers" && mode !== "padtest") {
        setScore((prev) => prev + 1);
        setCorrect(nextCorrect);
      }

      setFeedback("correct");
      feedbackTimeoutRef.current = window.setTimeout(() => {
        if (mode === "flash") {
          runLevelIntroIfNeeded(nextCorrect, () => nextQuestion(nextCorrect));
        } else {
          nextQuestion(mode === "bumpers" || mode === "padtest" ? correct : nextCorrect);
        }
      }, mode === "bumpers" || mode === "padtest" ? 450 : 250);
    } else {
      if (mode !== "bumpers" && mode !== "padtest") {
        setWrong((prev) => prev + 1);
        setLives((prev) => Math.max(0, prev - 1));
      }

      setFeedback("wrong");
      feedbackTimeoutRef.current = window.setTimeout(() => {
        if (mode === "bumpers" || mode === "padtest") {
          nextQuestion(correct);
          return;
        }

        setLives((currentLives) => {
          if (currentLives <= 0) return currentLives;
          nextQuestion(correct);
          return currentLives;
        });
      }, mode === "bumpers" || mode === "padtest" ? 450 : 250);
    }
  }

  const visiblePins =
    gameState === "playing" &&
    !quitMessage &&
    (mode === "bumpers" || mode === "padtest" || flashVisible)
      ? currentQuestion.answer
      : [];

  const showFlashAnswerPad =
    mode === "flash" && gameState === "playing" && !flashVisible && !quitMessage && !showLevelIntro;

  return (
    <div className="app-shell">
      <div className="app-container">
        {gameState !== "title" && (
          <header className="app-header">
            <h1>Pin It to Win It</h1>
          </header>
        )}

        {gameState === "title" && (
          <div className="card title-card">
            <div className="title-main">Pin It</div>
            <div className="title-accent">to Win It</div>
            <div className="title-sub">Bowling Spare Trainer</div>
            <div className="title-copy">Train your spare recognition, memory, and speed.</div>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                setGameState("modeSelect");
              }}
              className="start-btn"
            >
              Start
            </button>
            <div className="tap-start">Tap Start</div>
          </div>
        )}

        {gameState === "modeSelect" && (
          <div className="card mode-card">
            <h2>Choose Mode</h2>

            <div className="mode-list">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  startGame("race");
                }}
                className="mode-btn green"
              >
                <div className="mode-title">⏱️ Clock Race</div>
                <div className="mode-lines">
                  <div>• 30 seconds</div>
                  <div>• Three lives</div>
                  <div>• Score as many as possible</div>
                </div>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  startGame("flash");
                }}
                className="mode-btn white"
              >
                <div className="mode-title">⚡ Flash Memory</div>
                <div className="mode-lines">
                  <div>• Spares flash, then disappear</div>
                  <div>• Answer before time runs out</div>
                  <div>• Levels get harder</div>
                  <div>• Three lives</div>
                </div>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  startGame("bumpers");
                }}
                className="mode-btn blue"
              >
                <div className="mode-title">🎳 With Bumpers</div>
                <div className="mode-lines">
                  <div>• Infinite lives</div>
                  <div>• No clock</div>
                  <div>• Just practice</div>
                </div>
              </button>

              <div className="sandbox-row">
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    startGame("padtest");
                  }}
                  className="sandbox-btn"
                >
                  🏖️ Sandbox
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState !== "title" && gameState !== "modeSelect" && (
          <>
            {gameState !== "finished" && (
              <div className="stats-card">
                <div>
                  <div className="stat-label">Mode</div>
                  <div className="stat-value">
                    {mode === "bumpers"
                      ? "Practice"
                      : mode === "padtest"
                        ? "Sandbox"
                        : mode === "flash"
                          ? "Flash"
                          : "Race"}
                  </div>
                </div>

                <div>
                  <div className="stat-label">
                    {mode === "race" ? "Time" : mode === "flash" ? (flashVisible || showLevelIntro ? "Level" : "Answer") : "Timer"}
                  </div>
                  <div
                    className={`stat-value ${
                      timeLeft <= 3 && mode === "race"
                        ? "danger"
                        : mode === "flash" && !flashVisible && flashAnswerTimeLeft <= 2.25
                          ? "danger"
                          : ""
                    }`}
                  >
                    {mode === "race"
                      ? timeLeft.toFixed(1)
                      : mode === "flash"
                        ? flashVisible || showLevelIntro
                          ? `L${showLevelIntro ? levelIntroValue : getFlashLevel(correct)}`
                          : flashAnswerTimeLeft.toFixed(1)
                        : "Off"}
                  </div>
                </div>

                <div>
                  <div className="stat-label">Lives</div>
                  <div className="stat-value">
                    {mode === "bumpers" || mode === "padtest"
                      ? "Off"
                      : `${"♥".repeat(lives)}${"♡".repeat(STARTING_LIVES - lives)}`}
                  </div>
                </div>

                <div>
                  <div className="stat-label">Score</div>
                  <div className="stat-value">{mode === "bumpers" || mode === "padtest" ? "Off" : score}</div>
                </div>
              </div>
            )}

            {gameState === "playing" && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleQuit();
                }}
                disabled={quitMessage}
                className="reset-btn"
              >
                Reset
              </button>
            )}

            {gameState === "finished" ? (
              <div className="card finish-card">
                <h2>Game Over</h2>
                <div className="finish-mode">{mode === "flash" ? "Flash Memory" : "Clock Race"}</div>

                <div className="finish-stats">
                  <div>
                    <span>Score</span>
                    <strong>{score}</strong>
                  </div>
                  <div>
                    <span>Acc.</span>
                    <strong>{accuracy}%</strong>
                  </div>
                  <div>
                    <span>Right</span>
                    <strong>{correct}</strong>
                  </div>
                  <div>
                    <span>Wrong</span>
                    <strong>{wrong}</strong>
                  </div>
                </div>

                <div className="leaderboard">
                  <h3>Top 5 Scores</h3>
                  {leaderboard.length ? (
                    leaderboard.map((entry, index) => (
                      <div key={`${entry.score}-${entry.date}-${index}`} className="leader-row">
                        <b>#{index + 1}</b>
                        <span>
                          {entry.score} points
                          <br />
                          <small>{entry.correct} correct · {entry.accuracy}%</small>
                        </span>
                        <em>{entry.date}</em>
                      </div>
                    ))
                  ) : (
                    <p>No scores yet.</p>
                  )}
                </div>

                <div className="finish-actions">
                  <button type="button" onClick={resetToModeSelect}>
                    Modes
                  </button>
                  <button type="button" onClick={() => startGame(mode || "race")}>
                    Play Again
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={`play-window ${
                    showFlashAnswerPad
                      ? "flash-input-window"
                      : mode === "race" || mode === "bumpers"
                        ? "short-window"
                        : "normal-window"
                  }`}
                >
                  {showFlashAnswerPad ? (
                    <div className="flash-pad-panel">
                      <div className="flash-pad-title">
                        Level {getFlashLevel(correct)} · {flashAnswerTimeLeft.toFixed(1)}s
                      </div>
                      <AnswerPad
                        selectedPins={selectedPins}
                        feedback={feedback}
                        quitMessage={quitMessage}
                        onTogglePin={togglePin}
                        onClear={clearAnswer}
                        onSubmit={submitAnswer}
                        large
                      />
                    </div>
                  ) : (
                    <PuzzleRack standingPins={visiblePins} />
                  )}

                  {feedback && <div className={`feedback-overlay ${feedback === "correct" ? "good" : "bad"}`} />}

                  {showLevelIntro && (
                    <div className="level-overlay">
                      <div>
                        <div className="level-kicker">Level Up</div>
                        <div className="level-title">Level {levelIntroValue}</div>
                        {levelIntroValue === 5 ? (
                          <div className="level-quote">“Number 5, are you kidding me?”</div>
                        ) : (
                          <div className="level-copy">+1 life · Get ready</div>
                        )}
                      </div>
                    </div>
                  )}

                  {quitMessage && (
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        resetToModeSelect();
                      }}
                      className="quit-overlay"
                    >
                      <div>
                        <div className="quit-main">quitters are splitters</div>
                        <div className="quit-sub">tap anywhere</div>
                      </div>
                    </button>
                  )}
                </div>

                {gameState === "playing" && mode !== "flash" && (
                  <AnswerPad
                    selectedPins={selectedPins}
                    feedback={feedback}
                    quitMessage={quitMessage}
                    onTogglePin={togglePin}
                    onClear={clearAnswer}
                    onSubmit={submitAnswer}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
