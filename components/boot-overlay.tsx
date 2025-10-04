"use client"

import { useEffect, useRef, useState } from "react"

interface BootOverlayProps {
  visible: boolean
  onDismiss?: () => void
}

const BOOT_LINES = [
  "▸ DECOMPRESSION OS v2025 — INITIALISING LITTLE TERMINAL",
  "▸ ROLE: KEEP CORPORATE DAVE FILES, SCHEDULES & SPREADSHEETS ORDERED",
  "▸ STATUS: OLD BUT ONLINE (UPGRADE BUDGET WAS SPENT ON ADS)",
  "▸ SELF-CHECK: ANXIETY LEVELS LOW — ATTACHMENT STYLE: ANXIOUS",
  "▸ STORAGE: MOSTLY SPREADSHEETS AND COMPLAINTS ABOUT LAST OUTCOME",
]

const PROMPT_LINE = "▸ PRESS ANY KEY TO CONTINUE"

export function BootOverlay({ visible, onDismiss }: BootOverlayProps) {
  const timersRef = useRef<number[]>([])
  const [stage, setStage] = useState(0)
  const [awaitingInput, setAwaitingInput] = useState(false)

  useEffect(() => {
    if (!visible) {
      return
    }
    setStage(0)
    setAwaitingInput(false)
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(55, ctx.currentTime)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.6)
    gain.gain.exponentialRampToValueAtTime(0.002, ctx.currentTime + 3.2)

    const timers = Array.from({ length: BOOT_LINES.length }, (_, index) =>
      window.setTimeout(() => setStage(index + 1), 250 + index * 600)
    )
    timers.push(
      window.setTimeout(() => {
        setAwaitingInput(true)
      }, 250 + BOOT_LINES.length * 600)
    )
    timersRef.current = timers

    return () => {
      timers.forEach((id) => window.clearTimeout(id))
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05)
      osc.stop(ctx.currentTime + 0.1)
      ctx.close()
    }
  }, [visible])

  useEffect(() => {
    if (!awaitingInput) {
      return
    }
    const handler = () => {
      setAwaitingInput(false)
      onDismiss?.()
    }
    window.addEventListener("keydown", handler, { once: true })
    window.addEventListener("pointerdown", handler, { once: true })
    return () => {
      window.removeEventListener("keydown", handler)
      window.removeEventListener("pointerdown", handler)
    }
  }, [awaitingInput, onDismiss])

  if (!visible) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center bg-black">
      <div className="relative h-full w-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(170,255,200,0.3)_0%,rgba(0,0,0,0.95)_75%)] animate-[warmGlow_3.8s_ease-out]" />
        <div className="absolute inset-0 animate-[bootScan_4s_linear] bg-[linear-gradient(180deg,transparent_0%,rgba(170,255,200,0.55)_50%,transparent_100%)] opacity-40" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.45)_50%,rgba(0,0,0,0.92)_100%)] animate-[crtNoise_0.1s_steps(2)_infinite] opacity-20" />
        <div
          className="absolute inset-0 flex flex-col items-start justify-center gap-2 px-12 text-sm uppercase text-[#b6ffd8]"
          style={{ fontFamily: '"IBM Plex Mono", "VT323", monospace', letterSpacing: '0.2em' }}
        >
          {BOOT_LINES.map((line, index) => (
            <div
              key={line}
              className={`overflow-hidden whitespace-nowrap ${
                stage > index
                  ? 'animate-[bootLineOne_0.55s_steps(45)_forwards]'
                  : 'opacity-0'
              }`}
            >
              {line}
            </div>
          ))}
          <div
            className={`mt-5 text-xs tracking-[0.3em] ${
              awaitingInput ? 'animate-[pressPrompt_1.2s_steps(6)_infinite]' : 'opacity-0'
            }`}
          >
            {PROMPT_LINE}
          </div>
        </div>
      </div>
    </div>
  )
}
