import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { app } from "electron"

export type MenuLocale = "en" | "zh" | "ja" | "zh-Hant"
const locales = new Set<MenuLocale>(["en", "zh", "ja", "zh-Hant"])
export function getUserLocale(): MenuLocale | undefined {
    try {
        const data = JSON.parse(
            readFileSync(
                path.join(app.getPath("userData"), "preferences.json"),
                "utf8",
            ),
        )
        return locales.has(data.locale) ? data.locale : undefined
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT")
            console.warn("Could not read menu language.")
        return undefined
    }
}
export function setUserLocale(value: unknown): void {
    if (typeof value !== "string" || !locales.has(value as MenuLocale))
        throw new Error("Unsupported menu language.")
    const directory = app.getPath("userData")
    mkdirSync(directory, { recursive: true })
    writeFileSync(
        path.join(directory, "preferences.json"),
        JSON.stringify({ locale: value }),
        "utf8",
    )
}
