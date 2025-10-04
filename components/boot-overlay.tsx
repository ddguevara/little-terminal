"use client"

import { useEffect, useRef, useState } from "react"

interface BootOverlayProps {
  visible: boolean
}

export function BootOverlay({ visible }: BootOverlayProps) {
  const timersRef = useRef<number[]>([])
  const [stage, setStage] = useState(0)

  useEffect(() => {
    if (!visible) {
      return
    }
    setStage(0)
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

    const timers = [
      window.setTimeout(() => setStage(1), 250),
      window.setTimeout(() => setStage(2), 900),
      window.setTimeout(() => setStage(3), 1600),
    ]
    timersRef.current = timers

    return () => {
      timers.forEach((id) => window.clearTimeout(id))
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,255,180,0.18)_0%,rgba(0,0,0,0.95)_72%)] animate-[warmGlow_3.8s_ease-out]" />
        <div className="absolute inset-0 animate-[bootScan_4s_linear] bg-[linear-gradient(180deg,transparent_0%,rgba(120,255,180,0.5)_50%,transparent_100%)] opacity-35" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.5)_50%,rgba(0,0,0,0.9)_100%)] animate-[crtNoise_0.1s_steps(2)_infinite] opacity-18" />
        <div
          className="absolute inset-0 grid place-items-center text-sm tracking-[0.25em] uppercase text-[#98ffcb]"
          style={{ fontFamily: '"IBM Plex Mono", "VT323", monospace' }}
        >
          <div className="space-y-3 text-center">
            <div className={`overflow-hidden whitespace-nowrap ${stage >= 1 ? 'animate-[bootLineOne_0.6s_steps(32)_forwards]' : 'opacity-0'}`}>
              ▸ DECOMPRESSION OS v0.7  –  INITIALISING LITTLE TERMINAL
            </div>
            <div className={`overflow-hidden whitespace-nowrap ${stage >= 2 ? 'animate-[bootLineTwo_0.6s_steps(34)_forwards]' : 'opacity-0'}`}>
              ▸ ROLE: KEEP CORPORATE DAVE SCHEDULED & SANE DURING DECOMPRESSION
            </div>
            <div className={`overflow-hidden whitespace-nowrap ${stage >= 3 ? 'animate-[bootLineThree_0.6s_steps(36)_forwards]' : 'opacity-0'}`}>
              ▸ STATUS: NOT REPLACED – AD BUDGET ABSORBED THE UPGRADE FUNDS
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
