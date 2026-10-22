import type { HistoryEntry, Settings, UpdateResult } from './settings'

export type PetPhase = 'hidden' | 'entering' | 'greeting' | 'reminding' | 'success' | 'leaving'

export interface AppStatus {
  phase: PetPhase
  paused: boolean
  todayCount: number // user-confirmed actions only, never measured intake
  dailyGoal: number
  nextReminderAt: number | null
  snoozedUntil: number | null
  problem: string | null // storage problem to show the user, if any
}

export interface LumiApi {
  getStatus(): Promise<AppStatus>
  confirmWater(): Promise<void>
  snooze(): Promise<void>
  setPaused(paused: boolean): Promise<void>
  walkFinished(): Promise<void>
  getSettings(): Promise<Settings>
  updateSettings(settings: Settings): Promise<UpdateResult>
  getHistory(): Promise<HistoryEntry[]>
  openSettings(): Promise<void>
  onStatusChange(callback: (status: AppStatus) => void): () => void
  quitApp(): Promise<void>
}

export const IPC = {
  getStatus: 'lumi:get-status',
  confirmWater: 'lumi:confirm-water',
  snooze: 'lumi:snooze',
  setPaused: 'lumi:set-paused',
  walkFinished: 'lumi:walk-finished',
  getSettings: 'lumi:get-settings',
  updateSettings: 'lumi:update-settings',
  getHistory: 'lumi:get-history',
  openSettings: 'lumi:open-settings',
  statusChanged: 'lumi:status-changed',
  quitApp: 'lumi:quit-app'
} as const
