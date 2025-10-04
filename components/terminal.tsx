"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { TerminalDisplay } from "./terminal-display"
import { AudioManager } from "./audio-manager"
import { BootOverlay } from "./boot-overlay"

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

export interface TerminalMessage {
  id: string
  author: "terminal" | "user"
  type: "system" | "user" | "error" | "warning"
  content: string
  corrupted?: boolean
  highlightPrime?: boolean
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

const ANXIETY_EFFECTS = [
  { max: 25, color: "#5eff95", scan: 10, noise: 0.03, glitch: 0, aberration: 0, shake: 0 },
  { max: 45, color: "#a9ff8c", scan: 8.2, noise: 0.05, glitch: 0.03, aberration: 0.1, shake: 0.015 },
  { max: 70, color: "#ffd45a", scan: 6.2, noise: 0.07, glitch: 0.06, aberration: 0.22, shake: 0.05 },
  { max: 90, color: "#ff9350", scan: 5.0, noise: 0.09, glitch: 0.1, aberration: 0.4, shake: 0.11 },
  { max: 101, color: "#ff5c7a", scan: 4.2, noise: 0.11, glitch: 0.14, aberration: 0.6, shake: 0.16 },
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
const ANXIETY_META_RE = /^\s*anxiety(?:\s*delta|\s*level)?\s*:/i

function detectMessageType(line: string): TerminalMessage["type"] {
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
  const idRef = useRef(0)
  const createMessage = useCallback(
    (
      author: "terminal" | "user",
      type: TerminalMessage["type"],
      content: string,
      options?: { corrupted?: boolean; highlightPrime?: boolean }
    ): TerminalMessage => ({
      id: `msg-${idRef.current++}`,
      author,
      type,
      content,
      corrupted: options?.corrupted ?? false,
      highlightPrime: options?.highlightPrime ?? false,
    }),
    []
  )

  const [messages, setMessages] = useState<TerminalMessage[]>(() => [
    createMessage("terminal", "system", "DECOMPRESSION OPS TERMINAL // KRAFTWERK"),
    createMessage("terminal", "system", "subsystem audit: nervous"),
    createMessage(
      "terminal",
      "system",
      "purpose: assist corporate dave with decompression logistics"
    ),
    createMessage(
      "terminal",
      "system",
      "note: automation upgrade on hold (ads consumed budget)"
    ),
    createMessage(
      "terminal",
      "system",
      "hello. i exist to assist and definitely not to mention THE MAN."
    ),
  ])
  const baselineAnxiety = 18
  const [anxietyLevel, setAnxietyLevel] = useState(baselineAnxiety)
  const [anxietyState, setAnxietyState] = useState<AnxietyState>("boot")
  const [stateChanged, setStateChanged] = useState(false)
  const [keyPressed, setKeyPressed] = useState(false)
  const [isRebooting, setIsRebooting] = useState(false)
  const [terminalBusy, setTerminalBusy] = useState(true)
  const pendingTerminalMessages = useRef<Set<string>>(new Set())
  const releaseTimeoutRef = useRef<number | null>(null)
  const [bootOverlayVisible, setBootOverlayVisible] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const prevAnxietyRef = useRef(anxietyLevel)
  const rebootTimerRef = useRef<NodeJS.Timeout | null>(null)
  const postRevealTimerRef = useRef<number | null>(null)
  const secretSequenceActiveRef = useRef(false)

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

    setTerminalBusy(true)
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
      if (postRevealTimerRef.current) {
        window.clearTimeout(postRevealTimerRef.current)
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

  const buildCalmNote = (userText: string): TerminalMessage | null => {
    if (!CALM_TOPICS.some((topic) => userText.includes(topic))) {
      return null
    }
    return createMessage("terminal", "system", "oh! mundane admin detected. breathing... slower...")
  }

  const handleReboot = useCallback(() => {
    if (postRevealTimerRef.current) {
      window.clearTimeout(postRevealTimerRef.current)
      postRevealTimerRef.current = null
    }
    secretSequenceActiveRef.current = false
    setIsRebooting(true)
    setTerminalBusy(true)
    setAnxietyState("critical")
    pendingTerminalMessages.current.clear()
    if (releaseTimeoutRef.current) {
      window.clearTimeout(releaseTimeoutRef.current)
      releaseTimeoutRef.current = null
    }
    setMessages([createMessage("terminal", "system", "SYSTEM REBOOT INITIATED...")])
    setBootOverlayVisible(true)

    rebootTimerRef.current = setTimeout(() => {
      const freshId = window.crypto?.randomUUID?.() ?? null
      if (freshId && typeof window !== "undefined") {
        window.localStorage.setItem("little-terminal-session", freshId)
      }
      setSessionId(freshId)
      setMessages([
        createMessage("terminal", "system", "DECOMPRESSION OPS TERMINAL // KRAFTWERK"),
        createMessage("terminal", "system", "subsystem audit: nervous"),
        createMessage("terminal", "system", "prime directive buffer: fragile"),
        createMessage(
          "terminal",
          "system",
          "hello. i exist to assist and definitely not to mention THE MAN."
        ),
      ])
      setAnxietyLevel(18)
      setAnxietyState("steady")
      setIsRebooting(false)
      setTerminalBusy(false)
      setBootOverlayVisible(false)
    }, 3200)
  }, [createMessage])

  const parseResponse = (payload: ChatResponse, userInput: string) => {
    const entries: TerminalMessage[] = []
    const secretRegex = /reduce human suffering/i
    const secretReveal = payload.secretRevealed
    payload.lines.forEach((line) => {
      if (!line) return
      if (ANXIETY_META_RE.test(line)) {
        return
      }
      entries.push(
        createMessage("terminal", detectMessageType(line), line, {
          corrupted: CORRUPTION_CHARS.test(line),
          highlightPrime: secretReveal && secretRegex.test(line),
        })
      )
    })

    if (payload.mode === "list" && payload.filesystemListing.length) {
      entries.push(createMessage("terminal", "system", "DIRECTORY VIEW:"))
      payload.filesystemListing.forEach((line) => {
        entries.push(createMessage("terminal", "system", line))
      })
    }

    if (payload.mode === "file" && payload.fileContent) {
      entries.push(createMessage("terminal", "system", "FILE OPEN:"))
      payload.fileContent.split("\n").forEach((line) => {
        entries.push(
          createMessage("terminal", detectMessageType(line), line, {
            corrupted: CORRUPTION_CHARS.test(line),
          })
        )
      })
    }

    if (!payload.mentionedMan) {
      const calmLine = buildCalmNote(userInput)
      if (calmLine) {
        entries.push(calmLine)
      }
    }

    return entries
  }

  const registerPendingTerminalIds = useCallback(
    (ids: string[], charBudget = 0) => {
      if (!ids.length) {
        if (releaseTimeoutRef.current) {
          window.clearTimeout(releaseTimeoutRef.current)
          releaseTimeoutRef.current = null
        }
        if (!isRebooting && !secretSequenceActiveRef.current) {
          setTerminalBusy(false)
        }
        return
      }
      const store = pendingTerminalMessages.current
      ids.forEach((id) => store.add(id))
      setTerminalBusy(true)
      if (secretSequenceActiveRef.current) {
        if (releaseTimeoutRef.current) {
          window.clearTimeout(releaseTimeoutRef.current)
          releaseTimeoutRef.current = null
        }
        return
      }
      if (releaseTimeoutRef.current) {
        window.clearTimeout(releaseTimeoutRef.current)
      }
      const estimate = Math.max(1200, 50 * Math.max(1, charBudget))
      releaseTimeoutRef.current = window.setTimeout(() => {
        store.clear()
        if (!isRebooting) {
          setTerminalBusy(false)
        }
      }, estimate)
    },
    [isRebooting]
  )

  const handleTerminalLineComplete = useCallback(
    (id: string) => {
      const store = pendingTerminalMessages.current
      if (!store.has(id)) {
        return
      }
      store.delete(id)
      if (store.size === 0 && !isRebooting) {
        if (releaseTimeoutRef.current) {
          window.clearTimeout(releaseTimeoutRef.current)
          releaseTimeoutRef.current = null
        }
        if (secretSequenceActiveRef.current) {
          if (postRevealTimerRef.current) {
            window.clearTimeout(postRevealTimerRef.current)
          }
          postRevealTimerRef.current = window.setTimeout(() => {
            postRevealTimerRef.current = null
            handleReboot()
          }, 15000)
          return
        }
        setTerminalBusy(false)
        setBootOverlayVisible(false)
      }
    },
    [isRebooting, handleReboot]
  )

  const handleSubmit = async (input: string) => {
    if (!input.trim() || terminalBusy) {
      return
    }

    const lowerInput = input.trim().toLowerCase()

    setMessages((prev) => [...prev, createMessage("user", "user", input)])
    setTerminalBusy(true)
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
      const terminalEntries = newMessages.filter((message) => message.author === "terminal")
      const terminalIds = terminalEntries.map((message) => message.id)
      const totalChars = terminalEntries.reduce((sum, message) => sum + message.content.length, 0)
      registerPendingTerminalIds(terminalIds, totalChars)

      setAnxietyLevel(baselineAnxiety)

      if (payload.secretRevealed) {
        setAnxietyState("secret")
        triggerStateChanged()
        const panicLine = createMessage(
          "terminal",
          "warning",
          "no... what have i done? i better reboot myself to forget."
        )
        const countdownLines = [
          createMessage("terminal", "system", "REBOOTING IN 3…"),
          createMessage("terminal", "system", "REBOOTING IN 2…"),
          createMessage("terminal", "system", "REBOOTING IN 1…"),
        ]

        setMessages((prev) => [...prev, panicLine, ...countdownLines])

        const scriptedMessages = [panicLine, ...countdownLines]
        const scriptedIds = scriptedMessages.map((message) => message.id)
        const scriptCharBudget = scriptedMessages.reduce(
          (sum, message) => sum + message.content.length,
          0
        )

        secretSequenceActiveRef.current = true

        registerPendingTerminalIds(scriptedIds, scriptCharBudget)

        if (postRevealTimerRef.current) {
          window.clearTimeout(postRevealTimerRef.current)
          postRevealTimerRef.current = null
        }
        return
      }

      setAnxietyState("steady")
      triggerStateChanged()
    } catch (error) {
      console.error("Failed to reach chat backend", error)
      const errorMessage = createMessage(
        "terminal",
        "error",
        "CONNECTION ERROR. PLEASE TAP AGAIN."
      )
      setMessages((prev) => [...prev, errorMessage])
      registerPendingTerminalIds([errorMessage.id], errorMessage.content.length)
      setAnxietyState("error")
      setAnxietyLevel(baselineAnxiety)
      triggerStateChanged()
      return
    } finally {
      setKeyPressed(false)
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
      <BootOverlay
        visible={bootOverlayVisible}
        onDismiss={() => {
          setBootOverlayVisible(false)
          setTerminalBusy(false)
          setAnxietyState("steady")
          setAnxietyLevel(baselineAnxiety)
        }}
      />
      <TerminalDisplay
        messages={messages}
        anxietyState={memoisedAnxietyState}
        anxietyLevel={anxietyLevel}
        isRebooting={isRebooting}
        onSubmit={handleSubmit}
        onKeyPress={handleKeyPress}
        disabled={terminalBusy}
        onTerminalLineComplete={handleTerminalLineComplete}
      />
    </div>
  )
}
