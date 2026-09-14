// Preserve the upstream PNG artwork in the platform's native icon containers.
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

export async function prepareNativeIcons(appRoot) {
    const directory = path.join(appRoot, ".nimi/local/native-icons")
    await mkdir(directory, { recursive: true })
    const source = await readFile(path.join(appRoot, "resources/icon.png"))
    const icon256 = await sharp(source).resize(256, 256).png().toBuffer()
    const icoHeader = Buffer.alloc(22)
    icoHeader.writeUInt16LE(1, 2)
    icoHeader.writeUInt16LE(1, 4)
    icoHeader.writeUInt16LE(1, 10)
    icoHeader.writeUInt16LE(32, 12)
    icoHeader.writeUInt32LE(icon256.length, 14)
    icoHeader.writeUInt32LE(22, 18)
    const ico = path.join(directory, "app.ico")
    await writeFile(ico, Buffer.concat([icoHeader, icon256]))

    const chunks = []
    for (const [type, size] of [
        ["ic07", 128],
        ["ic08", 256],
        ["ic09", 512],
    ]) {
        const png = await sharp(source).resize(size, size).png().toBuffer()
        const header = Buffer.alloc(8)
        header.write(type)
        header.writeUInt32BE(png.length + 8, 4)
        chunks.push(header, png)
    }
    const header = Buffer.alloc(8)
    header.write("icns")
    header.writeUInt32BE(
        8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0),
        4,
    )
    const icns = path.join(directory, "app.icns")
    await writeFile(icns, Buffer.concat([header, ...chunks]))
    return { ico, icns }
}
