import type { JSX, ReactNode } from 'react'

interface Props {
  text: string
  children?: ReactNode
}

export default function SpeechBubble({ text, children }: Props): JSX.Element {
  return (
    <div className="bubble" role="status" aria-live="polite">
      <p className="bubble__text">{text}</p>
      {children}
    </div>
  )
}
