/** Only fixed App events and platform display are exposed by the preload. */
declare global {
    interface Window {
        electronAPI?: {
            platform: NodeJS.Platform
            isElectron: boolean
            onSessionInvalidated: (callback: () => void) => () => void
            onOpenSettings: (callback: () => void) => () => void
        }
    }
}

export {}
