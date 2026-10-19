import { useEffect, useRef } from 'react'
import type { JSX } from 'react'
import type { PetPhase } from '../../../shared/types'
import { LUMI_W, STRIP_MIN_W } from '../../../shared/layout'
import Mascot3D from './Mascot3D'

const SPEED = 195 // px per second

const notifyWalkDone = (): void => {
  void window.lumi.walkFinished()
}

/** Lumi stands in the horizontal middle of the window (card and strip are both centred on screen). */
function restX(): number {
  return (window.innerWidth - LUMI_W) / 2
}

export default function LumiActor({ phase }: { phase: PetPhase }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const entering = phase === 'entering'
  const leaving = phase === 'leaving'
  const heading = entering ? Math.PI / 2 : leaving ? -Math.PI / 2 : 0

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const place = (x: number): void => {
      el.style.transform = `translateX(${Math.round(x)}px)`
    }

    // Standing (greeting, reminding, success): sit in the middle and stay there through resizes
    if (!entering && !leaving) {
      const settle = (): void => place(restX())
      settle()
      el.style.visibility = 'visible'
      window.addEventListener('resize', settle)
      return () => window.removeEventListener('resize', settle)
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      place(restX())
      el.style.visibility = 'visible'
      notifyWalkDone()
      return
    }

    // Walking: wait until main has resized the window into strip mode
    el.style.visibility = 'hidden'
    let x = 0
    let started = false
    let last = performance.now()
    let raf = 0

    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (window.innerWidth < STRIP_MIN_W) return

      if (!started) {
        started = true
        x = entering ? -LUMI_W : restX() // enter from the left edge
        place(x)
        el.style.visibility = 'visible'
        return
      }

      x += (entering ? 1 : -1) * SPEED * dt
      const end = entering ? restX() : -LUMI_W - 20 // leave toward the left edge
      const done = entering ? x >= end : x <= end
      place(done ? end : x)
      if (done) {
        cancelAnimationFrame(raf)
        notifyWalkDone()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [entering, leaving])

  return (
    <div ref={ref} className="lumi-actor">
      <Mascot3D
        happy={phase === 'success'}
        walking={entering || leaving}
        waving={phase === 'greeting'}
        heading={heading}
      />
    </div>
  )
}
