"use client"
import { ModelConfigAIConfigSurface } from "@nimiplatform/kit/features/model-config/ui"
import { asNimiError, type NimiAIConfigSnapshot } from "@nimiplatform/sdk"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useDictionary } from "@/hooks/use-dictionary"
import { currentNimiSessionSignal, getNimiClient } from "@/lib/nimi/client"

export function NimiModelConfig({
    open,
    onOpenChange,
}: {
    open: boolean
    onOpenChange: (value: boolean) => void
}) {
    const dict = useDictionary()
    const pathname = usePathname()
    const [snapshot, setSnapshot] = useState<NimiAIConfigSnapshot | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const refresh = async () => {
        const signal = currentNimiSessionSignal()
        setLoading(true)
        setError(null)
        try {
            const result = await getNimiClient().aiConfig.get()
            signal.throwIfAborted()
            setSnapshot(result)
        } catch (error) {
            setError(error instanceof Error ? error.message : String(error))
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        if (open) void refresh()
    }, [open])
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{dict.nimi.models}</DialogTitle>
                </DialogHeader>
                <ModelConfigAIConfigSurface
                    context={{
                        owner: "app-ai-config",
                        appId: "io.github.nimiplatform.next-ai-draw-io",
                    }}
                    capabilityContracts={["text.generate"]}
                    language={pathname.split("/")[1]}
                    initialCapabilityContract="text.generate"
                    capabilities={
                        snapshot?.config
                            ? snapshot.config.capabilities
                            : snapshot
                              ? null
                              : undefined
                    }
                    revision={snapshot?.revision}
                    effectiveSelections={snapshot?.effectiveSelections}
                    listOptions={async (query) => {
                        try {
                            return await getNimiClient().aiConfig.listOptions(
                                query,
                            )
                        } catch (error) {
                            const detail = asNimiError(error)
                            setError(`${detail.message} (${detail.reasonCode})`)
                            console.error("Nimi model options failed", {
                                kind: query.kind,
                                reasonCode: detail.reasonCode,
                                message: detail.message,
                                actionHint: detail.actionHint,
                            })
                            throw error
                        }
                    }}
                    loading={loading}
                    loadError={error}
                    onRetry={() => {
                        void refresh()
                    }}
                    onOverwrite={async (input) => {
                        const signal = currentNimiSessionSignal()
                        const result =
                            await getNimiClient().aiConfig.overwrite(input)
                        signal.throwIfAborted()
                        await refresh()
                        return result
                    }}
                />
            </DialogContent>
        </Dialog>
    )
}
