"use client"

import { usePathname } from "next/navigation"
import { type ReactNode, useEffect, useState } from "react"
import { DiagramProvider } from "@/contexts/diagram-context"
import { useDictionary } from "@/hooks/use-dictionary"
import { getNimiClient, invalidateNimiSession } from "@/lib/nimi/client"

export function NimiSessionBoundary({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const dict = useDictionary()
    const [ready, setReady] = useState(false)
    const [epoch, setEpoch] = useState(0)
    const [detail, setDetail] = useState("Connecting to Nimi…")
    useEffect(() => {
        let active = true
        let pending = false
        let wasReady = false
        let revision = 0
        const update = async () => {
            if (pending) return
            pending = true
            const requestRevision = revision
            try {
                const status = await getNimiClient().auth.status()
                if (!active || requestRevision !== revision) return
                if (wasReady && !status.sessionBound) {
                    invalidateNimiSession()
                    setEpoch((value) => value + 1)
                }
                wasReady = status.sessionBound
                setReady(status.sessionBound)
                setDetail(
                    status.sessionBound
                        ? ""
                        : `${status.reasonCode} · ${status.actionHint}`,
                )
            } catch (error) {
                if (!active || requestRevision !== revision) return
                setReady(false)
                setDetail(
                    error instanceof Error ? error.message : String(error),
                )
            } finally {
                pending = false
            }
        }
        const unsubscribe = window.electronAPI?.onSessionInvalidated(() => {
            revision += 1
            wasReady = false
            invalidateNimiSession()
            sessionStorage.removeItem("next-ai-draw-io-input")
            setReady(false)
            setEpoch((value) => value + 1)
            void update()
        })
        void update()
        const timer = setInterval(update, 2000)
        return () => {
            active = false
            clearInterval(timer)
            unsubscribe?.()
        }
    }, [])

    const content =
        !pathname.includes("/about") && !ready ? (
            <main className="flex min-h-screen items-center justify-center bg-background p-8">
                <div className="max-w-lg space-y-4">
                    <h1 className="text-2xl font-semibold">
                        {dict.nimi.connectTitle}
                    </h1>
                    <p>{dict.nimi.connectDescription}</p>
                    <p className="text-sm text-muted-foreground">
                        {dict.nimi.storageNotice}
                    </p>
                    <details className="text-xs break-words">
                        <summary>{dict.nimi.connectionDetails}</summary>
                        {detail}
                    </details>
                </div>
            </main>
        ) : (
            children
        )
    return <DiagramProvider key={epoch}>{content}</DiagramProvider>
}
