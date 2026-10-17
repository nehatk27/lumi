import { EventEmitter } from 'node:events'
import type { AppStatus, PetPhase } from '../../shared/types'

export interface ReminderSettings {
  intervalMinutes: number
  snoozeMinutes: number
  autoDismissSeconds: number
}

const TICK_MS = 1000 // cheap clock comparison; also survives sleep/wake correctly
const SUCCESS_VISIBLE_MS = 2500

export class ReminderService extends EventEmitter {
  private phase: PetPhase = 'hidden'
  private paused = false
  private todayCount = 0
  private snoozedUntil: number | null = null
  private nextReminderAt: number
  private tickTimer: NodeJS.Timeout | null = null
  private phaseTimer: NodeJS.Timeout | null = null // success-hide or auto-dismiss

  constructor(private settings: ReminderSettings) {
    super()
    this.nextReminderAt = Date.now() + this.intervalMs
  }

  private get intervalMs(): number {
    return this.settings.intervalMinutes * 60_000
  }
  private get snoozeMs(): number {
    return this.settings.snoozeMinutes * 60_000
  }

  start(): void {
    if (this.tickTimer) return
    this.tickTimer = setInterval(() => this.tick(), TICK_MS)
  }

  stop(): void {
    if (this.tickTimer) clearInterval(this.tickTimer)
    this.tickTimer = null
    this.clearPhaseTimer()
  }

  getStatus(): AppStatus {
    return {
      phase: this.phase,
      paused: this.paused,
      todayCount: this.todayCount,
      nextReminderAt: this.paused ? null : this.nextReminderAt,
      snoozedUntil: this.snoozedUntil
    }
  }

  confirmWater(): void {
    if (this.phase !== 'reminding') return // guards double-clicks and stale calls
    this.clearPhaseTimer()
    this.todayCount += 1
    this.snoozedUntil = null
    this.nextReminderAt = Date.now() + this.intervalMs // confirming resets the interval
    this.phase = 'success'
    this.phaseTimer = setTimeout(() => this.hide(), SUCCESS_VISIBLE_MS)
    this.emitChange()
  }

  snooze(): void {
    if (this.phase !== 'reminding') return
    this.clearPhaseTimer()
    this.snoozedUntil = Date.now() + this.snoozeMs
    this.nextReminderAt = this.snoozedUntil
    this.phase = 'hidden'
    this.emitChange()
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) return
    this.paused = paused
    this.clearPhaseTimer()
    this.snoozedUntil = null
    this.phase = 'hidden'
    if (!paused) this.nextReminderAt = Date.now() + this.intervalMs
    this.emitChange()
  }

  /** Manual "Show Lumi" from the tray. Does nothing if she's already visible. */
  showNow(): void {
    if (this.phase !== 'hidden') return
    this.beginReminder()
  }

  private tick(): void {
    if (this.paused || this.phase !== 'hidden') return // no repeats while one is active
    if (Date.now() < this.nextReminderAt) return
    this.beginReminder()
  }

  private beginReminder(): void {
    this.snoozedUntil = null
    this.phase = 'reminding'
    this.phaseTimer = setTimeout(() => this.snooze(), this.settings.autoDismissSeconds * 1000)
    this.emitChange()
  }

  private hide(): void {
    this.clearPhaseTimer()
    this.phase = 'hidden'
    this.emitChange()
  }

  private clearPhaseTimer(): void {
    if (this.phaseTimer) clearTimeout(this.phaseTimer)
    this.phaseTimer = null
  }

  private emitChange(): void {
    this.emit('change', this.getStatus())
  }
}
