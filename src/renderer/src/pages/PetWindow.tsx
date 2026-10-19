import type { JSX } from 'react'
import SpeechBubble from '../components/SpeechBubble'
import ReminderActions from '../components/ReminderActions'
import WaterProgress from '../components/WaterProgress'
import LumiActor from '../components/LumiActor'
import { usePetState } from '../hooks/usePetState'
import '../styles/pet.css'

export default function PetWindow(): JSX.Element | null {
  const { status, message, confirm, snooze } = usePetState()

  if (!status || status.phase === 'hidden') return null

  const reminding = status.phase === 'reminding'
  const showBubble = reminding || status.phase === 'success'

  return (
    <div className="pet">
      {showBubble && (
        <div className="bubble-slot">
          <SpeechBubble text={message}>
            {reminding ? (
              <ReminderActions onConfirm={confirm} onSnooze={snooze} />
            ) : (
              <WaterProgress count={status.todayCount} />
            )}
          </SpeechBubble>
        </div>
      )}
      <LumiActor phase={status.phase} />
    </div>
  )
}
