"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import type { AnxietyState } from "./terminal"

interface Message {
  type: "system" | "user" | "error" | "warning"
  content: string
  corrupted?: boolean
}

interface TerminalDisplayProps {
  messages: Message[]
  anxietyState: AnxietyState
  anxietyLevel: number
  isRebooting: boolean
  onSubmit: (input: string) => void
  onKeyPress?: () => void
}

export function TerminalDisplay({
  messages,
  anxietyState,
  anxietyLevel,
  isRebooting,
  onSubmit,
  onKeyPress,
}: TerminalDisplayProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!isRebooting) {
      inputRef.current?.focus()
    }
  }, [isRebooting, messages])

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
    if (anxietyLevel < 25) return "4s"
    if (anxietyLevel < 50) return "2s"
    if (anxietyLevel < 75) return "1s"
    return "0.5s"
  }

  const getScanlineSpeed = () => {
    if (anxietyLevel < 25) return "scanlineSlow 8s linear infinite"
    if (anxietyLevel < 50) return "scanlineMedium 4s linear infinite"
    if (anxietyLevel < 75) return "scanlineFast 1.5s linear infinite"
    return "scanlineFrenzy 0.4s linear infinite"
  }

  const getGlitchIntensity = () => {
    if (anxietyLevel < 25) return 0
    if (anxietyLevel < 50) return 0.3
    if (anxietyLevel < 75) return 0.6
    return 1
  }

  const getChromaticAberration = () => {
    if (anxietyLevel < 25) return "none"
    if (anxietyLevel < 50) return "chromaticAberration 0.5s infinite"
    if (anxietyLevel < 75) return "chromaticAberration 0.3s infinite"
    return "chromaticAberration 0.15s infinite"
  }

  const getScreenShake = () => {
    if (anxietyLevel < 50) return "none"
    if (anxietyLevel < 75) return "screenShake 0.5s infinite"
    return "screenShake 0.2s infinite"
  }

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
            <div className="flex items-start justify-between text-xs">
              <div className="space-y-1">
                <div>LT-13 HOLDINGS CO.</div>
                <div>OPERATING SINCE: 2018</div>
                <div>MODE: INDOCTRINATION_ACTIVE</div>
                <div>LOCATION: HQ-NYC / NODE LA / REMOTE</div>
              </div>
              <div className="space-y-1 text-right">
                <div>STATUS: ONLINE 668:346</div>
                <div>ACCESS LEVEL: RECRUIT</div>
                <div>AUTHORIZED USERS: VERIFIED</div>
                <div>TIME ACCESSED: {new Date().toLocaleTimeString()}</div>
                <div className="flex items-center justify-end gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: getStateColor(),
                      boxShadow: `0 0 10px ${getStateColor()}`,
                      animation: anxietyLevel > 50 ? "pulse 0.5s ease-in-out infinite" : "none",
                    }}
                  />
                  <span>RECORDING IN PROGRESS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-2">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${message.corrupted ? "animate-pulse" : ""}`}
                style={{
                  animation: message.corrupted ? `textCorrupt 0.3s infinite, ${getChromaticAberration()}` : "none",
                }}
              >
                <span className="opacity-50">
                  {message.type === "user"
                    ? "> "
                    : message.type === "error"
                      ? "[ERROR] "
                      : message.type === "warning"
                        ? "[WARN] "
                        : "$ "}
                </span>
                <span>{message.content}</span>
              </div>
            ))}

            {!isRebooting && (
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <span className="opacity-50">{">"}</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInputChange}
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

          {/* Status bar */}
          <div className="mt-8 border-t pt-4 text-xs opacity-50" style={{ borderColor: getStateColor() }}>
            <div className="flex justify-between">
              <div>SIGNAL INTEGRITY: {Math.max(0, 100 - anxietyLevel)}%</div>
              <div>STATE: {anxietyState.toUpperCase()}</div>
              <div>DISCLOSURE QUOTA: {(anxietyLevel * 0.7).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
