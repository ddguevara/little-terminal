"use client"

import { useEffect, useRef } from "react"
import type { AnxietyState } from "./terminal"

interface AudioManagerProps {
  anxietyState: AnxietyState
  anxietyLevel: number
  onKeyPress?: boolean
  onStateChange?: boolean
}

export function AudioManager({ anxietyState, anxietyLevel, onKeyPress, onStateChange }: AudioManagerProps) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const ambientOscillatorRef = useRef<OscillatorNode | null>(null)
  const ambientGainRef = useRef<GainNode | null>(null)

  // Initialize Web Audio API
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  // Ambient hum based on anxiety state
  useEffect(() => {
    if (!audioContextRef.current) return

    const ctx = audioContextRef.current

    // Stop previous oscillator
    if (ambientOscillatorRef.current) {
      ambientOscillatorRef.current.stop()
    }

    // Create new ambient sound
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Set frequency based on anxiety
    const baseFrequency = 60 + anxietyLevel * 2 // 60Hz to 260Hz
    oscillator.frequency.setValueAtTime(baseFrequency, ctx.currentTime)

    // Add slight frequency modulation for unease
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.setValueAtTime(0.5 + anxietyLevel / 50, ctx.currentTime)
    lfoGain.gain.setValueAtTime(5 + anxietyLevel / 10, ctx.currentTime)
    lfo.connect(lfoGain)
    lfoGain.connect(oscillator.frequency)
    lfo.start()

    // Set volume based on anxiety
    const volume = 0.02 + (anxietyLevel / 100) * 0.08 // Very subtle
    gainNode.gain.setValueAtTime(volume, ctx.currentTime)

    oscillator.type = "sine"
    oscillator.start()

    ambientOscillatorRef.current = oscillator
    ambientGainRef.current = gainNode

    return () => {
      oscillator.stop()
      lfo.stop()
    }
  }, [anxietyLevel])

  // Typing sound effect
  useEffect(() => {
    if (!onKeyPress || !audioContextRef.current) return

    const ctx = audioContextRef.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.setValueAtTime(800, ctx.currentTime)
    oscillator.type = "square"

    gainNode.gain.setValueAtTime(0.05, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.05)
  }, [onKeyPress])

  // State change sound (glitch/error sounds)
  useEffect(() => {
    if (!onStateChange || !audioContextRef.current) return

    const ctx = audioContextRef.current

    if (anxietyState === "uneasy" || anxietyState === "stressed") {
      // Warning beep
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.setValueAtTime(440, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1)
      oscillator.type = "sawtooth"

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.2)
    } else if (anxietyState === "panic" || anxietyState === "critical" || anxietyState === "secret") {
      // Alarm sound
      for (let i = 0; i < 3; i++) {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)

        const startTime = ctx.currentTime + i * 0.2
        oscillator.frequency.setValueAtTime(880, startTime)
        oscillator.frequency.setValueAtTime(440, startTime + 0.1)
        oscillator.type = "square"

        gainNode.gain.setValueAtTime(0.15, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2)

        oscillator.start(startTime)
        oscillator.stop(startTime + 0.2)
      }
    } else if (anxietyState === "error" || anxietyState === "idle") {
      // Shutdown sound
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.setValueAtTime(880, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 1)
      oscillator.type = "sine"

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 1)
    }
  }, [onStateChange, anxietyState])

  // Heartbeat pulse sound
  useEffect(() => {
    if (anxietyLevel < 25 || !audioContextRef.current) return

    const ctx = audioContextRef.current
    const interval = anxietyLevel < 50 ? 1000 : anxietyLevel < 75 ? 600 : 300

    const heartbeat = setInterval(() => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.setValueAtTime(80, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1)
      oscillator.type = "sine"

      const volume = 0.05 + (anxietyLevel / 100) * 0.1
      gainNode.gain.setValueAtTime(volume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.15)
    }, interval)

    return () => clearInterval(heartbeat)
  }, [anxietyLevel])

  return null
}
