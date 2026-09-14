export function readDevelopmentRendererUrl(
    argv: readonly string[],
    production: boolean,
): string {
    const prefix = "--nimi-dev-renderer-url="
    if (
        production &&
        argv.some(
            (arg) =>
                arg === "--nimi-dev-renderer-url" || arg.startsWith(prefix),
        )
    ) {
        throw new Error(
            "The production Host rejects development renderer URLs.",
        )
    }
    const values = argv.filter((arg) => arg.startsWith(prefix))
    if (argv.includes("--nimi-dev-renderer-url") || values.length > 1) {
        throw new Error("A single exact development renderer URL is required.")
    }
    if (!values.length) return ""
    const raw = values[0].slice(prefix.length)
    const url = new URL(raw)
    if (
        url.protocol !== "http:" ||
        url.hostname !== "127.0.0.1" ||
        !url.port ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash ||
        raw !== url.origin
    ) {
        throw new Error(
            "The development renderer must use its declared 127.0.0.1 origin.",
        )
    }
    return raw
}

export function nextServerEnvironment(
    port: number,
    env: Readonly<Record<string, string | undefined>>,
): Record<string, string> {
    const result: Record<string, string> = {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: String(port),
        NEXT_TELEMETRY_DISABLED: "1",
    }
    // The Next helper owns rendering and non-AI web extraction. No Nimi or provider credentials.
    for (const key of [
        "PATH",
        "SystemRoot",
        "WINDIR",
        "TEMP",
        "TMP",
        "TMPDIR",
        "LANG",
    ]) {
        const value = env[key]
        if (value) result[key] = value
    }
    return result
}
