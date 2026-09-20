# Next AI Draw.io 0.4.19 — Nimi adaptation

Adds the publisher declaration for audience, AI text and diagram exports, and external URL retrieval. Keeps SDK 0.13 / Kit 0.9, the Vercel AI adapter and existing diagram workflows. No launch gate or safety certification is introduced. Publication, Registry admission and installed acceptance remain separate steps.

# Next AI Draw.io 0.4.18 — Nimi adaptation

Based on upstream Next AI Draw.io 0.4.16 at `027cd88c9088ad5b2d6deff4641dc47ded06afd2`.

The adaptation retains the Next.js renderer, draw.io canvas, conversational tools, document inputs, templates, history and export formats. Nimi provides AI model selection, protected access and managed drawing storage.

0.4.18 fixes native dependency packaging: `.node` addons and their companion `.dylib`/`.dll` libraries are kept as physical files with their relative directories preserved. In 0.4.17, macOS Catalog installation succeeded but startup stopped before creating a window because sharp's libvips library remained inside ASAR. This packaging fix changes no diagram or AI behavior.

The original LICENSE bytes remain protected across platform checkouts. The packaged App manifest uses SemVer `0.4.18`, with numeric Windows resource version `0.4.18.0`.

This release uses public Nimi SDK 0.13.0, Kit/native 0.9.0, Vercel AI adapter 0.1.0 and App Tools 0.6.1. The release workflow builds the declared macOS arm64 and Windows x86_64 packages with exact artifact provenance. Native trust observations are recorded with each target; this App's release does not apply Developer ID signing or notarization.

The macOS supervised development journeys have been verified, including real drawing, image/document input, editing, history, export and cancellation. Version 0.4.17 was admitted to the Registry and passed actual macOS Catalog download, package verification and installation; its production startup failed on the missing library. Check `docs/nimi-adaptation.md` for the exact evidence. Version 0.4.18 release/installation and successful production running still need their own validation. Windows user journeys remain NOT-VERIFIED.
