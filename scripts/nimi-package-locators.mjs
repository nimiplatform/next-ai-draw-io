import path from "node:path"

/** Preserve complete local package locators when a production stage moves. */
export function rebaseLocalPackagePaths(value, sourceDir, targetDir) {
    const replacements = new Map()
    const collect = (item) => {
        if (
            typeof item === "string" &&
            /^file:[^\r\n]+\.(?:tgz|tar\.gz)$/u.test(item)
        ) {
            replacements.set(
                item,
                `file:${path
                    .relative(targetDir, path.resolve(sourceDir, item.slice(5)))
                    .split(path.sep)
                    .join("/")}`,
            )
        } else if (Array.isArray(item)) item.forEach(collect)
        else if (item && typeof item === "object")
            Object.values(item).forEach(collect)
    }
    collect(value)
    if (!replacements.size) return value
    const pattern = new RegExp(
        [...replacements.keys()]
            .sort((a, b) => b.length - a.length)
            .map((locator) => locator.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
            .join("|"),
        "gu",
    )
    const rebase = (text) =>
        text.replace(pattern, (locator) => replacements.get(locator))
    const rewrite = (item) => {
        if (typeof item === "string") return rebase(item)
        if (Array.isArray(item)) return item.map(rewrite)
        if (item && typeof item === "object")
            return Object.fromEntries(
                Object.entries(item).map(([key, child]) => [
                    rebase(key),
                    rewrite(child),
                ]),
            )
        return item
    }
    return rewrite(value)
}
