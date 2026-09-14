// Nimi adaptation: keep the Next.js renderer, bind protected services in this Host.

import {
    registerNimiElectronAppAssetProtocolScheme,
    registerNimiElectronAppBridge,
} from "@nimiplatform/kit/shell/electron/main"
import {
    app,
    BrowserWindow,
    dialog,
    ipcMain,
    protocol,
    session,
    webContents,
} from "electron"
import { buildAppMenu } from "./app-menu"
import { startNextServer, stopNextServer } from "./next-server"
import { createAppFileCommands } from "./nimi-file-commands"
import { readDevelopmentRendererUrl } from "./nimi-launch"
import { findAvailablePort } from "./port-manager"
import { createWindow } from "./window-manager"

declare const __NIMI_ELECTRON_PRODUCTION__: boolean
const developmentUrl = readDevelopmentRendererUrl(
    process.argv,
    __NIMI_ELECTRON_PRODUCTION__,
)
const locales = ["en", "zh", "ja", "zh-Hant"]
let bridge: ReturnType<typeof registerNimiElectronAppBridge> | undefined

app.setName("Next AI Draw.io — Nimi")
app.setAppUserModelId("ai.nimi.apps.io.github.nimiplatform.next-ai-draw-io")
registerNimiElectronAppAssetProtocolScheme(protocol)

void app
    .whenReady()
    .then(async () => {
        const port = developmentUrl ? undefined : await findAvailablePort()
        const origin = developmentUrl || `http://127.0.0.1:${port}`
        const allowedRendererUrls = [
            origin,
            ...locales.map((locale) => `${origin}/${locale}`),
        ]
        bridge = registerNimiElectronAppBridge({
            appId: "io.github.nimiplatform.next-ai-draw-io",
            allowedRendererUrls,
            ipcMain,
            assetMediaPlatform: {
                protocol,
                webRequest: session.defaultSession.webRequest,
                webContents,
            },
            appCommandHandlers: createAppFileCommands(),
            onSessionInvalidated: () => {
                for (const window of BrowserWindow.getAllWindows()) {
                    window.webContents.send("drawio:session-invalidated")
                }
            },
        })
        if (!developmentUrl) await startNextServer(port)
        buildAppMenu()
        createWindow(origin, allowedRendererUrls)
        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0)
                createWindow(origin, allowedRendererUrls)
        })
    })
    .catch((error: unknown) => {
        dialog.showErrorBox(
            "Next AI Draw.io could not start",
            error instanceof Error ? error.message : String(error),
        )
        app.quit()
    })

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
})
app.on("before-quit", () => {
    bridge?.unregister()
    void stopNextServer()
})
