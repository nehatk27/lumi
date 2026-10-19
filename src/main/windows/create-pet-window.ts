import { BrowserWindow, screen, type Rectangle } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { CARD_H, CARD_W } from '../../shared/layout'

let petWindow: BrowserWindow | null = null

/** Covers the whole usable screen, so the compositor has nowhere else to put it. */
function stripBounds(): Rectangle {
  const { workArea } = screen.getPrimaryDisplay()
  return {
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height
  }
}

export function getPetWindow(): BrowserWindow | null {
  return petWindow && !petWindow.isDestroyed() ? petWindow : null
}

export function setPetInteractive(interactive: boolean): void {
  const win = getPetWindow()
  if (!win) return
  const [width, height] = win.getContentSize()

  win.setIgnoreMouseEvents(!interactive)
  try {
    const column = interactive
      ? {
          x: Math.round((width - CARD_W) / 2),
          y: height - CARD_H, // only the bottom part around Lumi and her bubble
          width: CARD_W,
          height: CARD_H
        }
      : { x: 0, y: 0, width, height }
    win.setShape([column])
  } catch (err) {
    console.error('[Lumi] could not update the clickable region', err)
  }
}

export function createPetWindow(): BrowserWindow {
  const existing = getPetWindow()
  if (existing) return existing

  const win = new BrowserWindow({
    ...stripBounds(),
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: true, // some Linux window managers ignore setBounds on non-resizable windows
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
  petWindow = win
  win.on('closed', () => {
    petWindow = null
  })

  win.setAlwaysOnTop(true, 'floating')
  setPetInteractive(false)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

// export function showPetWindow(): void {
//   const win = createPetWindow()
//   win.setAlwaysOnTop(true, 'floating')
//   if (!win.isVisible()) {
//     win.setBounds(stripBounds()) // follows screen or panel changes between reminders
//     win.showInactive() // never steal focus
//   }
// }

function placeStrip(win: BrowserWindow): void {
  win.setBounds(stripBounds())
}

export function showPetWindow(): void {
  const win = createPetWindow()
  win.setAlwaysOnTop(true, 'floating')
  if (win.isVisible()) return

  placeStrip(win)
  win.showInactive() // never steal focus
  placeStrip(win)

  // Some Linux window managers choose their own position when a window is first shown,
  // so apply ours again once the window exists on screen.
  setTimeout(() => {
    if (!win.isDestroyed() && win.isVisible()) placeStrip(win)
  }, 60)
  setTimeout(() => {
    if (win.isDestroyed() || !win.isVisible()) return
    placeStrip(win)
    if (is.dev) {
      console.info('[Lumi] placement', {
        wanted: stripBounds(),
        actual: win.getBounds(),
        workArea: screen.getPrimaryDisplay().workArea,
        screenBounds: screen.getPrimaryDisplay().bounds
      })
    }
  }, 300)
}

export function hidePetWindow(): void {
  getPetWindow()?.hide()
}
