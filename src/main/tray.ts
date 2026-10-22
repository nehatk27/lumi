import { Menu, Tray, app, nativeImage } from 'electron'
import lumiIcon from '../../resources/lumi/lumi-idle.png?asset'
import type { ReminderService } from './services/reminder-service'
import { openSettingsWindow } from './windows/create-settings-window'

let tray: Tray | null = null

export function createTray(reminder: ReminderService): Tray {
  const image = nativeImage.createFromPath(lumiIcon).resize({ height: 22 })
  tray = new Tray(image)
  tray.setToolTip('Lumi')

  const rebuild = (): void => {
    const paused = reminder.getStatus().paused
    tray?.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Open settings', click: () => openSettingsWindow() },
        { label: 'Show Lumi', click: () => reminder.showNow() },
        {
          label: paused ? 'Resume reminders' : 'Pause reminders',
          click: () => reminder.setPaused(!paused)
        },
        { type: 'separator' },
        { label: 'Quit Lumi', click: () => app.quit() }
      ])
    )
  }

  rebuild()
  reminder.on('change', rebuild)
  return tray
}
