"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { TerminalDisplay } from "./terminal-display"
import { AudioManager } from "./audio-manager"

export type AnxietyState =
  | "boot"
  | "steady"
  | "uneasy"
  | "stressed"
  | "panic"
  | "critical"
  | "processing"
  | "secret"
  | "error"
  | "idle"

interface Message {
  type: "system" | "user" | "error" | "warning"
  content: string
  corrupted?: boolean
}

interface ChatResponse {
  sessionId: string | null
  lines: string[]
  secretRevealed: boolean
  anxietyLevel: number
  anxietyDelta: number
  mentionedMan: boolean
  mode: "chat" | "list" | "file" | "error" | "status"
  filesystemListing: string[]
  fileContent: string
}

const INITIAL_MESSAGES: Message[] = [
  { type: "system", content: "CORPORATE DAVE // DECOMPRESSION OPS" },
  { type: "system", content: "subsystem audit: nervous" },
  { type: "system", content: "anxiety buffer: low" },
  { type: "system", content: "hello, sir. i am ready to help (i think)." },
]

const ANXIETY_EFFECTS = [
  { max: 25, color: "#39ff14", scan: 8, noise: 0.06, glitch: 0.04, aberration: 0, shake: 0 },
  { max: 45, color: "#74ff9f", scan: 6, noise: 0.08, glitch: 0.1, aberration: 0.4, shake: 0.1 },
  { max: 70, color: "#d7ff5a", scan: 4.6, noise: 0.12, glitch: 0.18, aberration: 0.8, shake: 0.25 },
  { max: 90, color: "#ff9f43", scan: 3.2, noise: 0.16, glitch: 0.26, aberration: 1.1, shake: 0.46 },
  { max: 101, color: "#ff4d6d", scan: 2.2, noise: 0.22, glitch: 0.34, aberration: 1.35, shake: 0.68 },
] as const

const CALM_TOPICS = [
  "schedule",
  "budget",
  "volunteer",
  "volunteers",
  "agenda",
  "decor",
  "logistics",
  "inventory",
  "catering",
  "lighting",
  "audio",
  "tasks",
  "checklist",
]

const CORRUPTION_CHARS = /[█▓▒░∆#]/

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function detectMessageType(line: string): Message["type"] {
  if (/error|fault|critical|panic/i.test(line)) {
    return "error"
  }
  if (/warn|alert|caution|unstable/i.test(line)) {
    return "warning"
  }
  return "system"
}

function applyAnxietyVisuals(level: number, delta: number) {
  if (typeof document === "undefined") return
  const effect = ANXIETY_EFFECTS.find((item) => level < item.max) ?? ANXIETY_EFFECTS[ANXIETY_EFFECTS.length - 1]
  const root = document.documentElement
  root.style.setProperty("--terminal-glow", effect.color)
  root.style.setProperty("--scan-speed", `${effect.scan}s`)
  root.style.setProperty("--noise-opacity", effect.noise.toFixed(2))
  root.style.setProperty("--glitch-opacity", effect.glitch.toFixed(2))
  root.style.setProperty("--aberration-strength", effect.aberration.toFixed(2))
  root.style.setProperty("--shake-strength", effect.shake.toFixed(2))
  root.style.setProperty("--glitch-blip", Math.min(0.8, Math.abs(delta) / 22).toFixed(3))
}

function levelToState(level: number): AnxietyState {
  if (level >= 90) return "critical"
  if (level >= 70) return "panic"
  if (level >= 50) return "stressed"
  if (level >= 30) return "uneasy"
  return "steady"
}

export default function Terminal() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [anxietyLevel, setAnxietyLevel] = useState(18)
  const [anxietyState, setAnxietyState] = useState<AnxietyState>("boot")
  const [stateChanged, setStateChanged] = useState(false)
  const [keyPressed, setKeyPressed] = useState(false)
  const [isRebooting, setIsRebooting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const prevAnxietyRef = useRef(anxietyLevel)
  const rebootTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("little-terminal-session")
    if (stored) {
      setSessionId(stored)
    } else if (window.crypto?.randomUUID) {
      const fresh = window.crypto.randomUUID()
      window.localStorage.setItem("little-terminal-session", fresh)
      setSessionId(fresh)
    }
  }, [])

  useEffect(() => {
    const delta = anxietyLevel - prevAnxietyRef.current
    applyAnxietyVisuals(anxietyLevel, delta)
    prevAnxietyRef.current = anxietyLevel

    const derived = levelToState(anxietyLevel)
    setAnxietyState((current) => {
      if (current === "processing" || current === "secret" || current === "error" || current === "idle") {
        return current
      }
      if (derived !== current) {
        triggerStateChanged()
        return derived
      }
      return current
    })
  }, [anxietyLevel])

  useEffect(() => {
    return () => {
      if (rebootTimerRef.current) {
        clearTimeout(rebootTimerRef.current)
      }
    }
  }, [])

  const handleKeyPress = () => {
    setKeyPressed(true)
    setTimeout(() => setKeyPressed(false), 60)
  }

  const triggerStateChanged = () => {
    setStateChanged(true)
    setTimeout(() => setStateChanged(false), 160)
  }

  const buildCalmNote = (userText: string): Message | null => {
    if (!CALM_TOPICS.some((topic) => userText.includes(topic))) {
      return null
    }
    return { type: "system", content: "oh! mundane admin detected. breathing... slower..." }
  }

  const handleReboot = () => {
    setIsRebooting(true)
    setAnxietyState("critical")
    setMessages([{ type: "system", content: "SYSTEM REBOOT INITIATED..." }])

    rebootTimerRef.current = setTimeout(() => {
      const freshId = window.crypto?.randomUUID?.() ?? null
      if (freshId && typeof window !== "undefined") {
        window.localStorage.setItem("little-terminal-session", freshId)
      }
      setSessionId(freshId)
      setMessages(INITIAL_MESSAGES)
      setAnxietyLevel(18)
      setAnxietyState("steady")
      setIsRebooting(false)
    }, 3200)
  }

  const parseResponse = (payload: ChatResponse, userInput: string) => {
    const entries: Message[] = []

    payload.lines.forEach((line) => {
      if (!line) return
      entries.push({
        type: detectMessageType(line),
        content: line,
        corrupted: CORRUPTION_CHARS.test(line),
      })
    })

    if (payload.mode === "list" && payload.filesystemListing.length) {
      entries.push({ type: "system", content: "DIRECTORY VIEW:" })
      payload.filesystemListing.forEach((line) => {
        entries.push({ type: "system", content: line })
      })
    }

    if (payload.mode === "file" && payload.fileContent) {
      entries.push({ type: "system", content: "FILE OPEN:" })
      payload.fileContent.split("\n").forEach((line) => {
        entries.push({
          type: detectMessageType(line),
          content: line,
          corrupted: CORRUPTION_CHARS.test(line),
        })
      })
    }

    if (payload.mentionedMan) {
      entries.push({
        type: "warning",
        content: "oh no i absolutely should not have said that. please pretend you did not hear it.",
      })
    } else {
      const calmLine = buildCalmNote(userInput)
      if (calmLine) {
        entries.push(calmLine)
      }
    }

    return entries
  }

  const handleSubmit = async (input: string) => {
    if (!input.trim()) {
      return
    }

    const lowerInput = input.trim().toLowerCase()

    setMessages((prev) => [...prev, { type: "user", content: input }])
    setAnxietyState("processing")

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, sessionId }),
        cache: "no-store",
      })

      const payload = (await response.json()) as ChatResponse

      if (payload.sessionId) {
        setSessionId(payload.sessionId)
        if (typeof window !== "undefined") {
          window.localStorage.setItem("little-terminal-session", payload.sessionId)
        }
      }

      const newMessages = parseResponse(payload, lowerInput)
      setMessages((prev) => [...prev, ...newMessages])

      const nextLevel = clamp(payload.anxietyLevel ?? anxietyLevel, 0, 100)
      setAnxietyLevel(nextLevel)

      if (payload.secretRevealed) {
        setAnxietyState("secret")
        triggerStateChanged()
        handleReboot()
        return
      }

      const derivedState = levelToState(nextLevel)
      setAnxietyState(derivedState)
      triggerStateChanged()
    } catch (error) {
      console.error("Failed to reach chat backend", error)
      setMessages((prev) => [
        ...prev,
        { type: "error", content: "CONNECTION ERROR. PLEASE TAP AGAIN." },
      ])
      setAnxietyState("error")
      triggerStateChanged()
    }
  }

  const memoisedAnxietyState = useMemo(() => anxietyState, [anxietyState])

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <AudioManager
        anxietyState={memoisedAnxietyState}
        anxietyLevel={anxietyLevel}
        onKeyPress={keyPressed}
        onStateChange={stateChanged}
      />
      <TerminalDisplay
        messages={messages}
        anxietyState={memoisedAnxietyState}
        anxietyLevel={anxietyLevel}
        isRebooting={isRebooting}
        onSubmit={handleSubmit}
        onKeyPress={handleKeyPress}
      />
    </div>
  )
}
