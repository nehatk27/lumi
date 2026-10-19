import { EventEmitter } from 'node:events'
import type { AppStatus, PetPhase } from '../../shared/types'

export interface ReminderSettings {
  intervalMinutes: number
  snoozeMinutes: number
  autoDismissSeconds: number
}

const TICK_MS = 1000 // cheap clock comparison; also survives sleep/wake correctly
const SUCCESS_VISIBLE_MS = 2500
const WALK_FAILSAFE_MS = 30_000 // if the renderer never reports the walk finished
const GREETING_MS = 2400 // how long Lumi waves before asking

export class ReminderService extends EventEmitter {
  private phase: PetPhase = 'hidden'
  private paused = false
  private todayCount = 0
  private snoozedUntil: number | null = null
  private nextReminderAt: number
  private tickTimer: NodeJS.Timeout | null = null
  private phaseTimer: NodeJS.Timeout | null = null
  private walkTimer: NodeJS.Timeout | null = null

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
    this.clearTimers()
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
    if (this.phase !== 'reminding') return
    this.clearTimers()
    this.todayCount += 1
    this.snoozedUntil = null
    this.nextReminderAt = Date.now() + this.intervalMs
    this.phase = 'success'
    this.phaseTimer = setTimeout(() => this.startLeaving(), SUCCESS_VISIBLE_MS)
    this.emitChange()
  }

  snooze(): void {
    if (this.phase !== 'reminding') return
    this.clearTimers()
    this.snoozedUntil = Date.now() + this.snoozeMs
    this.nextReminderAt = this.snoozedUntil
    this.startLeaving()
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) return
    this.paused = paused
    this.clearTimers()
    this.snoozedUntil = null
    this.phase = 'hidden'
    if (!paused) this.nextReminderAt = Date.now() + this.intervalMs
    this.emitChange()
  }

  showNow(): void {
    if (this.phase !== 'hidden') return
    this.beginReminder()
  }

  walkFinished(): void {
    if (this.phase === 'entering') {
      this.clearTimers()
      this.phase = 'greeting'
      this.phaseTimer = setTimeout(() => this.startReminding(), GREETING_MS)
      this.emitChange()
    } else if (this.phase === 'leaving') {
      this.clearTimers()
      this.phase = 'hidden'
      this.emitChange()
    }
  }

  private tick(): void {
    if (this.paused || this.phase !== 'hidden') return
    if (Date.now() < this.nextReminderAt) return
    this.beginReminder()
  }

  private beginReminder(): void {
    this.clearTimers()
    this.snoozedUntil = null
    this.phase = 'entering'
    this.walkTimer = setTimeout(() => this.walkFinished(), WALK_FAILSAFE_MS)
    this.emitChange()
  }

  private startReminding(): void {
    this.clearTimers()
    this.phase = 'reminding'
    this.phaseTimer = setTimeout(() => this.snooze(), this.settings.autoDismissSeconds * 1000)
    this.emitChange()
  }

  private startLeaving(): void {
    this.clearTimers()
    this.phase = 'leaving'
    this.walkTimer = setTimeout(() => this.walkFinished(), WALK_FAILSAFE_MS)
    this.emitChange()
  }

  private clearTimers(): void {
    if (this.phaseTimer) clearTimeout(this.phaseTimer)
    if (this.walkTimer) clearTimeout(this.walkTimer)
    this.phaseTimer = null
    this.walkTimer = null
  }

  private emitChange(): void {
    this.emit('change', this.getStatus())
  }
}
