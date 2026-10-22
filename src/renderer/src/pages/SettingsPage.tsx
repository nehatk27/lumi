import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import {
  LIMITS,
  type ActiveHours,
  type HistoryEntry,
  type Settings
} from '../../../shared/settings'
import type { AppStatus } from '../../../shared/types'
import '../styles/settings.css'

interface NumberFieldProps {
  id: string
  label: string
  hint: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (value: number) => void
}

function NumberField({
  id,
  label,
  hint,
  value,
  min,
  max,
  unit,
  onChange
}: NumberFieldProps): JSX.Element {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field__row">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
        <span className="field__unit">{unit}</span>
      </div>
      <p className="field__hint">{hint}</p>
    </div>
  )
}

function dayLabel(key: string, index: number, total: number): string {
  if (index === total - 1) return 'Today'
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

export default function SettingsPage(): JSX.Element {
  const [draft, setDraft] = useState<Settings | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [status, setStatus] = useState<AppStatus | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    window.lumi.getSettings().then(setDraft)
    window.lumi.getHistory().then(setHistory)
    window.lumi.getStatus().then(setStatus)
    return window.lumi.onStatusChange((next) => {
      setStatus(next)
      window.lumi.getHistory().then(setHistory)
    })
  }, [])

  if (!draft) {
    return (
      <main className="settings">
        <p>Loading…</p>
      </main>
    )
  }

  const setField = <K extends keyof Settings>(key: K, value: Settings[K]): void => {
    setDraft({ ...draft, [key]: value })
    setMessage(null)
  }
  const setHours = (patch: Partial<ActiveHours>): void => {
    setField('activeHours', { ...draft.activeHours, ...patch })
  }

  const save = async (): Promise<void> => {
    const result = await window.lumi.updateSettings(draft)
    if (result.ok) {
      setDraft(result.settings)
      setMessage({ kind: 'ok', text: 'Saved. Lumi will use these from now on.' })
    } else {
      setMessage({ kind: 'error', text: result.error })
    }
  }

  const maxCount = Math.max(1, ...history.map((h) => h.count))

  return (
    <main className="settings">
      <header>
        <h1>Lumi settings</h1>
        <p className="settings__sub">Small, gentle reminders. Everything stays on your computer.</p>
      </header>

      {status?.problem && (
        <p className="notice notice--error" role="alert">
          {status.problem}
        </p>
      )}

      <section className="card">
        <h2>Today</h2>
        <p className="big">
          {status?.todayCount ?? 0} <span>of {status?.dailyGoal ?? draft.dailyGoal} confirmed</span>
        </p>
        <button
          className="btn btn--ghost"
          onClick={() => status && window.lumi.setPaused(!status.paused)}
        >
          {status?.paused ? 'Resume reminders' : 'Pause reminders'}
        </button>
        {status?.paused && <p className="field__hint">Reminders are paused.</p>}
      </section>

      <section className="card">
        <h2>Reminders</h2>
        <NumberField
          id="interval"
          label="Remind me every"
          hint="How long after a glass (or at start) before Lumi comes back."
          value={draft.intervalMinutes}
          min={LIMITS.intervalMinutes.min}
          max={LIMITS.intervalMinutes.max}
          unit="minutes"
          onChange={(v) => setField('intervalMinutes', v)}
        />
        <NumberField
          id="snooze"
          label="“Remind me later” waits"
          hint="How long Lumi stays away after you snooze."
          value={draft.snoozeMinutes}
          min={LIMITS.snoozeMinutes.min}
          max={LIMITS.snoozeMinutes.max}
          unit="minutes"
          onChange={(v) => setField('snoozeMinutes', v)}
        />
        <NumberField
          id="goal"
          label="Daily goal"
          hint="Glasses you'd like to confirm each day."
          value={draft.dailyGoal}
          min={LIMITS.dailyGoal.min}
          max={LIMITS.dailyGoal.max}
          unit="glasses"
          onChange={(v) => setField('dailyGoal', v)}
        />
      </section>

      <section className="card">
        <h2>Active hours</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.activeHours.enabled}
            onChange={(e) => setHours({ enabled: e.target.checked })}
          />
          Only remind me during these hours
        </label>
        <div className="hours" aria-disabled={!draft.activeHours.enabled}>
          <label>
            From
            <input
              type="time"
              value={draft.activeHours.start}
              disabled={!draft.activeHours.enabled}
              onChange={(e) => setHours({ start: e.target.value })}
            />
          </label>
          <label>
            Until
            <input
              type="time"
              value={draft.activeHours.end}
              disabled={!draft.activeHours.enabled}
              onChange={(e) => setHours({ end: e.target.value })}
            />
          </label>
        </div>
      </section>

      <div className="save-row">
        <button className="btn btn--primary" onClick={() => void save()}>
          Save settings
        </button>
        {message && (
          <p
            className={message.kind === 'ok' ? 'notice notice--ok' : 'notice notice--error'}
            role={message.kind === 'error' ? 'alert' : 'status'}
          >
            {message.text}
          </p>
        )}
      </div>

      <section className="card">
        <h2>Last 7 days</h2>
        <ul className="history">
          {history.map((h, i) => (
            <li key={h.date}>
              <span className="history__day">{dayLabel(h.date, i, history.length)}</span>
              <span className="history__bar">
                <span style={{ width: `${(h.count / maxCount) * 100}%` }} />
              </span>
              <span className="history__count">{h.count}</span>
            </li>
          ))}
        </ul>
        <p className="field__hint">Counts are glasses you confirmed, not measured water intake.</p>
      </section>
      <button className="btn btn--ghost" onClick={() => void window.lumi.quitApp()}>
        Quit Lumi
      </button>
    </main>
  )
}
