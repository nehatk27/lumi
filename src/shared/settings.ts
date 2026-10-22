export interface ActiveHours {
  enabled: boolean
  start: string // 'HH:MM', 24-hour local time
  end: string
}

export interface Settings {
  intervalMinutes: number
  snoozeMinutes: number
  dailyGoal: number
  activeHours: ActiveHours
}

export interface HistoryEntry {
  date: string // 'YYYY-MM-DD', local calendar day
  count: number // user-confirmed actions only, never measured intake
}

export type SettingsResult = { ok: true; value: Settings } | { ok: false; error: string }
export type UpdateResult = { ok: true; settings: Settings } | { ok: false; error: string }

export const LIMITS = {
  intervalMinutes: { min: 5, max: 240 },
  snoozeMinutes: { min: 1, max: 60 },
  dailyGoal: { min: 1, max: 20 }
} as const

export const DEFAULT_SETTINGS: Settings = {
  intervalMinutes: 60,
  snoozeMinutes: 10,
  dailyGoal: 8,
  activeHours: { enabled: true, start: '09:00', end: '21:00' }
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

class ValidationError extends Error {}

function intIn(label: string, value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`${label} must be a whole number between ${min} and ${max}.`)
  }
  return value
}

function timeOf(label: string, value: unknown): string {
  if (typeof value !== 'string' || !TIME_RE.test(value)) {
    throw new ValidationError(`${label} must be a time like 09:00.`)
  }
  return value
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Validates unknown input (from IPC or from disk). Never trust the renderer. */
export function sanitizeSettings(input: unknown): SettingsResult {
  try {
    if (typeof input !== 'object' || input === null) {
      throw new ValidationError('Settings are missing.')
    }
    const s = input as Record<string, unknown>
    const hours = s.activeHours
    if (typeof hours !== 'object' || hours === null) {
      throw new ValidationError('Active hours are missing.')
    }
    const h = hours as Record<string, unknown>
    if (typeof h.enabled !== 'boolean')
      throw new ValidationError('Active hours need an on/off value.')

    const start = timeOf('Start time', h.start)
    const end = timeOf('End time', h.end)
    if (h.enabled && start === end) {
      throw new ValidationError('Start and end time must be different.')
    }

    return {
      ok: true,
      value: {
        intervalMinutes: intIn(
          'Reminder interval',
          s.intervalMinutes,
          LIMITS.intervalMinutes.min,
          LIMITS.intervalMinutes.max
        ),
        snoozeMinutes: intIn(
          'Snooze time',
          s.snoozeMinutes,
          LIMITS.snoozeMinutes.min,
          LIMITS.snoozeMinutes.max
        ),
        dailyGoal: intIn('Daily goal', s.dailyGoal, LIMITS.dailyGoal.min, LIMITS.dailyGoal.max),
        activeHours: { enabled: h.enabled, start, end }
      }
    }
  } catch (err) {
    if (err instanceof ValidationError) return { ok: false, error: err.message }
    throw err
  }
}

/** True when `date` falls inside the configured window. Windows may cross midnight (e.g. 22:00 to 06:00). */
export function isWithinActiveHours(hours: ActiveHours, date: Date): boolean {
  if (!hours.enabled) return true
  const now = date.getHours() * 60 + date.getMinutes()
  const start = toMinutes(hours.start)
  const end = toMinutes(hours.end)
  return start < end ? now >= start && now < end : now >= start || now < end
}
