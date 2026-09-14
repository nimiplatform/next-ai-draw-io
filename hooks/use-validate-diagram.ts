"use client"

/**
 * Hook for VLM-based diagram validation using AI SDK's useObject.
 */

import { experimental_useObject as useObject } from "@ai-sdk/react"
import { useCallback, useEffect, useRef } from "react"
import { getApiEndpoint } from "@/lib/base-path"
import { nimiAIFetch } from "@/lib/nimi/ai-fetch"
import {
    type ValidationResult,
    ValidationResultSchema,
} from "@/lib/validation-schema"

export type { ValidationResult }

interface UseValidateDiagramOptions {
    onSuccess?: (result: ValidationResult) => void
    onError?: (error: Error) => void
}

// Track pending validation promises for imperative API
type PendingValidation = {
    resolve: (result: ValidationResult) => void
    reject: (error: Error) => void
}

export function useValidateDiagram(options: UseValidateDiagramOptions = {}) {
    const { onSuccess, onError } = options
    const pendingValidationRef = useRef<PendingValidation | null>(null)

    const {
        object,
        submit,
        isLoading,
        error,
        stop: stopStream,
    } = useObject({
        api: getApiEndpoint("/api/validate-diagram"),
        fetch: nimiAIFetch,
        schema: ValidationResultSchema,
        onFinish: ({
            object,
            error: finishError,
        }: {
            object: ValidationResult | undefined
            error: Error | undefined
        }) => {
            if (finishError) {
                console.error(
                    "[useValidateDiagram] Validation error:",
                    finishError,
                )
                onError?.(finishError)
                pendingValidationRef.current?.reject(finishError)
                pendingValidationRef.current = null
                return
            }

            if (object) {
                const result = object as ValidationResult
                onSuccess?.(result)
                pendingValidationRef.current?.resolve(result)
                pendingValidationRef.current = null
            } else {
                pendingValidationRef.current?.reject(
                    new Error("Visual validation returned no result."),
                )
                pendingValidationRef.current = null
            }
        },
        onError: (err: Error) => {
            console.error("[useValidateDiagram] Stream error:", err)
            onError?.(err)
            pendingValidationRef.current?.reject(err)
            pendingValidationRef.current = null
        },
    })

    const stop = useCallback(() => {
        stopStream()
        pendingValidationRef.current?.reject(
            new Error("Visual validation was canceled."),
        )
        pendingValidationRef.current = null
    }, [stopStream])
    useEffect(() => () => stop(), [stop])

    /**
     * Validate a diagram image.
     * Returns a promise that resolves with the validation result.
     */
    const validate = useCallback(
        async (
            imageData: string,
            sessionId?: string,
        ): Promise<ValidationResult> => {
            // Reject any pending validation to prevent promise leaks
            if (pendingValidationRef.current) {
                stopStream()
                pendingValidationRef.current.reject(
                    new Error("Validation superseded by new request"),
                )
                pendingValidationRef.current = null
            }

            return new Promise((resolve, reject) => {
                // Store the promise handlers
                pendingValidationRef.current = { resolve, reject }

                // Submit the validation request
                submit({ imageData, sessionId })
            })
        },
        [submit, stopStream],
    )

    return {
        // Validation functions
        validate,
        stop,

        // State
        isValidating: isLoading,
        partialResult: object as ValidationResult | undefined,
        error,
    }
}
