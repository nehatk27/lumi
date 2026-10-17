import type { JSX } from 'react'
import Mascot from '../components/Mascot'
import SpeechBubble from '../components/SpeechBubble'
import ReminderActions from '../components/ReminderActions'
import WaterProgress from '../components/WaterProgress'
import { usePetState } from '../hooks/usePetState'
import '../styles/pet.css'

export default function PetWindow(): JSX.Element | null {
  const { status, message, confirm, snooze } = usePetState()

  if (!status || status.phase === 'hidden') return null // stays fully transparent

  const reminding = status.phase === 'reminding'
  return (
    <div className="pet">
      <SpeechBubble text={message}>
        {reminding ? (
          <ReminderActions onConfirm={confirm} onSnooze={snooze} />
        ) : (
          <WaterProgress count={status.todayCount} />
        )}
      </SpeechBubble>
      <Mascot happy={!reminding} />
    </div>
  )
}
