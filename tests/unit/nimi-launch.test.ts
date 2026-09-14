import { describe, expect, it } from "vitest"
import {
    nextServerEnvironment,
    readDevelopmentRendererUrl,
} from "../../electron/main/nimi-launch"

describe("supervised Next Host boundary", () => {
    it("accepts the official exact loopback development URL and rejects remote or production overrides", () => {
        expect(
            readDevelopmentRendererUrl(
                ["--nimi-dev-renderer-url=http://127.0.0.1:6002"],
                false,
            ),
        ).toBe("http://127.0.0.1:6002")
        for (const value of [
            "https://example.com",
            "http://127.0.0.1:6002/en",
            "http://user@127.0.0.1:6002",
            "http://127.0.0.1:6002?x=1",
        ]) {
            expect(() =>
                readDevelopmentRendererUrl(
                    [`--nimi-dev-renderer-url=${value}`],
                    false,
                ),
            ).toThrow()
        }
        expect(() =>
            readDevelopmentRendererUrl(
                ["--nimi-dev-renderer-url=http://127.0.0.1:6002"],
                true,
            ),
        ).toThrow()
    })
    it("does not copy protected credentials or provider settings into the Next helper", () => {
        const env = nextServerEnvironment(13370, {
            PATH: "/usr/bin",
            NIMI_APP_SESSION: "secret",
            OPENAI_API_KEY: "secret",
            AI_PROVIDER: "openai",
            HOME: "/private/home",
            PORT: "4000",
        })
        expect(env).toEqual({
            PATH: "/usr/bin",
            NODE_ENV: "production",
            HOSTNAME: "127.0.0.1",
            PORT: "13370",
            NEXT_TELEMETRY_DISABLED: "1",
        })
    })
})
