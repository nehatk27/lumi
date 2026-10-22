import type { JSX } from 'react'

interface Props {
  count: number
  goal: number
}

export default function WaterProgress({ count, goal }: Props): JSX.Element {
  return (
    <div className="progress" aria-label={`${count} of ${goal} confirmed today`}>
      <div className="progress__dots" aria-hidden="true">
        {Array.from({ length: goal }, (_, i) => (
          <span key={i} className={i < count ? 'dot dot--on' : 'dot'} />
        ))}
      </div>
      <span className="progress__label">
        {count} of {goal} confirmed today
      </span>
    </div>
  )
}
