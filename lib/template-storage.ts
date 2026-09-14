import { nanoid } from "nanoid"
import { currentNimiSessionSignal } from "./nimi/client"
import {
    listDocuments,
    readDocument,
    removeDocument,
    writeDocument,
} from "./nimi/documents"

// Types
export interface Template {
    id: string
    title: string
    prompt: string
    description?: string
    createdAt: number
    updatedAt: number
    clickCount: number
    runCount: number
    lastUsedAt: number
    pinned: boolean
}

export type TemplateCreateInput = Pick<Template, "prompt"> &
    Partial<
        Omit<
            Template,
            | "id"
            | "createdAt"
            | "updatedAt"
            | "clickCount"
            | "runCount"
            | "lastUsedAt"
        >
    >

// Default title: first 20 chars of trimmed prompt, with ellipsis if truncated
const DEFAULT_TITLE_MAX_LENGTH = 20

export function generateDefaultTitle(prompt: string): string {
    const trimmed = prompt.trim()
    if (trimmed.length <= DEFAULT_TITLE_MAX_LENGTH) return trimmed
    return trimmed.slice(0, DEFAULT_TITLE_MAX_LENGTH).trim() + "..."
}

export async function getAllTemplates(): Promise<Template[]> {
    return sortTemplates(await listDocuments<Template>("templates"))
}

export async function getTemplate(id: string): Promise<Template | null> {
    return readDocument<Template>("templates", id)
}

export async function createTemplate(
    input: TemplateCreateInput,
): Promise<Template | null> {
    const prompt = input.prompt.trim()
    if (!prompt) return null
    const now = Date.now()
    const template: Template = {
        id: nanoid(),
        title: input.title?.trim() || generateDefaultTitle(prompt),
        prompt,
        description: input.description?.trim(),
        createdAt: now,
        updatedAt: now,
        clickCount: 0,
        runCount: 0,
        lastUsedAt: 0,
        pinned: input.pinned ?? false,
    }
    await writeDocument("templates", template.id, template)
    return template
}

let mutationTail: Promise<unknown> = Promise.resolve()
export function updateTemplate(
    id: string,
    updates: Partial<Omit<Template, "id" | "createdAt">>,
): Promise<Template | null> {
    const signal = currentNimiSessionSignal()
    const next = mutationTail.then(async () => {
        signal.throwIfAborted()
        const existing = await getTemplate(id)
        signal.throwIfAborted()
        if (!existing) return null
        const updated = {
            ...existing,
            ...updates,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: Date.now(),
        }
        await writeDocument("templates", id, updated)
        return updated
    })
    mutationTail = next.catch(() => undefined)
    return next
}

export async function deleteTemplate(id: string): Promise<boolean> {
    await removeDocument("templates", id)
    return true
}

export async function duplicateTemplate(
    id: string,
    copySuffix = "(copy)",
): Promise<Template | null> {
    const signal = currentNimiSessionSignal()
    const existing = await getTemplate(id)
    signal.throwIfAborted()
    if (!existing) return null
    return createTemplate({
        ...existing,
        title: `${existing.title} ${copySuffix}`,
        pinned: false,
    })
}

export async function incrementClickCount(id: string): Promise<void> {
    const signal = currentNimiSessionSignal()
    const template = await getTemplate(id)
    signal.throwIfAborted()
    if (template)
        await updateTemplate(id, { clickCount: template.clickCount + 1 })
}

export async function incrementRunCount(id: string): Promise<void> {
    const signal = currentNimiSessionSignal()
    const template = await getTemplate(id)
    signal.throwIfAborted()
    if (template)
        await updateTemplate(id, {
            runCount: template.runCount + 1,
            lastUsedAt: Date.now(),
        })
}

// Search

export function searchTemplates(
    templates: Template[],
    query: string,
): Template[] {
    if (!query.trim()) return templates
    const lowerQuery = query.toLowerCase()
    return templates.filter((t) => {
        const titleMatch = t.title.toLowerCase().includes(lowerQuery)
        const descMatch =
            t.description?.toLowerCase().includes(lowerQuery) ?? false
        return titleMatch || descMatch
    })
}

// Sorting

export function sortTemplates(templates: Template[]): Template[] {
    return [...templates].sort((a, b) => {
        // pinned desc
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        // runCount desc
        if (a.runCount !== b.runCount) return b.runCount - a.runCount
        // lastUsedAt desc
        if (a.lastUsedAt !== b.lastUsedAt) return b.lastUsedAt - a.lastUsedAt
        // updatedAt desc
        return b.updatedAt - a.updatedAt
    })
}

// Import / Export

export const TEMPLATE_EXPORT_SCHEMA_VERSION = 1

export interface TemplateExportData {
    schemaVersion: number
    exportedAt: number
    templates: Template[]
}

export function exportTemplates(templates: Template[]): TemplateExportData {
    return {
        schemaVersion: TEMPLATE_EXPORT_SCHEMA_VERSION,
        exportedAt: Date.now(),
        templates,
    }
}

export function validateImportData(data: unknown): {
    valid: boolean
    error?: string
} {
    if (!data || typeof data !== "object") {
        return { valid: false, error: "Invalid data: expected an object" }
    }

    const obj = data as Record<string, unknown>

    if (typeof obj.schemaVersion !== "number") {
        return { valid: false, error: "Missing or invalid schemaVersion" }
    }

    if (!Array.isArray(obj.templates)) {
        return { valid: false, error: "Missing or invalid templates array" }
    }

    for (let i = 0; i < obj.templates.length; i++) {
        const t = obj.templates[i]
        if (!t || typeof t !== "object") {
            return {
                valid: false,
                error: `Template at index ${i} is not an object`,
            }
        }
        const template = t as Record<string, unknown>
        if (typeof template.prompt !== "string" || !template.prompt.trim()) {
            return {
                valid: false,
                error: `Template at index ${i} has missing or empty prompt`,
            }
        }
        if (typeof template.title !== "string" || !template.title.trim()) {
            return {
                valid: false,
                error: `Template at index ${i} has missing or empty title`,
            }
        }
    }

    return { valid: true }
}

export async function importTemplates(
    templates: Template[],
    existingTemplates: Template[],
): Promise<{ imported: number; skipped: number }> {
    const signal = currentNimiSessionSignal()
    let imported = 0
    let skipped = 0

    const existingKeys = new Set(
        existingTemplates.map((t) => `${t.title}|||${t.prompt}`),
    )

    for (const t of templates) {
        signal.throwIfAborted()
        const key = `${t.title}|||${t.prompt}`
        if (existingKeys.has(key)) {
            skipped++
            continue
        }

        const now = Date.now()
        const newTemplate: Template = {
            id: nanoid(),
            title:
                String(t.title || "").trim() ||
                generateDefaultTitle(String(t.prompt || "")),
            prompt: String(t.prompt || "").trim(),
            description: t.description ? String(t.description) : undefined,
            createdAt: typeof t.createdAt === "number" ? t.createdAt : now,
            updatedAt: now,
            clickCount: typeof t.clickCount === "number" ? t.clickCount : 0,
            runCount: typeof t.runCount === "number" ? t.runCount : 0,
            lastUsedAt: typeof t.lastUsedAt === "number" ? t.lastUsedAt : 0,
            pinned: typeof t.pinned === "boolean" ? t.pinned : false,
        }
        try {
            await writeDocument("templates", newTemplate.id, newTemplate)
            existingKeys.add(key)
            imported++
        } catch (error) {
            signal.throwIfAborted()
            throw new Error(
                `Imported ${imported} template(s) before storage failed: ${error instanceof Error ? error.message : String(error)}`,
            )
        }
    }

    return { imported, skipped }
}
