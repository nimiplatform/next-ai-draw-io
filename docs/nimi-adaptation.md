# Next AI Draw.io — Nimi adaptation

This fork adapts [DayuanJiang/next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io), based on commit `027cd88c9088ad5b2d6deff4641dc47ded06afd2` (0.4.16). The original [Apache-2.0 license](../LICENSE), upstream identity and credits remain. The fork is [nimiplatform/next-ai-draw-io](https://github.com/nimiplatform/next-ai-draw-io). No App release or Registry submission has been performed.

## Current delivery status

The repository installs the fixed **public dependency matrix** below with a frozen pnpm lock. All temporary Nimi overrides have been removed, and package integrity values match public npm. `nimi-app check --production`, 78 tests, TypeScript and Biome checks pass. Mac production build/pack and the public-dependency supervised launch, actual drawing, save/reopen and reload regression also pass. The complete functional journeys were exercised in the actual Desktop-supervised App with matching development candidates; their sufficient evidence was reused for unchanged paths.

| macOS arm64 journey | Observed result |
| --- | --- |
| Framework, type checking and Electron compilation | PASS; Next.js retained; 78 tests in 9 files pass |
| Public-matrix production build/package | PASS; public production native included, `production-unsigned` posture |
| Official supervised launch, host-source rebuild and resume | PASS |
| Current App session and user display | Ready through the protected carrier |
| Cloud model listing, configuration save and reload | PASS after Kit projection repair |
| Real text generation and subsequent `edit_diagram` | PASS with codex/gpt-5.6-sol |
| Regenerate a response | PASS |
| Restore an earlier diagram, then reload | PASS after excluding empty initial snapshots |
| Template creation and reload | PASS |
| Manual XML input, canvas label edit, reload and Host-restart recovery | PASS |
| Native drawio, PNG, SVG and editable SVG exports | PASS through actual system save dialogs; output files inspected |
| Cancel native save | PASS; no file created |
| Text-file, PDF and image-to-diagram journeys | PASS with the real protected model and original inputs |
| PNG capture and visual-model validation | PASS after correcting the App capture callback to read the current canvas reference |
| Model cancellation | PASS; previous drawing retained and no automatic restart |
| Unsupported explicit budget and same-conversation recovery | PASS; the explicit setting is preserved, and a corrected request edits the existing drawing |
| Save and start a new conversation; reopen and reload | PASS, including the original conversation that previously hung |
| Abandoned asset write on renderer reload | PASS with Kit/native candidate 5; same-path SDK write/read and protected configuration reads remain responsive |
| Protected-session reconnect/account change | Host resume and persisted data verified; account switching NOT-VERIFIED |
| Public dependency conformance | PASS; normal installation, frozen lock and `check --production` |
| Public-dependency supervised launch/drawing/save regression | PASS; real PUBLIC INPUT → NIMI MODEL → SAVED drawing survives reopening and reload |
| Production installation and running | NOT-VERIFIED; current machine retains the source Runtime environment |

Windows x86_64 has an explicit build target and native-host guard. This Mac cannot establish Windows build or running acceptance: both are **NOT-VERIFIED**. Catalog admission, clean-machine installation and version-update acceptance have not been performed. A local development launch is not Catalog or installed-App evidence.

The official source-development launch uses the matching native carrier supplied by Desktop for its supervised `defaultApp` process. The App sets no carrier override or shared Runtime configuration. Production packaging instead embeds the public production native package in its fixed Resources location; that artifact cannot use the development branch as production-running evidence. The user chose to retain the current source environment, so production installation is explicitly outside the verified result on this machine.

The public regression generated exactly three connected nodes, then completed save-to-new-chat in 201 ms. Actual exported XML/SVG and screenshots confirmed all three nodes after reopening from Recent chats and after reload. The model configuration UI retained `codex / gpt-5.6-sol`. Its first driver attempt read the session URL before asynchronous autosave had finished; the continuation waited for the actual URL and repeated no AI call or product change. Both records remain under `.nimi/local/acceptance/public/`.

One real edit attempt returned `ai-provider-unavailable`; an explicit resubmission succeeded. Its cause remains unassigned. No automatic parameter-dropping retry or private provider connection was introduced.

A managed save of a roughly 56 KB conversation previously hung, preventing “Start fresh chat”; an additional protected AIConfig read also timed out. Manager traced this to a renderer write stream left open across reload and a blocking native renewal. Kit/native candidate 5 repaired the lifecycle. In the actual supervised App, an uncommitted write was abandoned by reload; the normal SDK then wrote and read back 56,659 bytes at the same independent acceptance path, read configuration, and removed the asset in 581 ms. The original affected conversation completed save-to-new-chat in 201 ms, followed by a 1.1 ms configuration read. No shared Runtime restart was used. The App also serializes writes to each document to preserve business ordering.

One buffered autosave log during reload reported `not-found`. Its timing is consistent with cancellation of the old document's unfinished stream, but that individual call was not fully correlated. Current-document save and data preservation passed. The App does not globally swallow this error or automatically retry it; a recurrence during normal saving without context replacement would be a new fault.

## Product and ownership map

| User task | Implementation and boundary |
| --- | --- |
| Generate and refine diagrams | Original `useChat`/AI SDK 6 UI and App-owned tool loop; a request-scoped `createNimiLocalAppVercelLanguageModel({ ai: client.ai })` uses the protected Nimi client |
| Draw and edit manually | Original draw.io iframe, XML validation, display/edit/append handlers and current-canvas context |
| Use cloud or specialized shapes | Original tool schemas and bundled `docs/shape-libraries`; a bounded Next read API supplies the documentation |
| Recreate an image / visually inspect a drawing | Actual image bytes are uploaded by the adapter to the same App's artifact API; Runtime interprets them. No image is substituted with text |
| Use PDFs, text files and URLs | Existing PDF/text extraction and App-owned Next URL extraction with SSRF protection; empty/unreadable inputs produce errors |
| Keep conversations, history and templates | Nimi scoped asset documents, including original image parts and complete message metadata |
| Custom instructions and AI editing preferences | Nimi scoped preferences; no prior account's business settings loaded from global browser storage |
| Theme, locale and panel preferences | Device-local presentation storage, disclosed in the manifest |
| Export drawings and templates | Fixed App commands through `invokeShell`; system file dialogs and actual filesystem writes |
| Select a model | Kit AIConfig UI with the current App owner, bounded options and whole-object overwrite |
| Account / protected access | Nimi Desktop and Runtime own the current session. Display identity is not an App business login ticket |

The original project has no end-user business account. Its hosted provider/admin/access-code setup was replaced by Nimi AIConfig. The original independent `packages/mcp-server` and its npm lock remain; this task does not publish or certify that separate package. The old mock-based browser tests are upstream references, not Nimi AI/access acceptance.

The Next.js App Router and actual local server remain. AI calls do not use the helper's HTTP routes: the existing UI protocol is handled in the protected renderer using the adapter. The helper receives a bounded non-secret environment, never Nimi credentials or a generic protected forwarding endpoint. It supplies rendering, shape libraries and non-AI web extraction.

The App preserves ordered tool calls/results and complete UI metadata. `providerMetadata.nimi` / `callProviderMetadata.nimi` carry opaque continuity; the App never decodes or displays it. Images are persisted as original input data rather than relying solely on transient Runtime artifact IDs. Failed/interrupted output is not certified as a drawing or a successful visual validation.

An empty output-budget setting uses Nimi's configured defaults. A user-supplied budget is forwarded unchanged for Runtime validation. Unsupported request controls return errors and the user's setting remains available for adjustment. The former unconditional provider default and provider-error-text budget fallback are retired.

## Versions and candidate provenance

The required starting command was run under Node 24.11.0:

```sh
npm exec --yes --package=@nimiplatform/app-tools@0.5.3 -- nimi-app --help
```

Its lifecycle/adapt/acceptance guides, version matrix, and matching SDK/Kit declarations and packaged code were read before adoption. Initial public components were SDK 0.12.0, Kit 0.8.0, App Tools 0.5.3 and nimi-coding 0.6.3. The selected package manager is pnpm 10.34.5.

Current public matrix (no automatic `latest` upgrade):

| Component | Locked version |
| --- | --- |
| `@nimiplatform/sdk` | 0.13.0 |
| `@nimiplatform/kit` | 0.9.0 |
| Kit protected-local native, macOS arm64 / Windows x86_64 | 0.9.0 |
| `@nimiplatform/sdk-adapter-vercel-ai` | 0.1.0 |
| `@nimiplatform/app-tools` | 0.6.1 |
| `@nimiplatform/nimi-coding` | 0.6.3, retained |

SDK, Kit/native, adapter and the initial App Tools 0.6.0 were released from Nimi commit [`889ee926d572ddbaf2550fd693f6292fd8889c40`](https://github.com/nimiplatform/nimi/commit/889ee926d572ddbaf2550fd693f6292fd8889c40), through [PR #146](https://github.com/nimiplatform/nimi/pull/146). App Tools 0.6.1 comes from [`625112565e8ed658a37c3355177b803ace72a1ba`](https://github.com/nimiplatform/nimi/commit/625112565e8ed658a37c3355177b803ace72a1ba), through [PR #147](https://github.com/nimiplatform/nimi/pull/147), and its public tarball SHA-1 is `9ab4a340ec7634b43531659f2c7d8a15250909b9`. The lock records each public package's SHA-512 integrity, including the Windows native package that is not executed on this Mac. Rust shell 0.5.0 is part of the matching platform cohort; this Electron App does not add a direct Rust shell dependency.

The first release-workflow rehearsal exposed formatting drift after commit: App Tools 0.6.0 rewrote `package.json` with two spaces while the App's Biome hook used four. App Tools 0.6.1 preserves the original text when managed values are unchanged and still repairs actual managed-field changes. This public patch is used without changing the App's formatter or bypassing the workflow's clean-tree check. The release matrix is being revalidated; previous business-journey evidence is unchanged.

Historical development candidates and their verification scope:

| Component | Version | Source / SHA-256 |
| --- | --- | --- |
| SDK candidate 4 | 0.13.0 | `e403c3a3b6f66e1f3d5c64047fb867fa280b27d7`; `747353a57869171eaa4802ef16d8762befe56747d5042b9cff4d1759d4c53fc5` |
| Kit candidate 5 | 0.9.0 | `1d5425e07fe05bc26b3addb5371324f1ec0a4c94`; `4c1dacadb2e3672b3b3c3c043e123397efae18f18b51e802150ac4cad6c6fa02` |
| macOS native candidate 5, source development | 0.9.0 | same source; `22bc4a8e79cf4640d74022eeb9faa875f93a0a78ec476ffb5591f124cfab2613` |
| Vercel AI adapter | 0.1.0 | cohort 1; `b49b7f87a4d3d9c4336449a2463513f8317730dd1cba6490d4b328052ce110c6` |
| App Tools candidate 2 | 0.6.0 | `e3479692e5f02699577a5401f623c788ada6d344`; `3b12d0011f667431c0f34ee1d6acaa2ce0aa705f7640c6a37550401a95d279ff` |
| nimi-coding | 0.6.3 | published package, unchanged |

Cohort 1 came from Nimi source base `52d96f999476b37f369f1a65da512c523b4bc972` plus uncommitted adaptation fixes. Earlier App Tools 0.5.3 candidate digests were `26c8ebd1aa9651ef96a3da1b44ce900d8c24f1b2a1cbee2dcaa050393f0c45eb` and `da26582072eea86ecda90a1a47127e475037b115950a150de397a002be40d53a`; candidate 2 enabled real adoption/check/build/package. Kit candidate 3 digest was `2213dbf18fbb61b8abd955c44255493c0cd55895612a97f74419fa334df4bb78`; it repaired cloud JSON and whitespace, before candidate 4 completed continuity events. Local delivered manifests and run output remain under `.nimi/local/`, not admission truth.

All candidate hashes were verified before installation. Candidate files were never edited in node_modules. The public transition removed every override, installed the published matrix, read its packaged migration notes and adapter guide, applied App Tools 0.6.0 sync with the exact project-local nimi-coding 0.6.3, and reinstalled using the frozen lock. The updated public adaptation guide documents the real Host source directory and existing AI SDK workflow. Next renderer/build commands and App-owned sources were preserved.

## Development and verification

The root project uses pnpm; its own workspace file prevents commands from accidentally adopting a parent workspace. The former npm lock is available in the upstream baseline commit. Core upstream resolved versions were retained: Next 16.2.6, React 19.2.8, AI SDK 6.0.100 and @ai-sdk/react 3.0.102.

`nimi.app.yaml` declares `renderer_origin: http://127.0.0.1:6002` and `host_source_directory: electron`. `.nimi/config/build-profile.yaml` uses `electron-pnpm` with real App-owned test/build commands. Init/sync created no fresh scaffold intent/lock and preserved the Next renderer and Host source.

```sh
pnpm install --frozen-lockfile
pnpm run build:electron
pnpm exec tsc --noEmit
pnpm run test:app
pnpm run check
pnpm dev
```

Use `pnpm exec nimi-app dev --list-registrations` and the returned explicit `--resume` selection to continue the same developer data. Selectors are temporary and must not be stored in the repository. Attach only to the App CDP reported by that launch, never Desktop's debugger.

```sh
NIMI_APP_CDP_ENDPOINT=http://127.0.0.1:THE_REPORTED_PORT pnpm run test:e2e
```

The live driver uses actual AI and exported XML/SVG, with no mock SSE or injected access. `--from=history`, `--from=text` or `--from=image` continues a bounded subset; earlier steps are explicitly recorded NOT-RUN. Distinct run directories preserve failures as well as successes. Native save dialogs, PDF, visual validation, cancellation/reconnect and installation have separate checks. Compilation of the driver is not a passed journey.

The formal public check/build/package commands used for this artifact are:

```sh
pnpm exec nimi-app check --production
pnpm exec nimi-app test
pnpm exec nimi-app build --target macos-aarch64 --production
pnpm exec nimi-app pack --target macos-aarch64 --production
```

All four pass. Biome exits successfully with 33 nonblocking warnings retained in existing App/MCP code. No App GitHub Release or Registry mutation is part of these local commands.

## Current Mac artifact

- App: `io.github.nimiplatform.next-ai-draw-io`, version `0.4.16`.
- Package: `dist/nimi-app/io.github.nimiplatform.next-ai-draw-io-0.4.16-macos-aarch64.nimiapp`.
- Size: **631,717,188 bytes**.
- SHA-256: `1eda1fb57ad47590fb2774c70abff4331d0fe02c8d87dcafa73ab0acb4e09ebd`.
- Adjacent `.target.json` and `.app-info.json` contain the target metadata and portable App information.
- Posture: `production-unsigned`; an ad-hoc integrity seal is present, Developer ID and notarization are absent.
- Installation/running with a production Runtime: **NOT-VERIFIED**. No Windows artifact was produced on this Mac.

## Packaging decisions

- The offline editor is fixed to jgraph/drawio v29.2.6, commit `5d9571b760174a8e69fa8f529213ba2765bee99e`. `prepare:drawio` checks that commit and preserves its LICENSE.
- pnpm uses hoisted layout because the upstream standalone-copy step materializes links. An isolated layout produced a real missing `@swc/helpers` startup; the corrected standalone server was started and checked over HTTP.
- Only SDK/Kit Host runtime dependencies are separately installed in app.asar. Renderer dependencies are bundled, and Next ships its traced standalone runtime. This removed redundant build/provider dependencies and reduced the initial Mac candidate from 1.46 GB to about 632 MB without removing user tasks.
- Native icons derive from the original PNG. The immutable helper serves original local images rather than writing an image-optimization cache into its installed package.
- Target commands explicitly request macOS arm64 or Windows x86_64 and reject a mismatched build host before work starts.
- Mac packaging uses the public native carrier and an ad-hoc integrity seal. Developer ID and notarization are absent; the actual tool-reported posture is `production-unsigned`. Passed packaging is not installed-App acceptance.

## Platform issues reported to manager

The real App exposed Vite-only renderer command assumptions, generic HTTP source-scan false positives, a non-production target-reporting gap, readiness rejection of a valid same-origin locale redirect, a hardcoded Host source directory with a misleading error, missing packaged SDK guidance, absent Local App image/framework adaptation, double conversion of cloud JSON, rejection of whitespace deltas, missing continuity event projection, and abandoned asset-stream lifecycle handling. Manager owns platform code and general guide repairs. The matching candidates passed their affected App journeys, and the published matrix passed the bounded App regression and production packaging. Installation acceptance remains separate.

App-specific fixes include correct Kit themes, the Electron-capable invoke API, sender-bound file dialogs, scoped business preferences, empty-input errors, cancellation guards, per-document write ordering and real history eligibility. These are not used to hide platform failures or substitute fake completion.

Additional candidate-4 evidence: text-file input preserved the non-prompt step labels; the image workflow recreated the supplied lamp-troubleshooting diagram; PDF extraction produced the required payment/shipping graph. VLM validation performed actual PNG input and showed a structured successful result. Stop retained the previous START/END drawing without applying the canceled request. An explicit 128-token override returned `ai-text-behavior-unsupported` and remained in settings; the App was reset to an empty budget afterward. App status/error rows are excluded from model history so they do not become late system instructions. Under candidate 5, a fresh Host continued that same failed conversation and added FINAL CHECK through a real `edit_diagram` call; all three nodes survived reopening and reload. Evidence is under `.nimi/local/acceptance/candidate5/`.
