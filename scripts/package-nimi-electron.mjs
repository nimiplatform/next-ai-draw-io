// App-owned packaging for the existing Next.js + Electron product.
import { spawn } from "node:child_process"
import {
    copyFile,
    cp,
    mkdir,
    mkdtemp,
    readFile,
    realpath,
    rm,
    writeFile,
} from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import { packager } from "@electron/packager"
import { prepareNativeIcons } from "./prepare-native-icons.mjs"

const appRoot = process.cwd()
const mac = process.platform === "darwin" && process.arch === "arm64"
const win = process.platform === "win32" && process.arch === "x64"
if (!mac && !win)
    throw new Error(
        "Build on macOS arm64 or Windows x86_64 for its matching target.",
    )
const hostTargetId = mac ? "macos-aarch64" : "windows-x86_64"
const args = process.argv.slice(2)
if (args.length > 1 || args.some((arg) => !arg.startsWith("--target=")))
    throw new Error("Use one --target=<target-id> argument.")
const requestedTargetId = args[0]?.slice("--target=".length) || hostTargetId
if (requestedTargetId !== hostTargetId)
    throw new Error(
        `Target ${requestedTargetId} requires its matching native build host; this machine is ${hostTargetId}.`,
    )
const platform = mac ? "darwin" : "win32"
const arch = mac ? "arm64" : "x64"
const executable = "next-ai-draw-io-shell"
const appManifest = JSON.parse(await readFile("package.json", "utf8"))
const requireFromApp = createRequire(path.join(appRoot, "package.json"))
const electronVersion = requireFromApp("electron/package.json").version
const output = path.join(appRoot, "dist-electron-package")
const target = path.join(output, `${executable}-${platform}-${arch}`)

async function run(args, cwd = appRoot) {
    const command =
        process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "pnpm"
    const commandArgs =
        process.platform === "win32"
            ? ["/d", "/s", "/c", `pnpm ${args.join(" ")}`]
            : args
    await new Promise((resolve, reject) => {
        const child = spawn(command, commandArgs, {
            cwd,
            stdio: "inherit",
            windowsHide: true,
        })
        child.once("error", reject)
        child.once("exit", (code, signal) =>
            code === 0
                ? resolve()
                : reject(new Error(`Build command failed (${signal || code})`)),
        )
    })
}

async function packageRoot(entry, expectedName) {
    let directory = path.dirname(await realpath(entry))
    while (directory !== path.dirname(directory)) {
        try {
            const manifest = JSON.parse(
                await readFile(path.join(directory, "package.json"), "utf8"),
            )
            if (manifest.name === expectedName) return directory
        } catch (error) {
            if (error.code !== "ENOENT") throw error
        }
        directory = path.dirname(directory)
    }
    throw new Error(`Cannot locate ${expectedName}`)
}

await run(["run", "prepare:drawio"])
await run(["run", "build"])
await run(["exec", "node", "scripts/build-nimi-electron.mjs", "--production"])
await run(["exec", "node", "scripts/prepare-electron-build.mjs"])
const stage = await mkdtemp(path.join(tmpdir(), "drawio-nimi-package-"))
const source = path.join(stage, "app")
let complete = false
try {
    await mkdir(source, { recursive: true })
    for (const file of [
        "package.json",
        "pnpm-lock.yaml",
        "LICENSE",
        "README.md",
    ])
        await copyFile(path.join(appRoot, file), path.join(source, file))
    await cp(
        path.join(appRoot, "dist-electron"),
        path.join(source, "dist-electron"),
        { recursive: true },
    )
    await run(
        [
            "install",
            "--prod",
            "--frozen-lockfile",
            "--ignore-scripts",
            "--node-linker=hoisted",
        ],
        source,
    )
    const nativeName = `@nimiplatform/kit-protected-local-${platform}-${arch}`
    const kitRoot = await packageRoot(
        requireFromApp.resolve("@nimiplatform/kit/shell/electron/main"),
        "@nimiplatform/kit",
    )
    const kitManifest = JSON.parse(
        await readFile(path.join(kitRoot, "package.json"), "utf8"),
    )
    if (!kitManifest.optionalDependencies?.[nativeName])
        throw new Error("The pinned Kit does not provide this target carrier.")
    const nativeRoot = await packageRoot(
        createRequire(path.join(kitRoot, "package.json")).resolve(nativeName),
        nativeName,
    )
    const installedNative = path.join(
        source,
        "node_modules",
        ...nativeName.split("/"),
    )
    const extraResource = [
        path.join(appRoot, "electron-standalone"),
        path.join(appRoot, "resources/icon.png"),
    ]
    if (mac) {
        await rm(installedNative, { recursive: true, force: true })
        await cp(nativeRoot, path.join(stage, "nimi-native/protected-local"), {
            recursive: true,
            dereference: true,
        })
        extraResource.push(path.join(stage, "nimi-native"))
    }
    const stagedManifest = { ...appManifest }
    delete stagedManifest.devDependencies
    await writeFile(
        path.join(source, "package.json"),
        `${JSON.stringify(stagedManifest, null, 2)}\n`,
    )
    await rm(path.join(source, "pnpm-lock.yaml"))
    await rm(target, { recursive: true, force: true })
    const version = mac
        ? appManifest.version
        : `${appManifest.version.split("-")[0]}.0`
    const icons = await prepareNativeIcons(appRoot)
    const paths = await packager({
        icon: mac ? icons.icns : icons.ico,
        dir: source,
        platform,
        arch,
        name: executable,
        executableName: executable,
        appBundleId: "ai.nimi.apps.io.github.nimiplatform.next-ai-draw-io",
        appCopyright: "Copyright © 2024 Next AI Draw.io",
        ...(mac
            ? {
                  appCategoryType: "public.app-category.productivity",
                  extendInfo: {
                      CFBundleDisplayName: "Next AI Draw.io",
                      CFBundleName: "Next AI Draw.io",
                  },
              }
            : {}),
        appVersion: version,
        buildVersion: version,
        electronVersion,
        out: output,
        overwrite: false,
        prune: false,
        derefSymlinks: true,
        asar: { unpack: "**/*.node" },
        // Preserve App SemVer after Packager writes the Windows resource version.
        beforeAsar: [
            async ({ buildPath }) => {
                const manifestPath = path.join(buildPath, "package.json")
                const manifest = JSON.parse(
                    await readFile(manifestPath, "utf8"),
                )
                manifest.version = appManifest.version
                await writeFile(
                    manifestPath,
                    `${JSON.stringify(manifest, null, 2)}\n`,
                )
            },
        ],
        extraResource,
        ...(mac
            ? {
                  osxSign: {
                      identity: "-",
                      identityValidation: false,
                      preAutoEntitlements: false,
                      preEmbedProvisioningProfile: false,
                      strictVerify: true,
                      optionsForFile: () => ({
                          entitlements: [],
                          hardenedRuntime: false,
                          timestamp: "none",
                      }),
                  },
              }
            : {}),
        win32metadata: {
            ProductName: "Next AI Draw.io",
            FileDescription: "Next AI Draw.io for Nimi",
            InternalName: executable,
            OriginalFilename: `${executable}.exe`,
            "requested-execution-level": "asInvoker",
        },
    })
    if (paths.length !== 1 || path.resolve(paths[0]) !== target)
        throw new Error("Unexpected package target.")
    const resources = mac
        ? path.join(target, `${executable}.app/Contents/Resources`)
        : path.join(target, "resources")
    // Keep the helper outside ASAR; its name matches the original Next host contract.
    // Rename before sealing is required, so the host accepts the staged resource name directly.
    await realpath(path.join(resources, "electron-standalone/server.js"))
    await realpath(
        mac
            ? path.join(
                  target,
                  `${executable}.app/Contents/MacOS/${executable}`,
              )
            : path.join(target, `${executable}.exe`),
    )
    complete = true
    console.log(`Next AI Draw.io package: ${target}`)
} finally {
    await rm(stage, { recursive: true, force: true })
    if (!complete) await rm(target, { recursive: true, force: true })
}
