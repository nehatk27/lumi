import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  DEFAULT_SETTINGS,
  sanitizeSettings,
  type HistoryEntry,
  type Settings
} from '../../shared/settings'

interface DayRecord {
  count: number
  confirmations: number[] // timestamps (ms) of user-confirmed actions
}

interface StoredData {
  version: 1
  settings: Settings
  paused: boolean
  days: Record<string, DayRecord>
}

const MAX_DAYS_KEPT = 365
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

/** Local calendar day, e.g. '2026-10-19'. Never use UTC here: midnight must follow the user's clock. */
export function localDateKey(ms: number = Date.now()): string {
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function freshData(): StoredData {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, activeHours: { ...DEFAULT_SETTINGS.activeHours } },
    paused: false,
    days: {}
  }
}

function normaliseDays(raw: unknown): Record<string, DayRecord> {
  const out: Record<string, DayRecord> = {}
  if (typeof raw !== 'object' || raw === null) return out
  for (const [key, value] of Object.entries(raw)) {
    if (!DAY_KEY_RE.test(key) || typeof value !== 'object' || value === null) continue
    const v = value as Record<string, unknown>
    const confirmations = Array.isArray(v.confirmations)
      ? v.confirmations.filter((t): t is number => typeof t === 'number' && Number.isFinite(t))
      : []
    const count =
      typeof v.count === 'number' && Number.isInteger(v.count) && v.count >= 0
        ? v.count
        : confirmations.length
    out[key] = { count, confirmations }
  }
  return out
}

function normalise(raw: unknown): StoredData {
  if (typeof raw !== 'object' || raw === null) throw new Error('Saved data is not an object')
  const r = raw as Record<string, unknown>
  const parsed = sanitizeSettings(r.settings)
  return {
    version: 1,
    settings: parsed.ok ? parsed.value : freshData().settings, // bad settings: defaults, keep history
    paused: r.paused === true,
    days: normaliseDays(r.days)
  }
}

export class StorageService {
  private readonly filePath = join(app.getPath('userData'), 'lumi-data.json')
  private data: StoredData
  /** True only the very first time Lumi runs (no data file existed yet). */
  readonly firstRun: boolean
  private loadNotice: string | null = null
  private saveError: string | null = null

  constructor() {
    this.firstRun = !existsSync(this.filePath)
    this.data = this.load()
    if (this.firstRun) this.save() // creates the file, so settings only open automatically once
    if (process.env['NODE_ENV'] !== 'production') console.info('[Lumi] data file:', this.filePath)
  }

  private load(): StoredData {
    if (!existsSync(this.filePath)) return freshData()
    try {
      return normalise(JSON.parse(readFileSync(this.filePath, 'utf8')))
    } catch (err) {
      console.error('[Lumi] could not read saved data', err)
      try {
        renameSync(this.filePath, `${this.filePath}.corrupt-${Date.now()}`) // keep it for inspection
      } catch {
        /* ignore */
      }
      this.loadNotice =
        "Lumi couldn't read her saved data, so she started fresh. The old file was kept as a backup."
      return freshData()
    }
  }

  /** Atomic write: write a temp file, then rename over the real one. */
  private save(): boolean {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      const tmp = `${this.filePath}.tmp`
      writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8')
      renameSync(tmp, this.filePath)
      this.saveError = null
      return true
    } catch (err) {
      console.error('[Lumi] could not save data', err)
      this.saveError = "Lumi couldn't save your data. Changes may be lost when she restarts."
      return false
    }
  }

  getProblem(): string | null {
    return this.saveError ?? this.loadNotice
  }

  getSettings(): Settings {
    return this.data.settings
  }

  /** Returns false (and keeps the old settings) if the file could not be written. */
  updateSettings(next: Settings): boolean {
    const previous = this.data.settings
    this.data.settings = next
    if (this.save()) return true
    this.data.settings = previous
    return false
  }

  isPaused(): boolean {
    return this.data.paused
  }

  setPaused(paused: boolean): void {
    this.data.paused = paused
    this.save()
  }

  getTodayCount(): number {
    return this.data.days[localDateKey()]?.count ?? 0 // a new local day simply has no record yet
  }

  getLastConfirmationAt(): number | null {
    const keys = Object.keys(this.data.days).sort().reverse()
    for (const key of keys) {
      const list = this.data.days[key].confirmations
      if (list.length > 0) return list[list.length - 1]
    }
    return null
  }

  recordConfirmation(timestamp: number): void {
    const key = localDateKey(timestamp)
    const day = this.data.days[key] ?? { count: 0, confirmations: [] }
    day.count += 1
    day.confirmations.push(timestamp)
    this.data.days[key] = day

    const keys = Object.keys(this.data.days).sort()
    while (keys.length > MAX_DAYS_KEPT) {
      const oldest = keys.shift()
      if (oldest) delete this.data.days[oldest]
    }
    this.save()
  }

  /** The last `days` local days including today, zero-filled. */
  getHistory(days: number): HistoryEntry[] {
    const out: HistoryEntry[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = localDateKey(d.getTime())
      out.push({ date: key, count: this.data.days[key]?.count ?? 0 })
    }
    return out
  }
}
