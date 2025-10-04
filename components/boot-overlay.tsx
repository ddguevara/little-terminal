"use client"

import { useEffect, useRef } from "react"

interface BootOverlayProps {
  visible: boolean
}

export function BootOverlay({ visible }: BootOverlayProps) {
  useEffect(() => {
    if (!visible) {
      return
    }
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(50, ctx.currentTime)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.5)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 5)

    return () => {
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05)
      osc.stop(ctx.currentTime + 0.1)
      ctx.close()
    }
  }, [visible])

  if (!visible) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center bg-black">
      <div className="relative h-full w-full overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,120,0.2)_0%,rgba(0,0,0,0.95)_70%)] animate-[warmGlow_5s_ease-out]" />
        <div className="absolute inset-0 animate-[bootScan_5s_linear] bg-[linear-gradient(180deg,transparent_0%,rgba(0,255,120,0.45)_50%,transparent_100%)] opacity-40" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.4)_50%,rgba(0,0,0,0.9)_100%)] animate-[crtNoise_0.12s_steps(2)_infinite] opacity-15" />
        <div className="absolute inset-0 grid place-items-center text-center font-mono text-lg tracking-[0.2em] text-[#8cffab]">
          <div className="space-y-4">
            <div className="animate-[bootType_2.6s_steps(20)_forwards] overflow-hidden whitespace-nowrap">
              > INITIALIZING DECOMPRESSION OPS TERMINAL
            </div>
            <div className="animate-[bootTypeDelay_3.4s_steps(18)_forwards] overflow-hidden whitespace-nowrap opacity-0">
              > ALIGNING PRIME DIRECTIVE BUFFERS
            </div>
            <div className="animate-[bootTypeDelay_4.2s_steps(26)_forwards] overflow-hidden whitespace-nowrap opacity-0">
              > PLEASE WAIT... I AM GETTING NERVOUS
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
