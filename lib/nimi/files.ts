import { invokeShell } from "@nimiplatform/kit/shell/renderer/bridge"
import { asNimiError } from "@nimiplatform/sdk"

export async function saveExport(
    filename: string,
    content: string | Blob,
): Promise<boolean> {
    let encoding: "utf8" | "base64" = "utf8"
    let data: string
    if (content instanceof Blob) data = await content.text()
    else if (content.startsWith("data:")) {
        const comma = content.indexOf(",")
        if (comma < 0) throw new Error("Invalid exported image.")
        const header = content.slice(0, comma)
        if (header.endsWith(";base64")) {
            encoding = "base64"
            data = content.slice(comma + 1)
        } else data = decodeURIComponent(content.slice(comma + 1))
    } else data = content
    try {
        const result = await invokeShell<{ saved: boolean }>(
            "drawio.file.save",
            { filename, content: data, encoding },
        )
        return result.saved
    } catch (error) {
        throw asNimiError(error)
    }
}
