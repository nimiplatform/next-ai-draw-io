import {
    app,
    BrowserWindow,
    Menu,
    type MenuItemConstructorOptions,
    shell,
} from "electron"
import { getMenuTranslations, getPreferredLocale } from "./menu-i18n"

function showSettingsWindow(window?: BrowserWindow) {
    window?.webContents.send("drawio:open-settings")
}

/**
 * Build and set the application menu with i18n support
 */
export function buildAppMenu(): void {
    const template = getMenuTemplate()
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

/**
 * Rebuild the menu (call this when presets change or language changes)
 */
export function rebuildAppMenu(): void {
    buildAppMenu()
}

/**
 * Get the menu template with translations
 */
function getMenuTemplate(): MenuItemConstructorOptions[] {
    const isMac = process.platform === "darwin"

    // Get translations for preferred locale (saved preference or system default)
    const locale = getPreferredLocale(app.getLocale())
    const t = getMenuTranslations(locale)

    const template: MenuItemConstructorOptions[] = []

    // macOS app menu
    if (isMac) {
        template.push({
            label: app.name,
            submenu: [
                { role: "about" }, // System-translated
                { type: "separator" },
                {
                    label: t.settings,
                    accelerator: "CmdOrCtrl+,",
                    click: () => {
                        const win = BrowserWindow.getFocusedWindow()
                        showSettingsWindow(win || undefined)
                    },
                },
                { type: "separator" },
                { role: "services" }, // System-translated
                { type: "separator" },
                { role: "hide" }, // System-translated
                { role: "hideOthers" }, // System-translated
                { role: "unhide" }, // System-translated
                { type: "separator" },
                { role: "quit" }, // System-translated
            ],
        })
    }

    // File menu
    template.push({
        label: t.file,
        submenu: [
            ...(isMac
                ? []
                : [
                      {
                          label: t.settings,
                          accelerator: "CmdOrCtrl+,",
                          click: () => {
                              const win = BrowserWindow.getFocusedWindow()
                              showSettingsWindow(win || undefined)
                          },
                      },
                      { type: "separator" } as MenuItemConstructorOptions,
                  ]),
            isMac ? { role: "close" } : { role: "quit" }, // System-translated
        ],
    })

    // Edit menu
    template.push({
        label: t.edit,
        submenu: [
            { role: "undo" }, // System-translated
            { role: "redo" }, // System-translated
            { type: "separator" },
            { role: "cut" }, // System-translated
            { role: "copy" }, // System-translated
            { role: "paste" }, // System-translated
            ...(isMac
                ? [
                      {
                          role: "pasteAndMatchStyle",
                      } as MenuItemConstructorOptions, // System-translated
                      { role: "delete" } as MenuItemConstructorOptions, // System-translated
                      { role: "selectAll" } as MenuItemConstructorOptions, // System-translated
                  ]
                : [
                      { role: "delete" } as MenuItemConstructorOptions, // System-translated
                      { type: "separator" } as MenuItemConstructorOptions,
                      { role: "selectAll" } as MenuItemConstructorOptions, // System-translated
                  ]),
        ],
    })

    // View menu
    template.push({
        label: t.view,
        submenu: [
            { role: "reload" }, // System-translated
            { role: "forceReload" }, // System-translated
            { role: "toggleDevTools" }, // System-translated
            { type: "separator" },
            { role: "resetZoom" }, // System-translated
            { role: "zoomIn" }, // System-translated
            { role: "zoomOut" }, // System-translated
            { type: "separator" },
            { role: "togglefullscreen" }, // System-translated
        ],
    })

    // Window menu
    template.push({
        label: t.window,
        submenu: [
            { role: "minimize" }, // System-translated
            { role: "zoom" }, // System-translated
            ...(isMac
                ? [
                      { type: "separator" } as MenuItemConstructorOptions,
                      { role: "front" } as MenuItemConstructorOptions, // System-translated
                  ]
                : [{ role: "close" } as MenuItemConstructorOptions]), // System-translated
        ],
    })

    // Help menu
    template.push({
        label: t.help,
        submenu: [
            {
                label: t.documentation,
                click: async () => {
                    await shell.openExternal(
                        "https://github.com/dayuanjiang/next-ai-draw-io",
                    )
                },
            },
            {
                label: t.reportIssue,
                click: async () => {
                    await shell.openExternal(
                        "https://github.com/nimiplatform/next-ai-draw-io/issues",
                    )
                },
            },
        ],
    })

    return template
}
