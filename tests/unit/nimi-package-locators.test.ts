import path from "node:path"
import { describe, expect, it } from "vitest"
import { rebaseLocalPackagePaths } from "../../scripts/nimi-package-locators.mjs"

describe("production staging local package provenance", () => {
    it("retains tarball targets in overrides, importer values, and complete peer keys", () => {
        const source = path.resolve("/workspace/apps/drawing")
        const stage = path.resolve("/separate-stage/app")
        const sdk = "file:../../candidates/sdk(candidate).tgz"
        const kit = "file:../../candidates/kit.tar.gz"
        const original = {
            overrides: { "@nimiplatform/sdk": sdk, "@nimiplatform/kit": kit },
            importers: {
                ".": {
                    dependencies: {
                        sdk: {
                            specifier: sdk,
                            version: `${sdk}(react@19.2.0)`,
                        },
                    },
                },
            },
            packages: {
                [`${kit}(@nimiplatform/sdk@${sdk})`]: {
                    resolution: { tarball: kit },
                },
            },
        }
        const expectedSDK = `file:${path
            .relative(stage, path.resolve(source, sdk.slice(5)))
            .split(path.sep)
            .join("/")}`
        const expectedKit = `file:${path
            .relative(stage, path.resolve(source, kit.slice(5)))
            .split(path.sep)
            .join("/")}`
        const result = rebaseLocalPackagePaths(original, source, stage)
        expect(result.overrides).toEqual({
            "@nimiplatform/sdk": expectedSDK,
            "@nimiplatform/kit": expectedKit,
        })
        expect(result.importers["."].dependencies.sdk).toEqual({
            specifier: expectedSDK,
            version: `${expectedSDK}(react@19.2.0)`,
        })
        expect(
            result.packages[`${expectedKit}(@nimiplatform/sdk@${expectedSDK})`],
        ).toEqual({ resolution: { tarball: expectedKit } })
        expect(original.overrides["@nimiplatform/sdk"]).toBe(sdk)
    })

    it("preserves registry dependencies and other workflow values", () => {
        const value = {
            packages: ["."],
            onlyBuiltDependencies: ["electron"],
            dependencies: { sdk: "^0.19.0" },
        }
        expect(
            rebaseLocalPackagePaths(value, "/workspace/app", "/stage/app"),
        ).toBe(value)
    })
})
