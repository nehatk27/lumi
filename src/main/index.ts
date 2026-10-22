import { app, BrowserWindow } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import {
  createPetWindow,
  hidePetWindow,
  setPetInteractive,
  showPetWindow
} from './windows/create-pet-window'
import { openSettingsWindow } from './windows/create-settings-window'
import { ReminderService, type Timing } from './services/reminder-service'
import { StorageService } from './services/storage-service'
import { registerIpc } from './ipc'
import { createTray } from './tray'
import { IPC, type AppStatus } from '../shared/types'
import type { Settings } from '../shared/settings'

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals')
  // Wayland compositors choose window positions themselves; XWayland lets Lumi place herself.
  // app.commandLine.appendSwitch('ozone-platform', 'x11')
}

// `npm run dev:fast` shortens the timers so you can test without waiting an hour
const FAST = is.dev && process.env['LUMI_FAST'] === '1'

function timingFor(settings: Settings): Timing {
  if (FAST) return { intervalMs: 30_000, snoozeMs: 15_000, autoDismissMs: 45_000 }
  return {
    intervalMs: settings.intervalMinutes * 60_000,
    snoozeMs: settings.snoozeMinutes * 60_000,
    autoDismissMs: 180_000
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit() // Lumi is already running; the running copy will open its settings
} else {
  app.on('second-instance', () => {
    if (app.isReady()) openSettingsWindow()
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.lumi.desktop')
    app.on('browser-window-created', (_, w) => optimizer.watchWindowShortcuts(w))

    const storage = new StorageService()
    const reminder = new ReminderService(storage, timingFor)

    reminder.on('change', (status: AppStatus) => {
      if (status.phase !== 'hidden') {
        showPetWindow()
        // Clicks only land on the bubble while she's asking (or celebrating)
        setPetInteractive(status.phase === 'reminding' || status.phase === 'success')
      }
      // Both the pet window and the settings window listen for status updates
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send(IPC.statusChanged, status)
      }
      if (status.phase === 'hidden') hidePetWindow()
    })

    registerIpc(reminder, storage)
    createPetWindow() // created hidden, ready for the first reminder
    createTray(reminder)
    reminder.start()
    if (storage.firstRun) openSettingsWindow()

    if (FAST) setTimeout(() => reminder.showNow(), 1500)
    if (is.dev && process.env['LUMI_OPEN_SETTINGS'] === '1') openSettingsWindow()
  })

  // Stay alive with no visible window: the scheduler lives in the main process.
  app.on('window-all-closed', () => {})
}
