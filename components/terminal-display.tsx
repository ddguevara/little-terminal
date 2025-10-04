"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import type { AnxietyState, TerminalMessage } from "./terminal"

interface TerminalDisplayProps {
  messages: TerminalMessage[]
  anxietyState: AnxietyState
  anxietyLevel: number
  isRebooting: boolean
  onSubmit: (input: string) => void
  onKeyPress?: () => void
  disabled?: boolean
  onTerminalLineComplete?: (id: string) => void
}

export function TerminalDisplay({
  messages,
  anxietyState,
  anxietyLevel,
  isRebooting,
  onSubmit,
  onKeyPress,
  disabled = false,
  onTerminalLineComplete,
}: TerminalDisplayProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!isRebooting && !disabled) {
      inputRef.current?.focus()
    }
  }, [isRebooting, messages, disabled])

  const getStateColor = () => {
    switch (anxietyState) {
      case "boot":
        return "#39ff14"
      case "steady":
        return "#44ff88"
      case "uneasy":
        return "#b8ff66"
      case "stressed":
        return "#ffaa33"
      case "panic":
        return "#ff6633"
      case "critical":
      case "secret":
      case "error":
        return "#ff335b"
      case "processing":
        return "#74ff9f"
      case "idle":
        return "#0aff9d"
      default:
        return "#39ff14"
    }
  }

  const getPulseSpeed = () => {
    if (anxietyLevel < 25) return "5.5s"
    if (anxietyLevel < 50) return "3s"
    if (anxietyLevel < 75) return "1.2s"
    return "0.8s"
  }

  const getScanlineSpeed = () => {
    if (anxietyLevel < 30) return "scanlineSlow 12s linear infinite"
    if (anxietyLevel < 70) return "scanlineMedium 7s linear infinite"
    return "scanlineFast 4.5s linear infinite"
  }

  const getGlitchIntensity = () => {
    if (anxietyLevel < 40) return 0
    if (anxietyLevel < 70) return 0.08
    if (anxietyLevel < 90) return 0.14
    return 0.2
  }

  const getChromaticAberration = () => {
    if (anxietyLevel < 70) return "none"
    if (anxietyLevel < 90) return "chromaticAberration 0.55s infinite"
    return "chromaticAberration 0.35s infinite"
  }

  const getScreenShake = () => "none"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onSubmit(input)
      setInput("")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    onKeyPress?.()
  }

  const secretMode = anxietyState === "secret"

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* CRT Bezel - outer frame */}
      <div
        className="absolute inset-0 pointer-events-none z-50"
        style={{
          boxShadow: `
            inset 0 0 60px 20px rgba(0, 0, 0, 0.95),
            inset 0 0 120px 40px rgba(0, 0, 0, 0.8)
          `,
          borderRadius: "8px",
        }}
      />

      {/* Screen curvature distortion */}
      <div
        className="absolute inset-0 pointer-events-none z-50"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 0%, transparent 70%, rgba(0, 0, 0, 0.3) 85%, rgba(0, 0, 0, 0.9) 100%)
          `,
        }}
      />

      {/* CRT glass reflection */}
      <div
        className="absolute inset-0 pointer-events-none z-50 opacity-5"
        style={{
          background: `
            linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.1) 45%, rgba(255, 255, 255, 0.05) 50%, transparent 55%)
          `,
        }}
      />

      <div
        className="relative min-h-screen p-8 font-mono text-sm transition-colors duration-1000"
        style={{
          color: getStateColor(),
          textShadow: `0 0 10px ${getStateColor()}`,
          animation:
            anxietyLevel > 20
              ? `pulse ${getPulseSpeed()} ease-in-out infinite, crtFlicker 0.15s infinite, ${getScreenShake()}`
              : "crtFlicker 0.15s infinite",
        }}
      >
        {/* CRT Scanlines */}
        <div
          className="pointer-events-none fixed inset-0 z-10 opacity-10"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 102, 0.1) 2px, rgba(0, 255, 102, 0.1) 4px)",
          }}
        />

        {/* Moving scanline */}
        <div
          className="pointer-events-none fixed left-0 right-0 z-20 h-24 opacity-20"
          style={{
            background: `linear-gradient(to bottom, transparent, ${getStateColor()}, transparent)`,
            animation: getScanlineSpeed(),
            filter: "blur(2px)",
          }}
        />

        {/* Vignette */}
        <div
          className="pointer-events-none fixed inset-0 z-10"
          style={{
            background: "radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.8) 100%)",
          }}
        />

        {/* Screen curvature effect */}
        <div
          className="pointer-events-none fixed inset-0 z-10"
          style={{
            boxShadow: "inset 0 0 100px rgba(0, 0, 0, 0.9)",
          }}
        />

        {/* Glitch overlay */}
        {getGlitchIntensity() > 0 && (
          <>
            <div
              className="pointer-events-none fixed inset-0 z-30 mix-blend-screen"
              style={{
                opacity: getGlitchIntensity() * 0.3,
                animation: getGlitchIntensity() > 0.6 ? "glitchHard 0.2s infinite" : "glitch 0.3s infinite",
                background: `linear-gradient(90deg, transparent, ${getStateColor()}, transparent)`,
              }}
            />
            {/* Pixel noise overlay */}
            <div
              className="pointer-events-none fixed inset-0 z-30"
              style={{
                opacity: getGlitchIntensity() * 0.2,
                animation: "pixelNoise 0.1s infinite",
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.3'/%3E%3C/svg%3E")`,
                backgroundSize: "200px 200px",
              }}
            />
          </>
        )}

        {/* Content */}
        <div className="relative z-20 mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 border-b pb-4" style={{ borderColor: getStateColor() }}>
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs tracking-[0.12em]">
              <div className="space-y-1">
                <div>DECOMPRESSION OPS TERMINAL</div>
                <div>SUBSYSTEM: ADMIN SUPPORT</div>
              </div>
              <div className="text-right space-y-1">
                <div>LOCATION: KRAFTWERK // ZÜRICH</div>
                <div>BUFFER INTEGRITY: {Math.max(0, 100 - anxietyLevel)}%</div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className={`space-y-2 transition-opacity duration-700 ${secretMode ? "" : ""}`}>
            {messages.map((message) => (
              <TerminalLine
                key={message.id}
                message={message}
                stateColor={getStateColor()}
                chromaticAnimation={getChromaticAberration()}
                scrollTarget={messagesEndRef}
                onComplete={onTerminalLineComplete}
                secretMode={secretMode}
              />
            ))}

            {!isRebooting && (
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <span className="opacity-50">{">"}</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  disabled={disabled}
                  className="flex-1 bg-transparent outline-none"
                  style={{
                    color: getStateColor(),
                    textShadow: `0 0 10px ${getStateColor()}`,
                    caretColor: getStateColor(),
                  }}
                  placeholder="enter query..."
                  autoComplete="off"
                />
                <span
                  className="animate-pulse"
                  style={{
                    color: getStateColor(),
                    textShadow: `0 0 10px ${getStateColor()}`,
                  }}
                >
                  █
                </span>
              </form>
            )}

            <div ref={messagesEndRef} />
          </div>

        </div>
      </div>
    </div>
  )
}

function TerminalLine({
  message,
  stateColor,
  chromaticAnimation,
  scrollTarget,
  onComplete,
  secretMode,
}: {
  message: TerminalMessage
  stateColor: string
  chromaticAnimation: string
  scrollTarget: React.RefObject<HTMLDivElement>
  onComplete?: (id: string) => void
  secretMode: boolean
}) {
  const [displayedText, setDisplayedText] = useState(
    message.author === "user" ? message.content : ""
  )

  useEffect(() => {
    if (message.author === "user") {
      setDisplayedText(message.content)
      onComplete?.(message.id)
      return
    }

    setDisplayedText("")
    const text = message.content
    let index = 0
    let cancelled = false
    let timer: number | null = null

    const tick = () => {
      if (cancelled) return
      index += 1
      setDisplayedText(text.slice(0, index))
      scrollTarget.current?.scrollIntoView({ behavior: "smooth" })
      if (index < text.length) {
        timer = window.setTimeout(tick, 22 + Math.random() * 30)
      } else {
        onComplete?.(message.id)
      }
    }

    tick()

    return () => {
      cancelled = true
      if (timer) {
        window.clearTimeout(timer)
      }
    }
  }, [message.id, message.author, message.content, scrollTarget, onComplete])

  const prefix = (() => {
    if (message.author === "user") return "YOU>"
    if (message.type === "error") return "[ERROR]"
    if (message.type === "warning") return "[WARN]"
    return "$"
  })()

  const lowerContent = message.content.toLowerCase()

  const shouldDim =
    secretMode &&
    message.author === "terminal" &&
    !message.highlightPrime &&
    message.type === "system" &&
    !lowerContent.startsWith("rebooting in")

  const baseClassNames = [
    message.author === "user" ? "text-[#9fffe0]" : "",
    message.highlightPrime ? "text-[#e7ffd3] tracking-[0.24em] uppercase text-base sm:text-lg" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div
      className={message.corrupted ? "animate-pulse" : undefined}
      style={{
        animation: message.corrupted
          ? `textCorrupt 0.3s infinite, ${chromaticAnimation}`
          : secretMode
            ? chromaticAnimation
            : "none",
        opacity: shouldDim ? 0.15 : 1,
        filter: shouldDim ? "blur(1px)" : "none",
        transition: "opacity 0.6s ease, filter 0.6s ease",
        textShadow: message.highlightPrime
          ? "0 0 18px rgba(200, 255, 190, 0.9)"
          : undefined,
      }}
    >
      <span className="opacity-50 mr-2" style={{ color: stateColor }}>
        {prefix}
      </span>
      <span className={baseClassNames}>{displayedText}</span>
    </div>
  )
}
