// Device-local presentation preferences. Drawing data and AI editing preferences
// use the current protected Nimi storage scope.
export const STORAGE_KEYS = {
    sendShortcut: "next-ai-draw-io-send-shortcut",
    showRecentChats: "next-ai-draw-io-show-recent-chats",
    showMyTemplates: "next-ai-draw-io-show-my-templates",
    showQuickExamples: "next-ai-draw-io-show-quick-examples",
} as const
