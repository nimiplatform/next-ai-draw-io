import { renderHook } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import { useDiagramToolHandlers } from "../../hooks/use-diagram-tool-handlers"

it("does not apply an edit or report success after the user cancels while the canvas export is pending", async () => {
    const controller = new AbortController()
    let resolveExport: (value: string) => void = () => {
        throw new Error("Export was not started")
    }
    const pendingExport = new Promise<string>((resolve) => {
        resolveExport = resolve
    })
    const display = vi.fn(() => null)
    const output = vi.fn()
    const { result } = renderHook(() =>
        useDiagramToolHandlers({
            operationSignal: controller.signal,
            partialXmlRef: { current: "" },
            editDiagramOriginalXmlRef: { current: new Map() },
            chartXMLRef: { current: "" },
            onDisplayChart: display,
            onFetchChart: () => pendingExport,
            onExport: vi.fn(),
            enableVlmValidation: false,
        }),
    )
    const editing = result.current.handleToolCall(
        {
            toolCall: {
                toolCallId: "edit-1",
                toolName: "edit_diagram",
                input: { operations: [{ operation: "delete", cell_id: "2" }] },
            },
        },
        output,
    )
    controller.abort(new Error("Stopped by user"))
    resolveExport(
        '<mxfile><diagram><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>',
    )
    await expect(editing).rejects.toThrow("Stopped by user")
    expect(display).not.toHaveBeenCalled()
    expect(output).not.toHaveBeenCalled()
})
