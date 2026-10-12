# 0.4.22 — Windows candidate (unreleased)

Uses public SDK 0.21.0, Kit/native 0.19.3 and App Tools 0.12.2. Production builds use Next's supported webpack compiler after reproducing the Windows Turbopack Google-font query failure. The original Next.js renderer, draw.io canvas and diagram tools remain intact. Windows supervised AI creation, label editing and real draw.io XML export passed. This candidate has not been published or installed through the Catalog.

# Nimi release 0.4.21 — Source Runtime support for Catalog Apps

Updates the frozen public npm dependency to Kit/native 0.19.2. The installed App keeps its published native carrier and can connect to a source-development Runtime when launched through Home. Native peer identity checks and Runtime-owned installed-source, session and App Access admission remain mandatory. Production Runtime trust remains unchanged; invalid source Runtime observations fail closed without fallback. SDK 0.21.0, App Tools 0.12.0 and the existing App business workflows are retained.

# Next AI Draw.io 0.4.20 — Published Nimi packages

Uses SDK 0.21.0, Kit/native 0.19.0, App Tools 0.12.0, Nimi Coding 0.6.5 and
Vercel adapter 0.5.0 with AI SDK 7, resolved from npm with a frozen pnpm lock.
Preserves the original diagram, tools, files, templates and export workflows.
The Host binds Desktop's technical profile before loading the remaining Kit
modules. macOS production build/pack and real model generation and editing have
passed; release/admission and installed acceptance are separate stages.

# Next AI Draw.io 0.4.19 — Nimi adaptation

Adds the publisher declaration for audience, AI text and diagram exports, and external URL retrieval. Keeps SDK 0.13 / Kit 0.9, the Vercel AI adapter and existing diagram workflows. No launch gate or safety certification is introduced. Publication, Registry admission and installed acceptance remain separate steps.

# Next AI Draw.io 0.4.18 — Nimi adaptation

Based on upstream Next AI Draw.io 0.4.16 at `027cd88c9088ad5b2d6deff4641dc47ded06afd2`.

The adaptation retains the Next.js renderer, draw.io canvas, conversational tools, document inputs, templates, history and export formats. Nimi provides AI model selection, protected access and managed drawing storage.

0.4.18 fixes native dependency packaging: `.node` addons and their companion `.dylib`/`.dll` libraries are kept as physical files with their relative directories preserved. In 0.4.17, macOS Catalog installation succeeded but startup stopped before creating a window because sharp's libvips library remained inside ASAR. This packaging fix changes no diagram or AI behavior.

The original LICENSE bytes remain protected across platform checkouts. The packaged App manifest uses SemVer `0.4.18`, with numeric Windows resource version `0.4.18.0`.

This release uses public Nimi SDK 0.13.0, Kit/native 0.9.0, Vercel AI adapter 0.1.0 and App Tools 0.6.1. The release workflow builds the declared macOS arm64 and Windows x86_64 packages with exact artifact provenance. Native trust observations are recorded with each target; this App's release does not apply Developer ID signing or notarization.

The macOS supervised development journeys have been verified, including real drawing, image/document input, editing, history, export and cancellation. Version 0.4.17 was admitted to the Registry and passed actual macOS Catalog download, package verification and installation; its production startup failed on the missing library. Check `docs/nimi-adaptation.md` for the exact evidence. Version 0.4.18 release/installation and successful production running still need their own validation. Windows user journeys remain NOT-VERIFIED.
