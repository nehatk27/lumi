export type PetPhase = 'hidden' | 'reminding' | 'success'

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
}

export const IPC = {
  getStatus: 'lumi:get-status',
  confirmWater: 'lumi:confirm-water',
  snooze: 'lumi:snooze',
  setPaused: 'lumi:set-paused',
  statusChanged: 'lumi:status-changed'
} as const
