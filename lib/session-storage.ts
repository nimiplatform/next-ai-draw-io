import { nanoid } from "nanoid"
import {
    listDocuments,
    readDocument,
    removeDocument,
    writeDocument,
} from "./nimi/documents"

const MAX_SESSIONS = 50

// Types
export interface ChatSession {
    id: string
    title: string
    createdAt: number
    updatedAt: number
    messages: StoredMessage[]
    xmlSnapshots: [number, string][]
    diagramXml: string
    thumbnailDataUrl?: string // Small PNG preview of the diagram
    diagramHistory?: { svg: string; xml: string }[] // Version history of diagram edits
}

export interface StoredMessage {
    id: string
    role: "user" | "assistant" | "system"
    parts: Array<{ type: string; [key: string]: unknown }>
    metadata?: unknown
}

export interface SessionMetadata {
    id: string
    title: string
    createdAt: number
    updatedAt: number
    messageCount: number
    hasDiagram: boolean
    thumbnailDataUrl?: string
}

export function isStorageAvailable(): boolean {
    return typeof window !== "undefined" && !!window.electronAPI
}

export async function getAllSessionMetadata(): Promise<SessionMetadata[]> {
    const sessions = await listDocuments<ChatSession>("sessions")
    return sessions
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((s) => ({
            id: s.id,
            title: s.title,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            messageCount: s.messages.length,
            hasDiagram: !!s.diagramXml?.trim(),
            thumbnailDataUrl: s.thumbnailDataUrl,
        }))
}

export async function getSession(id: string): Promise<ChatSession | null> {
    return readDocument<ChatSession>("sessions", id)
}

export async function saveSession(session: ChatSession): Promise<boolean> {
    await writeDocument("sessions", session.id, session)
    return true
}

export async function deleteSession(id: string): Promise<void> {
    await removeDocument("sessions", id)
}

export async function getSessionCount(): Promise<number> {
    return (await getAllSessionMetadata()).length
}

export async function deleteOldestSession(): Promise<void> {
    const sessions = await getAllSessionMetadata()
    const oldest = sessions.at(-1)
    if (oldest) await deleteSession(oldest.id)
}

export async function enforceSessionLimit(): Promise<void> {
    const sessions = await getAllSessionMetadata()
    for (const session of sessions.slice(MAX_SESSIONS))
        await deleteSession(session.id)
}

// Helper: Create a new empty session
export function createEmptySession(): ChatSession {
    return {
        id: nanoid(),
        title: "New Chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        xmlSnapshots: [],
        diagramXml: "",
    }
}

// Helper: Extract title from first user message (truncated to reasonable length)
const MAX_TITLE_LENGTH = 100

export function extractTitle(messages: StoredMessage[]): string {
    const firstUserMessage = messages.find((m) => m.role === "user")
    if (!firstUserMessage) return "New Chat"

    const textPart = firstUserMessage.parts.find((p) => p.type === "text")
    if (!textPart || typeof textPart.text !== "string") return "New Chat"

    const text = textPart.text.trim()
    if (!text) return "New Chat"

    // Truncate long titles
    if (text.length > MAX_TITLE_LENGTH) {
        return text.slice(0, MAX_TITLE_LENGTH).trim() + "..."
    }
    return text
}

// Helper: Sanitize UIMessage to StoredMessage
export function sanitizeMessage(message: unknown): StoredMessage | null {
    if (!message || typeof message !== "object") return null

    const msg = message as Record<string, unknown>
    if (!msg.id || !msg.role) return null

    const role = msg.role as string
    if (!["user", "assistant", "system"].includes(role)) return null

    // Extract parts, removing streaming state artifacts
    let parts: Array<{ type: string; [key: string]: unknown }> = []
    if (Array.isArray(msg.parts)) {
        parts = msg.parts.map((part: unknown) => {
            if (!part || typeof part !== "object") return { type: "unknown" }
            const p = part as Record<string, unknown>
            // Remove streaming-related fields
            const { isStreaming, streamingState, ...cleanPart } = p
            return cleanPart as { type: string; [key: string]: unknown }
        })
    }

    return {
        id: msg.id as string,
        role: role as "user" | "assistant" | "system",
        parts,
        ...(msg.metadata === undefined ? {} : { metadata: msg.metadata }),
    }
}

export function sanitizeMessages(messages: unknown[]): StoredMessage[] {
    return messages
        .map(sanitizeMessage)
        .filter((m): m is StoredMessage => m !== null)
}
