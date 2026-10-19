import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type AppStatus, type LumiApi } from '../shared/types'

const api: LumiApi = {
  getStatus: () => ipcRenderer.invoke(IPC.getStatus),
  confirmWater: () => ipcRenderer.invoke(IPC.confirmWater),
  snooze: () => ipcRenderer.invoke(IPC.snooze),
  setPaused: (paused) => ipcRenderer.invoke(IPC.setPaused, paused),
  onStatusChange: (callback) => {
    const handler = (_event: IpcRendererEvent, status: AppStatus): void => callback(status)
    ipcRenderer.on(IPC.statusChanged, handler)
    return () => ipcRenderer.removeListener(IPC.statusChanged, handler)
  },
  walkFinished: () => ipcRenderer.invoke(IPC.walkFinished)
}

contextBridge.exposeInMainWorld('lumi', api)
