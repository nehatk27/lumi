import { EventEmitter } from 'node:events'
import type { AppStatus, PetPhase } from '../../shared/types'
import { isWithinActiveHours, type Settings } from '../../shared/settings'
import { localDateKey, type StorageService } from './storage-service'

export interface Timing {
  intervalMs: number
  snoozeMs: number
  autoDismissMs: number
}

const TICK_MS = 1000
const SUCCESS_VISIBLE_MS = 2500
const WALK_FAILSAFE_MS = 30_000
const GREETING_MS = 2400
const MIN_DELAY_AFTER_START_MS = 60_000

export class ReminderService extends EventEmitter {
  private phase: PetPhase = 'hidden'
  private paused: boolean
  private snoozedUntil: number | null = null
  private nextReminderAt: number
  private dayKey = localDateKey()
  private tickTimer: NodeJS.Timeout | null = null
  private phaseTimer: NodeJS.Timeout | null = null
  private walkTimer: NodeJS.Timeout | null = null

  constructor(
    private storage: StorageService,
    private timingFor: (settings: Settings) => Timing
  ) {
    super()
    this.paused = storage.isPaused()
    this.nextReminderAt = this.initialSchedule()
  }

  private get settings(): Settings {
    return this.storage.getSettings()
  }

  private get timing(): Timing {
    return this.timingFor(this.settings)
  }

  /** After a restart, count from the last confirmation instead of starting a fresh full interval. */
  private initialSchedule(): number {
    const now = Date.now()
    const last = this.storage.getLastConfirmationAt()
    if (last === null) return now + this.timing.intervalMs
    return Math.max(now + MIN_DELAY_AFTER_START_MS, last + this.timing.intervalMs)
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
      todayCount: this.storage.getTodayCount(),
      dailyGoal: this.settings.dailyGoal,
      nextReminderAt: this.paused ? null : this.nextReminderAt,
      snoozedUntil: this.snoozedUntil,
      problem: this.storage.getProblem()
    }
  }

  confirmWater(): void {
    if (this.phase !== 'reminding') return
    this.clearTimers()
    this.storage.recordConfirmation(Date.now())
    this.snoozedUntil = null
    this.nextReminderAt = Date.now() + this.timing.intervalMs
    this.phase = 'success'
    this.phaseTimer = setTimeout(() => this.startLeaving(), SUCCESS_VISIBLE_MS)
    this.emitChange()
  }

  snooze(): void {
    if (this.phase !== 'reminding') return
    this.clearTimers()
    this.snoozedUntil = Date.now() + this.timing.snoozeMs
    this.nextReminderAt = this.snoozedUntil
    this.startLeaving()
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) return
    this.paused = paused
    this.storage.setPaused(paused)
    this.clearTimers()
    this.snoozedUntil = null
    this.phase = 'hidden'
    if (!paused) this.nextReminderAt = Date.now() + this.timing.intervalMs
    this.emitChange()
  }

  /** Called after settings are saved: reschedule from now using the new interval. */
  settingsChanged(): void {
    if (this.phase === 'hidden') {
      this.snoozedUntil = null
      this.nextReminderAt = Date.now() + this.timing.intervalMs
    }
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
    const key = localDateKey()
    if (key !== this.dayKey) {
      this.dayKey = key // a new local day: today's count starts from its own (empty) record
      this.emitChange()
    }
    if (this.paused || this.phase !== 'hidden') return
    if (Date.now() < this.nextReminderAt) return
    if (!isWithinActiveHours(this.settings.activeHours, new Date())) return // wait for active hours
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
    this.phaseTimer = setTimeout(() => this.snooze(), this.timing.autoDismissMs)
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
