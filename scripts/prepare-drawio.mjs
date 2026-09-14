import { spawnSync } from "node:child_process"
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

const commit = "5d9571b760174a8e69fa8f529213ba2765bee99e" // jgraph/drawio v29.2.6
const destination = path.resolve("public/drawio")
try {
    if (
        (
            await readFile(
                path.join(destination, "nimi-upstream-commit.txt"),
                "utf8",
            )
        ).trim() === commit
    )
        process.exit(0)
} catch (error) {
    if (error.code !== "ENOENT") throw error
}
const checkout = path.resolve(".nimi/local/drawio-source")
await rm(checkout, { recursive: true, force: true })
await mkdir(path.dirname(checkout), { recursive: true })
function git(args) {
    const result = spawnSync("git", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    })
    if (result.status !== 0)
        throw new Error(
            result.stderr ||
                result.error?.message ||
                "Draw.io source checkout failed",
        )
    return result.stdout.trim()
}
git([
    "clone",
    "--depth",
    "1",
    "--branch",
    "v29.2.6",
    "https://github.com/jgraph/drawio.git",
    checkout,
])
if (git(["-C", checkout, "rev-parse", "HEAD"]) !== commit)
    throw new Error("Draw.io tag does not match the pinned commit")
await rm(destination, { recursive: true, force: true })
await cp(path.join(checkout, "src/main/webapp"), destination, {
    recursive: true,
})
await rm(path.join(destination, "WEB-INF"), { recursive: true, force: true })
await rm(path.join(destination, "META-INF"), { recursive: true, force: true })
await cp(path.join(checkout, "LICENSE"), path.join(destination, "LICENSE"))
await writeFile(
    path.join(destination, "nimi-upstream-commit.txt"),
    `${commit}\n`,
)
console.log("Bundled jgraph/drawio v29.2.6 at the verified commit.")
