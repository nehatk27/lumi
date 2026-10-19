import { BrowserWindow, screen, type Rectangle } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { CARD_H, CARD_W, MARGIN } from '../../shared/layout'

export type PetMode = 'card' | 'strip'

let petWindow: BrowserWindow | null = null
let currentMode: PetMode | null = null

function boundsFor(mode: PetMode): Rectangle {
  const { workArea } = screen.getPrimaryDisplay()
  const y = workArea.y + workArea.height - CARD_H - MARGIN // same bottom edge in both modes
  return mode === 'strip'
    ? { x: workArea.x, y, width: workArea.width, height: CARD_H }
    : { x: workArea.x + workArea.width - CARD_W - MARGIN, y, width: CARD_W, height: CARD_H }
}

export function getPetWindow(): BrowserWindow | null {
  return petWindow && !petWindow.isDestroyed() ? petWindow : null
}

/** strip = wide, fully click-through (while walking). card = small and interactive. */
export function setPetMode(mode: PetMode): void {
  const win = getPetWindow()
  if (!win || mode === currentMode) return
  currentMode = mode
  win.setBounds(boundsFor(mode))
  win.setIgnoreMouseEvents(mode === 'strip')
}

export function createPetWindow(): BrowserWindow {
  const existing = getPetWindow()
  if (existing) return existing

  const win = new BrowserWindow({
    width: CARD_W,
    height: CARD_H,
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
  currentMode = null
  win.on('closed', () => {
    petWindow = null
    currentMode = null
  })

  setPetMode('card')
  win.setAlwaysOnTop(true, 'floating')

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

export function showPetWindow(): void {
  const win = createPetWindow()
  win.setAlwaysOnTop(true, 'floating')
  if (!win.isVisible()) win.showInactive() // never steal focus
}

export function hidePetWindow(): void {
  getPetWindow()?.hide()
  currentMode = null // re-apply the right mode on the next show
}
