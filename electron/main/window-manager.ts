import path from "node:path"
import { fileURLToPath } from "node:url"
import { app, BrowserWindow, screen, shell } from "electron"

// Keep this dynamic inside the deferred module too: the Host bundler hoists
// static external imports even when this local module was imported lazily.
const { isAllowedElectronRendererUrl } = await import(
    "@nimiplatform/kit/shell/electron/main"
)

const currentDir = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

export function getIconPath(): string {
    return path.join(
        currentDir,
        "..",
        "assets",
        "native",
        process.platform === "win32"
            ? "windows.ico"
            : process.platform === "darwin"
              ? "macos.png"
              : "app.png",
    )
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
