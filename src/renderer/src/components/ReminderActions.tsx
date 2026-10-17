import type { JSX } from 'react'

interface Props {
  onConfirm: () => void
  onSnooze: () => void
}

export default function ReminderActions({ onConfirm, onSnooze }: Props): JSX.Element {
  return (
    <div className="actions">
      <button className="btn btn--primary" onClick={onConfirm}>
        I drank water
      </button>
      <button className="btn btn--ghost" onClick={onSnooze}>
        Remind me later
      </button>
    </div>
  )
}
