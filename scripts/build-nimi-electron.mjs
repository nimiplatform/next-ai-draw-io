import { mkdir, writeFile } from "node:fs/promises"
import { build } from "esbuild"

const production = process.argv.includes("--production")
await mkdir("dist-electron", { recursive: true })
await build({
    entryPoints: ["electron/main/index.ts"],
    outfile: "dist-electron/main.js",
    bundle: true,
    platform: "node",
    target: "node24",
    format: "esm",
    packages: "external",
    external: ["electron"],
    sourcemap: !production,
    define: { __NIMI_ELECTRON_PRODUCTION__: JSON.stringify(production) },
})
await build({
    entryPoints: ["electron/preload/index.ts"],
    outfile: "dist-electron/preload.cjs",
    bundle: true,
    platform: "node",
    target: "node24",
    format: "cjs",
    external: ["electron"],
    sourcemap: !production,
})
await writeFile("dist-electron/package.json", '{"type":"module"}\n')
