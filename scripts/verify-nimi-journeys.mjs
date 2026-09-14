// Live acceptance only: attach to the exact endpoint printed by `nimi-app dev`.
// No mocked network responses, injected access, provider keys or direct Host launch.
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import { inflateRawSync } from "node:zlib"
import { chromium } from "@playwright/test"
import { DOMParser } from "@xmldom/xmldom"

const endpoint = process.env.NIMI_APP_CDP_ENDPOINT
if (!endpoint)
    throw new Error(
        "Set NIMI_APP_CDP_ENDPOINT to the exact CDP endpoint printed by the current official nimi-app dev launch.",
    )
const endpointUrl = new URL(endpoint)
if (
    endpointUrl.protocol !== "http:" ||
    endpointUrl.hostname !== "127.0.0.1" ||
    !endpointUrl.port
)
    throw new Error(
        "The supervised CDP endpoint must be an exact 127.0.0.1 HTTP origin.",
    )
const manifest = await fs.readFile("nimi.app.yaml", "utf8")
const origin = manifest.match(
    /renderer_origin:\s*(http:\/\/127\.0\.0\.1:\d+)/,
)?.[1]
if (!origin)
    throw new Error("The App's declared development origin is missing.")
const browser = await chromium.connectOverCDP(endpointUrl.origin, {
    noDefaults: true,
})
const pages = browser
    .contexts()
    .flatMap((context) => context.pages())
    .filter((page) => page.url().startsWith(`${origin}/`))
if (pages.length !== 1)
    throw new Error(
        "The CDP endpoint does not contain exactly one page for this App.",
    )
const page = pages[0]
// Electron owns draw.io beforeunload handling; do not race it with Playwright auto-dismiss.
page.on("dialog", (dialog) =>
    console.log(`Host-owned dialog: ${dialog.type()}`),
)
if (!(await page.title()).includes("Next AI Draw.io"))
    throw new Error("The selected page is not Next AI Draw.io.")
const language = new URL(page.url()).pathname.split("/")[1] || "en"
const copy = JSON.parse(
    await fs.readFile(`lib/i18n/dictionaries/${language}.json`, "utf8"),
)
const output = path.resolve(
    ".nimi/local/acceptance/live",
    new Date().toISOString().replace(/[:.]/g, "-"),
)
console.log(`Acceptance artifacts: ${output}`)
await fs.mkdir(output, { recursive: true })
const results = []
const starts = {
    generation: "text generation",
    editing: "editing existing diagram",
    history: "history restore and persisted reload",
    text: "text file input",
    image: "image input",
}
const selectedStart =
    process.argv.find((value) => value.startsWith("--from="))?.slice(7) ||
    "generation"
if (!Object.hasOwn(starts, selectedStart))
    throw new Error("Unknown acceptance start step.")
let reachedStart = false
const input = page.getByRole("textbox", { name: "Chat input", exact: true })

function graphXml(exported) {
    const parser = new DOMParser()
    let xml = exported.xml
    if (!xml) {
        const svg = Buffer.from(exported.data.split(",")[1], "base64").toString(
            "utf8",
        )
        xml = parser
            .parseFromString(svg, "image/svg+xml")
            .documentElement.getAttribute("content")
    }
    if (!xml) throw new Error("The actual draw.io export has no editable XML.")
    const doc = parser.parseFromString(xml, "text/xml")
    if (doc.getElementsByTagName("mxGraphModel").length) return xml
    const diagram = doc.getElementsByTagName("diagram")[0]
    if (!diagram?.textContent)
        throw new Error("The draw.io document has no graph.")
    return decodeURIComponent(
        inflateRawSync(Buffer.from(diagram.textContent, "base64")).toString(
            "utf8",
        ),
    )
}

async function exportDrawing(name) {
    const exported = await page.evaluate(
        () =>
            new Promise((resolve, reject) => {
                const iframe = document.querySelector("iframe")
                if (!iframe?.contentWindow)
                    return reject(new Error("The draw.io frame is not ready."))
                const target = new URL(iframe.src).origin
                const timer = setTimeout(() => {
                    window.removeEventListener("message", listener)
                    reject(new Error("draw.io export timed out"))
                }, 15000)
                function listener(event) {
                    if (
                        event.source !== iframe.contentWindow ||
                        event.origin !== target
                    )
                        return
                    let message
                    try {
                        message =
                            typeof event.data === "string"
                                ? JSON.parse(event.data)
                                : event.data
                    } catch {
                        return
                    }
                    if (message?.event !== "export") return
                    clearTimeout(timer)
                    window.removeEventListener("message", listener)
                    resolve(message)
                }
                window.addEventListener("message", listener)
                iframe.contentWindow.postMessage(
                    JSON.stringify({ action: "export", format: "xmlsvg" }),
                    target,
                )
            }),
    )
    const xml = graphXml(exported)
    await fs.writeFile(path.join(output, `${name}.drawio`), xml)
    await fs.writeFile(
        path.join(output, `${name}.svg`),
        Buffer.from(exported.data.split(",")[1], "base64"),
    )
    await page.screenshot({ path: path.join(output, `${name}.png`) })
    return xml
}

async function send(prompt) {
    await input.fill(prompt)
    await page
        .getByRole("button", { name: copy.chat.send, exact: true })
        .click()
    const stop = page.getByRole("button", {
        name: copy.chat.stopGeneration,
        exact: true,
    })
    await stop.waitFor({ state: "visible", timeout: 10000 })
    await stop.waitFor({ state: "hidden", timeout: 240000 })
}

async function fresh() {
    await page.getByTestId("new-chat-button").click()
    await input.waitFor({ state: "visible" })
    await page.waitForURL((url) => !url.searchParams.has("session"), {
        timeout: 15000,
    })
}

async function step(name, action) {
    if (name === starts[selectedStart]) reachedStart = true
    if (!reachedStart) {
        results.push({
            name,
            result: "NOT-RUN",
            reason: "Earlier steps reuse separately recorded evidence.",
        })
        return
    }
    console.log(`Running real App journey: ${name}`)
    try {
        await action()
        results.push({ name, result: "PASS" })
        console.log(`PASS: ${name}`)
    } catch (error) {
        results.push({
            name,
            result: "FAIL",
            error: error instanceof Error ? error.message : String(error),
        })
        await page.screenshot({ path: path.join(output, "failure.png") })
        await fs.writeFile(
            path.join(output, "failure-ui.txt"),
            await page.locator("body").ariaSnapshot(),
        )
        throw error
    }
}

try {
    await input.waitFor({ state: "visible", timeout: 45000 })
    await page.locator("iframe").waitFor({ state: "visible", timeout: 45000 })
    await fs.writeFile(
        path.join(output, "initial-ui.txt"),
        await page.locator("body").ariaSnapshot(),
    )
    await step("text generation", async () => {
        await fresh()
        await send(
            "Create a simple left-to-right flowchart with exactly three connected rectangles labeled RECEIVED, PACKED and SHIPPED. Use display_diagram.",
        )
        const xml = await exportDrawing("generated")
        for (const label of ["RECEIVED", "PACKED", "SHIPPED"])
            assert.ok(xml.includes(label), `Missing generated label ${label}`)
        assert.ok((xml.match(/vertex="1"/g) || []).length >= 3)
    })
    await step("editing existing diagram", async () => {
        await send(
            "Keep the current drawing and use edit_diagram to insert an orange rectangle labeled QC READY between PACKED and SHIPPED, with the corresponding connectors.",
        )
        const xml = await exportDrawing("edited")
        for (const label of ["RECEIVED", "PACKED", "QC READY", "SHIPPED"])
            assert.ok(xml.includes(label), `Missing edited label ${label}`)
    })
    await step("history restore and persisted reload", async () => {
        await page
            .getByRole("button", {
                name: copy.chat.diagramHistory,
                exact: true,
            })
            .click()
        const dialog = page.getByRole("dialog")
        await dialog
            .getByAltText(`${copy.history.version} 1`, { exact: true })
            .click()
        await dialog
            .getByRole("button", { name: copy.common.confirm, exact: true })
            .click()
        const restored = await exportDrawing("restored")
        assert.ok(
            restored.includes("PACKED") && !restored.includes("QC READY"),
            "History did not restore the earlier drawing",
        )
        // Autosave is intentionally asynchronous; the actual reloaded graph is the assertion.
        await page.waitForTimeout(2500)
        await page.reload()
        await input.waitFor({ state: "visible", timeout: 45000 })
        await page
            .locator("iframe")
            .waitFor({ state: "visible", timeout: 45000 })
        const reloaded = await exportDrawing("reloaded")
        assert.ok(
            reloaded.includes("PACKED") && !reloaded.includes("QC READY"),
            "Managed history did not survive reload",
        )
    })
    await step("text file input", async () => {
        await fresh()
        await page.locator('input[type="file"][multiple]').setInputFiles({
            name: "shipping-process.txt",
            mimeType: "text/plain",
            buffer: Buffer.from(
                "Shipping procedure: INTAKE-S1 -> PAYMENT-K8 -> SHIP-J4. Failed payment goes to REVIEW-Z3.",
            ),
        })
        await send(
            "Create a flowchart from the attached document. Preserve its step labels and failure branch.",
        )
        const xml = await exportDrawing("text-file")
        for (const label of ["INTAKE-S1", "PAYMENT-K8", "SHIP-J4", "REVIEW-Z3"])
            assert.ok(xml.includes(label), `File input lost ${label}`)
    })
    await step("image input", async () => {
        await fresh()
        await page
            .locator('input[type="file"][multiple]')
            .setInputFiles(path.resolve("public/example.png"))
        await send(
            "Recreate the diagram in the attached image. Preserve the text, decisions and branches. Use the image as your source.",
        )
        const xml = (await exportDrawing("image-input")).toLowerCase()
        assert.ok(
            xml.includes("lamp"),
            "The image's subject was not reproduced",
        )
        assert.ok(
            xml.includes("plug") &&
                xml.includes("bulb") &&
                xml.includes("repair"),
            "The image's decisions or outcomes are missing",
        )
    })
} finally {
    const app = JSON.parse(await fs.readFile("package.json", "utf8"))
    await fs.writeFile(
        path.join(output, "results.json"),
        JSON.stringify(
            {
                app: app.name,
                version: app.version,
                target: `${process.platform}-${process.arch}`,
                source: "Desktop-supervised development App",
                results,
                notVerifiedByThisScript: [
                    "PDF input",
                    "native save dialog and file writes",
                    "cancellation and reconnect",
                    "installed App",
                    "other OS target",
                ],
            },
            null,
            2,
        ),
    )
    // Closing this CDP connection disconnects the driver; Desktop remains the Host owner.
    await browser.close()
}
