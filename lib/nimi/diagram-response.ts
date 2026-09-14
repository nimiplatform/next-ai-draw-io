import {
    convertToModelMessages,
    InvalidToolInputError,
    isToolUIPart,
    type LanguageModel,
    stepCountIs,
    streamObject,
    streamText,
    type UIMessage,
} from "ai"
import { jsonrepair } from "jsonrepair"
import { getApiEndpoint } from "@/lib/base-path"
import { validateFileParts } from "@/lib/chat-helpers"
import { createDiagramTools } from "@/lib/diagram-tools"
import { getSystemPrompt } from "@/lib/system-prompts"
import { VALIDATION_SYSTEM_PROMPT } from "@/lib/validation-prompts"
import { ValidationResultSchema } from "@/lib/validation-schema"
import { currentNimiSessionSignal } from "./client"

export async function createDiagramChatResponse(
    request: Request,
    model: LanguageModel,
): Promise<Response> {
    const body = (await request.json()) as {
        messages: UIMessage[]
        xml?: string
        previousXml?: string
        customSystemMessage?: string
    }
    if (!Array.isArray(body.messages))
        return Response.json(
            { error: "Messages are required." },
            { status: 400 },
        )
    const validation = validateFileParts(body.messages)
    if (!validation.valid)
        return Response.json({ error: validation.error }, { status: 400 })
    const signal = AbortSignal.any([request.signal, currentNimiSessionSignal()])
    signal.throwIfAborted()
    const instructions = getSystemPrompt(
        "Nimi",
        request.headers.get("x-minimal-style") === "true",
    )
    const system = `${instructions}${body.customSystemMessage ? `\n\n## Custom instructions\n${body.customSystemMessage.slice(0, 5000)}` : ""}

${body.previousXml ? `Previous diagram XML before the last user message:\n${body.previousXml}\n\n` : ""}
Current diagram XML (AUTHORITATIVE, including manual user edits):
\`\`\`xml
${body.xml || ""}
\`\`\`
Use the CURRENT XML as the source of truth for every edit, cell ID and shape count. The user can manually change the drawing between messages.`
    // System-role UI rows are App status/error notices. The user's custom
    // instructions already belong to the single explicit system prompt above.
    const history = body.messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
            ...message,
            parts: message.parts.filter(
                (part) =>
                    !(
                        isToolUIPart(part) &&
                        part.state === "output-error" &&
                        part.errorText === "Stopped by user" &&
                        part.input == null
                    ),
            ),
        }))
        .filter((message) => message.parts.length > 0)
    const messages = await convertToModelMessages(history, {
        ignoreIncompleteToolCalls: true,
    })
    const requestedBudget = request.headers.get("x-max-output-tokens")
    const maxOutputTokens = requestedBudget
        ? Number(requestedBudget)
        : undefined
    if (
        maxOutputTokens !== undefined &&
        (!Number.isSafeInteger(maxOutputTokens) ||
            maxOutputTokens < 1 ||
            maxOutputTokens > 200000)
    ) {
        return Response.json(
            {
                error: "Output token budget must be a positive integer no greater than 200000.",
            },
            { status: 400 },
        )
    }
    const result = streamText({
        model,
        system,
        messages,
        ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
        abortSignal: signal,
        stopWhen: stepCountIs(5),
        tools: createDiagramTools(async (name) => {
            signal.throwIfAborted()
            const response = await fetch(
                getApiEndpoint(
                    `/api/shape-library?name=${encodeURIComponent(name.toLowerCase())}`,
                ),
                { signal },
            )
            if (!response.ok)
                throw new Error(
                    `Shape library could not be loaded (${response.status}).`,
                )
            return response.text()
        }),
        experimental_repairToolCall: async ({ toolCall, error }) => {
            if (!(error instanceof InvalidToolInputError)) return null
            try {
                return { ...toolCall, input: jsonrepair(toolCall.input) }
            } catch {
                return null
            }
        },
    })
    return result.toUIMessageStreamResponse({
        sendReasoning: true,
        onError: (error) =>
            error instanceof Error
                ? error.message
                : "Nimi could not complete the drawing request.",
    })
}

export async function createDiagramValidationResponse(
    request: Request,
    model: LanguageModel,
): Promise<Response> {
    const { imageData } = (await request.json()) as { imageData?: string }
    if (
        typeof imageData !== "string" ||
        !/^data:image\/(png|jpeg|webp);base64,/.test(imageData)
    ) {
        return Response.json(
            {
                error: "A PNG, JPEG or WebP image is required for visual validation.",
            },
            { status: 400 },
        )
    }
    const result = streamObject({
        model,
        schema: ValidationResultSchema,
        system: VALIDATION_SYSTEM_PROMPT,
        messages: [
            {
                role: "user",
                content: [
                    { type: "image", image: imageData },
                    {
                        type: "text",
                        text: "Analyze this drawing for visual quality issues.",
                    },
                ],
            },
        ],
        abortSignal: AbortSignal.any([
            request.signal,
            currentNimiSessionSignal(),
            AbortSignal.timeout(60000),
        ]),
    })
    return result.toTextStreamResponse()
}
