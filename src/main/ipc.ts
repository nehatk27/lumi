import { ipcMain } from 'electron'
import { IPC } from '../shared/types'
import type { ReminderService } from './services/reminder-service'

export function registerIpc(reminder: ReminderService): void {
  ipcMain.handle(IPC.getStatus, () => reminder.getStatus())
  ipcMain.handle(IPC.confirmWater, () => {
    reminder.confirmWater()
  })
  ipcMain.handle(IPC.snooze, () => {
    reminder.snooze()
  })
  ipcMain.handle(IPC.setPaused, (_event, paused: unknown) => {
    if (typeof paused !== 'boolean') throw new TypeError('setPaused expects a boolean')
    reminder.setPaused(paused)
  })
}
