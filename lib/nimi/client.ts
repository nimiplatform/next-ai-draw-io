import { createNimiLocalAppStandardShellSurface } from "@nimiplatform/kit/shell/renderer/bridge"
import { createNimiClient, type NimiLocalAppClient } from "@nimiplatform/sdk"

let client: NimiLocalAppClient | undefined
let sessionController = new AbortController()

export function getNimiClient(): NimiLocalAppClient {
    client ??= createNimiClient({
        localApp: { standardShell: createNimiLocalAppStandardShellSurface() },
    })
    return client
}

export function currentNimiSessionSignal(): AbortSignal {
    return sessionController.signal
}

export function invalidateNimiSession() {
    sessionController.abort(
        new Error("Nimi session changed. The previous operation was canceled."),
    )
    sessionController = new AbortController()
    client = undefined
}
