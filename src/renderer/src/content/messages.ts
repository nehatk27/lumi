export type MessageKind = 'reminding' | 'success'

const MESSAGES: Record<MessageKind, string[]> = {
  reminding: [
    'Time for a little refill? Your future self says thanks.',
    'A sip of water keeps the sparkle going.',
    "Quick water break? I'll be right here.",
    'Hydration check! A small sip goes a long way.',
    "Let's keep that brightness up. Water time?"
  ],
  success: [
    "Lovely! That's one more for today.",
    "Nice one. You're glowing.",
    'Bright choice! Keep it up.',
    'Thank you for taking care of yourself.'
  ]
}

export function pickMessage(kind: MessageKind, previous?: string): string {
  const pool = MESSAGES[kind].filter((m) => m !== previous) // never the same line twice in a row
  return pool[Math.floor(Math.random() * pool.length)]
}
