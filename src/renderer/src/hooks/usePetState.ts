import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppStatus, PetPhase } from '../../../shared/types'
import { pickMessage } from '../content/messages'

interface PetState {
  status: AppStatus | null
  message: string
  confirm: () => Promise<void>
  snooze: () => Promise<void>
}

export function usePetState(): PetState {
  const [status, setStatus] = useState<AppStatus | null>(null)
  const [message, setMessage] = useState('')
  const prevPhase = useRef<PetPhase>('hidden')
  const lastMessage = useRef<Partial<Record<PetPhase, string>>>({})

  const apply = useCallback((next: AppStatus): void => {
    if (
      next.phase !== prevPhase.current &&
      (next.phase === 'reminding' || next.phase === 'success')
    ) {
      const msg = pickMessage(next.phase, lastMessage.current[next.phase])
      lastMessage.current[next.phase] = msg
      setMessage(msg)
    }
    prevPhase.current = next.phase
    setStatus(next)
  }, [])

  useEffect(() => {
    window.lumi.getStatus().then(apply)
    return window.lumi.onStatusChange(apply)
  }, [apply])

  return {
    status,
    message,
    confirm: () => window.lumi.confirmWater(),
    snooze: () => window.lumi.snooze()
  }
}
