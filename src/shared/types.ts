export type PetPhase = 'hidden' | 'entering' | 'reminding' | 'success' | 'leaving'

export interface AppStatus {
  phase: PetPhase
  paused: boolean
  todayCount: number // user-confirmed actions only, never measured intake
  nextReminderAt: number | null
  snoozedUntil: number | null
}

export interface LumiApi {
  getStatus(): Promise<AppStatus>
  confirmWater(): Promise<void>
  snooze(): Promise<void>
  setPaused(paused: boolean): Promise<void>
  onStatusChange(callback: (status: AppStatus) => void): () => void
  walkFinished(): Promise<void>
}

export const IPC = {
  getStatus: 'lumi:get-status',
  confirmWater: 'lumi:confirm-water',
  snooze: 'lumi:snooze',
  setPaused: 'lumi:set-paused',
  statusChanged: 'lumi:status-changed',
  walkFinished: 'lumi:walk-finished'
} as const
