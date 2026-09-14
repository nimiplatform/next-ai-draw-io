import { currentNimiSessionSignal, getNimiClient } from "./client"

export type DocumentCollection = "sessions" | "templates" | "preferences"
function documentPath(collection: DocumentCollection, id: string): string {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id))
        throw new Error("Invalid document ID.")
    return `drawio/${collection}/${id}.json`
}

async function listPaths(collection: DocumentCollection, signal: AbortSignal) {
    const paths: string[] = []
    let cursor: string | undefined
    do {
        signal.throwIfAborted()
        const page = await getNimiClient().storage.assets.list({
            prefix: `drawio/${collection}/`,
            pageSize: 100,
            ...(cursor ? { cursor } : {}),
        })
        signal.throwIfAborted()
        paths.push(
            ...page.assets
                .filter((asset) => asset.relativePath.endsWith(".json"))
                .map((asset) => asset.relativePath),
        )
        cursor = page.nextCursor || undefined
    } while (cursor)
    return paths
}

async function readPath<T>(
    relativePath: string,
    signal: AbortSignal,
): Promise<T> {
    signal.throwIfAborted()
    const result = await getNimiClient().storage.assets.read({ relativePath })
    const decoder = new TextDecoder()
    let content = ""
    for await (const bytes of result.body) {
        signal.throwIfAborted()
        content += decoder.decode(bytes, { stream: true })
    }
    signal.throwIfAborted()
    return JSON.parse(content + decoder.decode()) as T
}

export async function listDocuments<T>(
    collection: DocumentCollection,
): Promise<T[]> {
    const signal = currentNimiSessionSignal()
    const paths = await listPaths(collection, signal)
    const documents: T[] = []
    for (const path of paths) documents.push(await readPath<T>(path, signal))
    return documents
}

export async function readDocument<T>(
    collection: DocumentCollection,
    id: string,
): Promise<T | null> {
    const signal = currentNimiSessionSignal()
    const path = documentPath(collection, id)
    // Missing documents are established by the catalog, never by swallowing an access error.
    const paths = await listPaths(collection, signal)
    return paths.includes(path) ? readPath<T>(path, signal) : null
}

// Serialize mutations to the same document within one protected session.
// This preserves autosave/new-chat write order without sharing work across accounts.
const mutationQueues = new WeakMap<AbortSignal, Map<string, Promise<void>>>()
function mutateDocument(
    path: string,
    signal: AbortSignal,
    action: () => Promise<void>,
): Promise<void> {
    let queue = mutationQueues.get(signal)
    if (!queue) {
        queue = new Map()
        mutationQueues.set(signal, queue)
    }
    const previous = queue.get(path) || Promise.resolve()
    const result = previous.then(async () => {
        signal.throwIfAborted()
        await action()
        signal.throwIfAborted()
    })
    const tail = result.then(
        () => undefined,
        () => undefined,
    )
    queue.set(path, tail)
    void tail.then(() => {
        if (queue?.get(path) === tail) queue.delete(path)
    })
    return result
}

export async function writeDocument<T>(
    collection: DocumentCollection,
    id: string,
    value: T,
): Promise<void> {
    const signal = currentNimiSessionSignal()
    signal.throwIfAborted()
    const relativePath = documentPath(collection, id)
    const bytes = new TextEncoder().encode(JSON.stringify(value))
    return mutateDocument(relativePath, signal, async () => {
        await getNimiClient().storage.assets.write({
            relativePath,
            body: bytes,
            mediaType: "application/json",
            overwrite: true,
        })
    })
}

export async function removeDocument(
    collection: DocumentCollection,
    id: string,
): Promise<void> {
    const signal = currentNimiSessionSignal()
    signal.throwIfAborted()
    const relativePath = documentPath(collection, id)
    await mutateDocument(relativePath, signal, async () => {
        await getNimiClient().storage.assets.remove(relativePath)
    })
}
