import { convertToModelMessages, type UIMessage } from "ai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { sanitizeMessage } from "../../lib/session-storage"

const state = vi.hoisted(() => ({
    controller: new AbortController(),
    files: new Map<string, Uint8Array>(),
    reads: vi.fn(),
    beforeWrite: vi.fn(),
}))
vi.mock("../../lib/nimi/client", () => ({
    currentNimiSessionSignal: () => state.controller.signal,
    getNimiClient: () => ({
        storage: {
            assets: {
                list: async ({ prefix }: { prefix: string }) => ({
                    assets: [...state.files.keys()]
                        .filter((p) => p.startsWith(prefix))
                        .map((relativePath) => ({ relativePath })),
                    nextCursor: "",
                }),
                write: async ({
                    relativePath,
                    body,
                }: {
                    relativePath: string
                    body: Uint8Array
                }) => {
                    await state.beforeWrite(relativePath, body)
                    state.files.set(relativePath, body)
                },
                read: async ({ relativePath }: { relativePath: string }) => ({
                    body: (async function* () {
                        const bytes = state.files.get(relativePath)
                        if (!bytes) throw new Error("Missing test document")
                        state.reads()
                        yield bytes.slice(0, 300000)
                        if (bytes.length > 300000) yield bytes.slice(300000)
                    })(),
                }),
                remove: async (path: string) => {
                    state.files.delete(path)
                },
            },
        },
    }),
}))

import {
    listDocuments,
    readDocument,
    writeDocument,
} from "../../lib/nimi/documents"

describe("Nimi drawing persistence", () => {
    beforeEach(() => {
        state.files.clear()
        state.controller = new AbortController()
        state.reads.mockReset()
        state.beforeWrite.mockReset()
    })
    it("round-trips a drawing history larger than the small JSON document limit, including image data and ordered parts", async () => {
        const document = {
            id: "drawing-1",
            xml: "<mxCell value='示意图'/>".repeat(18000),
            parts: [
                {
                    type: "file",
                    mediaType: "image/png",
                    url: "data:image/png;base64,abc",
                },
                {
                    type: "tool-edit_diagram",
                    toolCallId: "call-1",
                    input: { operations: [] },
                    output: "Applied",
                },
            ],
        }
        await writeDocument("sessions", document.id, document)
        expect(await readDocument("sessions", document.id)).toEqual(document)
        expect(await readDocument("sessions", "missing")).toBeNull()
    })
    it("rejects in-flight reads after session invalidation instead of returning another session's data", async () => {
        await writeDocument("sessions", "one", { xml: "x".repeat(400000) })
        state.reads.mockImplementation(() => state.controller.abort())
        await expect(listDocuments("sessions")).rejects.toThrow()
    })
})

it("preserves UI/provider metadata and ordered tool results through the App's persisted transcript", async () => {
    state.files.clear()
    state.controller = new AbortController()
    state.reads.mockReset()
    const metadata = {
        nimi: { opaque: { kind: "fixture", version: 1, payload: [1, 2, 3] } },
    }
    const message = sanitizeMessage({
        id: "assistant-1",
        role: "assistant",
        metadata: { traceId: "trace-1" },
        parts: [
            { type: "text", text: "Generated.", providerMetadata: metadata },
            {
                type: "tool-display_diagram",
                toolCallId: "call-1",
                state: "output-available",
                input: { xml: "<mxCell/>" },
                output: "Displayed",
                callProviderMetadata: metadata,
            },
        ],
    })
    await writeDocument("sessions", "transcript", message)
    const loaded = await readDocument<UIMessage>("sessions", "transcript")
    expect(loaded?.metadata).toEqual({ traceId: "trace-1" })
    if (!loaded) throw new Error("Transcript was not persisted")
    const messages = await convertToModelMessages([loaded])
    expect(messages[0].content).toEqual(
        expect.arrayContaining([
            expect.objectContaining({
                type: "text",
                providerOptions: metadata,
            }),
            expect.objectContaining({
                type: "tool-call",
                toolCallId: "call-1",
                providerOptions: metadata,
            }),
        ]),
    )
    expect(messages[1]).toEqual(
        expect.objectContaining({
            role: "tool",
            content: expect.arrayContaining([
                expect.objectContaining({
                    type: "tool-result",
                    toolCallId: "call-1",
                }),
            ]),
        }),
    )
})

it("serializes an autosave and explicit save for the same document", async () => {
    state.files.clear()
    state.controller = new AbortController()
    state.beforeWrite.mockReset()
    let release: () => void = () => {
        throw new Error("Write did not start")
    }
    const blocked = new Promise<void>((resolve) => {
        release = resolve
    })
    state.beforeWrite.mockImplementationOnce(() => blocked)
    const first = writeDocument("sessions", "ordered", { revision: 1 })
    const second = writeDocument("sessions", "ordered", { revision: 2 })
    await Promise.resolve()
    expect(state.beforeWrite).toHaveBeenCalledTimes(1)
    release()
    await Promise.all([first, second])
    expect(state.beforeWrite).toHaveBeenCalledTimes(2)
    expect(await readDocument("sessions", "ordered")).toEqual({ revision: 2 })
})
