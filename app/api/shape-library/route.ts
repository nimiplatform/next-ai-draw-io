import { readFile } from "node:fs/promises"
import path from "node:path"

export async function GET(request: Request): Promise<Response> {
    const library = new URL(request.url).searchParams.get("name") || ""
    if (!/^[a-z0-9_-]{1,64}$/.test(library))
        return Response.json(
            { error: "Invalid shape library name." },
            { status: 400 },
        )
    try {
        const content = await readFile(
            path.join(process.cwd(), "docs/shape-libraries", `${library}.md`),
            "utf8",
        )
        return new Response(content, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT")
            return Response.json(
                { error: `Shape library ${library} was not found.` },
                { status: 404 },
            )
        throw error
    }
}
