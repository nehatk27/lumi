import { app } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import {
  createPetWindow,
  getPetWindow,
  hidePetWindow,
  setPetMode,
  showPetWindow
} from './windows/create-pet-window'
import { ReminderService } from './services/reminder-service'
import { registerIpc } from './ipc'
import { createTray } from './tray'
import { IPC, type AppStatus } from '../shared/types'

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals')
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.lumi.desktop')
  app.on('browser-window-created', (_, w) => optimizer.watchWindowShortcuts(w))

  const reminder = new ReminderService({
    intervalMinutes: is.dev ? 0.5 : 60,
    snoozeMinutes: is.dev ? 0.25 : 10,
    autoDismissSeconds: is.dev ? 45 : 180
  })

  reminder.on('change', (status: AppStatus) => {
    if (status.phase !== 'hidden') {
      const walking = status.phase === 'entering' || status.phase === 'leaving'
      setPetMode(walking ? 'strip' : 'card')
      showPetWindow()
    }
    getPetWindow()?.webContents.send(IPC.statusChanged, status)
    if (status.phase === 'hidden') hidePetWindow()
  })

  registerIpc(reminder)
  createPetWindow() // created hidden, ready for the first reminder
  createTray(reminder)
  if (is.dev) setTimeout(() => reminder.showNow(), 1500)
  reminder.start()
})

// Stay alive with no visible window: the scheduler lives in the main process.
app.on('window-all-closed', () => {})
