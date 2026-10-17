import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

const WIDTH = 320
const HEIGHT = 420
const MARGIN = 16

let petWindow: BrowserWindow | null = null

function positionBottomRight(win: BrowserWindow): void {
  const { workArea } = screen.getPrimaryDisplay()
  win.setPosition(
    workArea.x + workArea.width - WIDTH - MARGIN,
    workArea.y + workArea.height - HEIGHT - MARGIN
  )
}

export function createPetWindow(): BrowserWindow {
  if (petWindow && !petWindow.isDestroyed()) return petWindow

  petWindow = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  petWindow.setAlwaysOnTop(true, 'floating')
  positionBottomRight(petWindow)

  // showInactive: appear without stealing keyboard focus from what the user is typing
  petWindow.once('ready-to-show', () => petWindow?.showInactive())
  petWindow.on('closed', () => {
    petWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    petWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    petWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return petWindow
}
