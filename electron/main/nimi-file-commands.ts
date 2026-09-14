import { readFile, stat, writeFile } from "node:fs/promises"
import type { NimiElectronCommandHandler } from "@nimiplatform/kit/shell/electron/main"
import { BrowserWindow, dialog } from "electron"
import { buildAppMenu } from "./app-menu"
import { setUserLocale } from "./preferences"

export function createAppFileCommands(): Record<
    string,
    NimiElectronCommandHandler
> {
    return {
        "drawio.locale.set": ({ payload }) => {
            setUserLocale(payload.locale)
            buildAppMenu()
            return { saved: true }
        },
        "drawio.file.open": async ({ event }) => {
            const window = BrowserWindow.getAllWindows().find(
                (candidate) => candidate.webContents.id === event.sender?.id,
            )
            if (!window) throw new Error("No active editor window.")
            const result = await dialog.showOpenDialog(window, {
                properties: ["openFile"],
                filters: [{ name: "Draw.io", extensions: ["drawio", "xml"] }],
            })
            if (result.canceled) return { canceled: true }
            const info = await stat(result.filePaths[0])
            if (info.size > 25 * 1024 * 1024)
                throw new Error("The drawing exceeds the 25 MB input limit.")
            const bytes = await readFile(result.filePaths[0])
            if (bytes.byteLength > 25 * 1024 * 1024)
                throw new Error("The drawing exceeds the 25 MB input limit.")
            return { canceled: false, xml: bytes.toString("utf8") }
        },
        "drawio.file.save": async ({ payload, event }) => {
            const input = payload as {
                filename?: unknown
                content?: unknown
                encoding?: unknown
            }
            if (
                !input ||
                typeof input.filename !== "string" ||
                typeof input.content !== "string" ||
                !["utf8", "base64"].includes(String(input.encoding))
            )
                throw new Error("Invalid drawing export.")
            if (
                input.filename.length > 180 ||
                /[\\/\0]/.test(input.filename) ||
                !/\.(drawio|xml|svg|png|json)$/.test(input.filename)
            )
                throw new Error("Invalid export filename.")
            const bytes = Buffer.from(
                input.content,
                input.encoding as "utf8" | "base64",
            )
            if (bytes.byteLength > 25 * 1024 * 1024)
                throw new Error("The export exceeds 25 MB.")
            const window = BrowserWindow.getAllWindows().find(
                (candidate) => candidate.webContents.id === event.sender?.id,
            )
            if (!window) throw new Error("No active editor window.")
            const result = await dialog.showSaveDialog(window, {
                defaultPath: input.filename,
            })
            if (result.canceled || !result.filePath) return { saved: false }
            await writeFile(result.filePath, bytes)
            return { saved: true }
        },
    }
}
