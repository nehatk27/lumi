import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type AppStatus, type LumiApi } from '../shared/types'

const api: LumiApi = {
  getStatus: () => ipcRenderer.invoke(IPC.getStatus),
  confirmWater: () => ipcRenderer.invoke(IPC.confirmWater),
  snooze: () => ipcRenderer.invoke(IPC.snooze),
  setPaused: (paused) => ipcRenderer.invoke(IPC.setPaused, paused),
  walkFinished: () => ipcRenderer.invoke(IPC.walkFinished),
  getSettings: () => ipcRenderer.invoke(IPC.getSettings),
  updateSettings: (settings) => ipcRenderer.invoke(IPC.updateSettings, settings),
  getHistory: () => ipcRenderer.invoke(IPC.getHistory),
  openSettings: () => ipcRenderer.invoke(IPC.openSettings),
  onStatusChange: (callback) => {
    const handler = (_event: IpcRendererEvent, status: AppStatus): void => callback(status)
    ipcRenderer.on(IPC.statusChanged, handler)
    return () => ipcRenderer.removeListener(IPC.statusChanged, handler)
  },
  quitApp: () => ipcRenderer.invoke(IPC.quitApp)
}

contextBridge.exposeInMainWorld('lumi', api)
