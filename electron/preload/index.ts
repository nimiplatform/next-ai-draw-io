import { installNimiElectronRuntimeBridge } from "@nimiplatform/kit/shell/electron/preload-cjs"
import { contextBridge, ipcRenderer } from "electron"

installNimiElectronRuntimeBridge({ contextBridge, ipcRenderer })
contextBridge.exposeInMainWorld("electronAPI", {
    platform: process.platform,
    isElectron: true,
    onSessionInvalidated: (callback: () => void) => {
        const handler = () => callback()
        ipcRenderer.on("drawio:session-invalidated", handler)
        return () =>
            ipcRenderer.removeListener("drawio:session-invalidated", handler)
    },
    onOpenSettings: (callback: () => void) => {
        const handler = () => callback()
        ipcRenderer.on("drawio:open-settings", handler)
        return () => ipcRenderer.removeListener("drawio:open-settings", handler)
    },
})
