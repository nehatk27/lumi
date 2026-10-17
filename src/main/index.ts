import { app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createPetWindow } from './windows/create-pet-window'

// Linux: needed on some setups for real window transparency
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals')
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.lumi.desktop')
  app.on('browser-window-created', (_, w) => optimizer.watchWindowShortcuts(w))
  createPetWindow()
})

// Keep running with no windows: the reminder scheduler (Phase 2) lives here.
app.on('window-all-closed', () => {})
