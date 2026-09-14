import { createNimiLocalAppVercelLanguageModel } from "@nimiplatform/sdk-adapter-vercel-ai"
import { getNimiClient } from "./client"
import {
    createDiagramChatResponse,
    createDiagramValidationResponse,
} from "./diagram-response"

/** Bridge the existing AI SDK UI protocol to the protected, request-scoped Nimi model. */
export const nimiAIFetch: typeof fetch = async (input, init) => {
    const source = input instanceof Request ? input.url : String(input)
    const url = new URL(source, window.location.href)
    const request = new Request(input instanceof Request ? input : url, init)
    if (url.origin !== window.location.origin || request.method !== "POST") {
        throw new Error("Unsupported drawing AI request.")
    }
    const model = createNimiLocalAppVercelLanguageModel({
        ai: getNimiClient().ai,
    })
    try {
        if (url.pathname.endsWith("/api/chat"))
            return await createDiagramChatResponse(request, model)
        if (url.pathname.endsWith("/api/validate-diagram"))
            return await createDiagramValidationResponse(request, model)
        throw new Error("Unknown drawing AI operation.")
    } catch (error) {
        if (request.signal.aborted) throw error
        return Response.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 },
        )
    }
}
