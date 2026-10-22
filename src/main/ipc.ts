import { app, ipcMain } from 'electron'
import { IPC } from '../shared/types'
import { sanitizeSettings, type UpdateResult } from '../shared/settings'
import type { ReminderService } from './services/reminder-service'
import type { StorageService } from './services/storage-service'
import { openSettingsWindow } from './windows/create-settings-window'

export function registerIpc(reminder: ReminderService, storage: StorageService): void {
  ipcMain.handle(IPC.getStatus, () => reminder.getStatus())
  ipcMain.handle(IPC.confirmWater, () => {
    reminder.confirmWater()
  })
  ipcMain.handle(IPC.snooze, () => {
    reminder.snooze()
  })
  ipcMain.handle(IPC.walkFinished, () => {
    reminder.walkFinished()
  })
  ipcMain.handle(IPC.setPaused, (_event, paused: unknown) => {
    if (typeof paused !== 'boolean') throw new TypeError('setPaused expects a boolean')
    reminder.setPaused(paused)
  })

  ipcMain.handle(IPC.getSettings, () => storage.getSettings())
  ipcMain.handle(IPC.updateSettings, (_event, input: unknown): UpdateResult => {
    const result = sanitizeSettings(input) // never trust the renderer
    if (!result.ok) return result
    if (!storage.updateSettings(result.value)) {
      return { ok: false, error: storage.getProblem() ?? "Lumi couldn't save your settings." }
    }
    reminder.settingsChanged()
    return { ok: true, settings: result.value }
  })
  ipcMain.handle(IPC.getHistory, () => storage.getHistory(7))
  ipcMain.handle(IPC.openSettings, () => {
    openSettingsWindow()
  })
  ipcMain.handle(IPC.quitApp, () => {
    app.quit()
  })
}
