import path from "node:path"
import { fileURLToPath } from "node:url"
import { isAllowedElectronRendererUrl } from "@nimiplatform/kit/shell/electron/main"
import { app, BrowserWindow, screen, shell } from "electron"

const currentDir = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

/**
 * Get the icon path based on platform
 * Note: electron-builder converts icon.png during packaging,
 * but at runtime we use PNG directly - Electron handles it
 */
function getIconPath(): string | undefined {
    // macOS doesn't need explicit icon - it's embedded in the app bundle
    if (process.platform === "darwin" && app.isPackaged) {
        return undefined
    }

    const iconName = "icon.png"

    if (app.isPackaged) {
        return path.join(process.resourcesPath, iconName)
    }

    // Development: use icon.png from resources
    return path.join(currentDir, "../resources/icon.png")
}

/**
 * Create the main application window
 */
export function createWindow(
    serverUrl: string,
    allowedRendererUrls: string[],
): BrowserWindow {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize

    mainWindow = new BrowserWindow({
        width: Math.min(1400, Math.floor(width * 0.9)),
        height: Math.min(900, Math.floor(height * 0.9)),
        minWidth: 800,
        minHeight: 600,
        title: "Next AI Draw.io",
        icon: getIconPath(),
        show: false, // Don't show until ready
        webPreferences: {
            preload: path.join(currentDir, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
        },
    })

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:\/\//.test(url) && new URL(url).origin !== serverUrl)
            void shell.openExternal(url)
        return { action: "deny" }
    })
    mainWindow.webContents.on("will-navigate", (event, url) => {
        const target = new URL(url)
        const isAbout =
            target.origin === serverUrl &&
            /^\/(en|zh|ja|zh-Hant)\/about(?:\/|$)/.test(target.pathname)
        if (!isAbout && !isAllowedElectronRendererUrl(url, allowedRendererUrls))
            event.preventDefault()
    })

    // Load the Next.js application
    mainWindow.loadURL(serverUrl)

    // Show window when ready to prevent flashing
    mainWindow.once("ready-to-show", () => {
        mainWindow?.show()
    })

    // Override the draw.io iframe's beforeunload handler so the window can
    // close after the user edits text in a shape (fixes #815). Diagrams are
    // already persisted via autosave, so the prompt is unnecessary.
    mainWindow.webContents.on("will-prevent-unload", (event) => {
        event.preventDefault()
    })

    mainWindow.on("closed", () => {
        mainWindow = null
    })

    // Handle page title updates
    mainWindow.webContents.on("page-title-updated", (event, title) => {
        if (
            title &&
            !title.includes("localhost") &&
            !title.includes("127.0.0.1")
        ) {
            mainWindow?.setTitle(title)
        } else {
            event.preventDefault()
        }
    })

    return mainWindow
}

/**
 * Get the main window instance
 */
export function getMainWindow(): BrowserWindow | null {
    return mainWindow
}
