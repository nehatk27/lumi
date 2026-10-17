import type { JSX } from 'react'

const GOAL = 8

export default function WaterProgress({ count }: { count: number }): JSX.Element {
  return (
    <div className="progress" aria-label={`${count} confirmed today`}>
      <div className="progress__dots" aria-hidden="true">
        {Array.from({ length: GOAL }, (_, i) => (
          <span key={i} className={i < count ? 'dot dot--on' : 'dot'} />
        ))}
      </div>
      <span className="progress__label">{count} confirmed today</span>
    </div>
  )
}
