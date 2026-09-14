# Next AI Draw.io

Create and edit diagrams with natural language and the draw.io canvas. This Nimi adaptation is based on [DayuanJiang/next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io), licensed under Apache-2.0.

Open the app through Nimi Desktop, enable its requested access, and choose a text model under **Nimi AI**. The selected model must support function tools; image replication and visual validation also need image input support.

Type a description to create a drawing. Continue the conversation to edit it, or change shapes directly on the canvas. The next AI edit uses your current drawing. Use Stop to cancel generation.

Attach PNG/JPEG/WebP images to recreate a diagram. PDF and text attachments are read into text before generation; PDFs need a text layer. The URL input extracts readable text from a web page and needs network access to that site.

Recent chats retain the conversation and drawing. The history button restores earlier diagram versions. Templates let you save, edit, pin, import and export reusable prompts.

Use Save to export drawio XML, PNG, SVG or editable SVG. Choose a destination in the system file dialog. Cancellation does not create a file or report success.

Conversations, templates, custom instructions and AI editing preferences use Nimi managed storage. Electron keeps display preferences and its browser cache in its ordinary user-data directory. Exported files remain at the locations you choose. Removing the Nimi package does not delete those user-selected exports or the App's OS preferences.

Connection or model failures are shown explicitly. Visual validation errors do not certify a drawing as valid. Configure or restore access in Nimi Desktop when prompted; a missing model capability cannot be replaced by a private provider connection.

The optional output token budget is empty by default, so Nimi uses its configured defaults. If you enter a budget, it is sent unchanged. A configuration that does not support this request control returns an error; the App keeps your setting for correction. It never retries by silently dropping the budget.
