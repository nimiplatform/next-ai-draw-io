"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { z } from "zod"
import { currentNimiSessionSignal } from "@/lib/nimi/client"
import { readDocument, writeDocument } from "@/lib/nimi/documents"

const schema = z.strictObject({
    customSystemMessage: z.string().max(5000),
    maxOutputTokens: z.string().regex(/^\d*$/),
    vlmValidationEnabled: z.boolean(),
})
type Preferences = z.infer<typeof schema>
const defaults: Preferences = {
    customSystemMessage: "",
    maxOutputTokens: "",
    vlmValidationEnabled: false,
}

export function useNimiEditorPreferences() {
    const signal = useRef(currentNimiSessionSignal()).current
    const [preferences, setPreferences] = useState<Preferences>(defaults)
    const [ready, setReady] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const saved = useRef("")
    const current = useRef(preferences)
    current.current = preferences
    const pending = useRef<Promise<void>>(Promise.resolve())

    const load = useCallback(async () => {
        try {
            const document = await readDocument<unknown>(
                "preferences",
                "editor",
            )
            signal.throwIfAborted()
            const value =
                document === null ? { ...defaults } : schema.parse(document)
            saved.current = JSON.stringify(value)
            setPreferences(value)
            setReady(true)
            setError(null)
        } catch (error) {
            if (!signal.aborted)
                setError(
                    error instanceof Error
                        ? error.message
                        : "Could not load drawing preferences.",
                )
        }
    }, [signal])
    useEffect(() => {
        void load()
    }, [load])

    const save = useCallback(
        (value: Preferences) => {
            const write = pending.current.then(async () => {
                signal.throwIfAborted()
                await writeDocument(
                    "preferences",
                    "editor",
                    schema.parse(value),
                )
                signal.throwIfAborted()
                saved.current = JSON.stringify(value)
                setError(null)
            })
            pending.current = write.catch((error) => {
                if (!signal.aborted)
                    setError(
                        error instanceof Error
                            ? error.message
                            : "Could not save drawing preferences.",
                    )
            })
            return pending.current
        },
        [signal],
    )
    useEffect(() => {
        if (!ready || JSON.stringify(preferences) === saved.current) return
        const timer = setTimeout(() => {
            void save(preferences)
        }, 500)
        return () => clearTimeout(timer)
    }, [ready, preferences, save])

    return {
        preferences,
        ready,
        error,
        update: useCallback(
            (patch: Partial<Preferences>) =>
                setPreferences((value) => ({ ...value, ...patch })),
            [],
        ),
        retry: () => (ready ? save(current.current) : load()),
    }
}
