# Next AI Draw.io 0.4.16 — Nimi adaptation

Based on upstream Next AI Draw.io 0.4.16 at `027cd88c9088ad5b2d6deff4641dc47ded06afd2`.

The adaptation retains the Next.js renderer, draw.io canvas, conversational tools, document inputs, templates, history and export formats. Nimi provides AI model selection, protected access and managed drawing storage.

This release uses public Nimi SDK 0.13.0, Kit/native 0.9.0, Vercel AI adapter 0.1.0 and App Tools 0.6.1. The release workflow builds the declared macOS arm64 and Windows x86_64 packages with exact artifact provenance. Native trust observations are recorded with each target; this App's release does not apply Developer ID signing or notarization.

The macOS supervised development journeys have been verified, including real drawing, image/document input, editing, history, export and cancellation. Check `docs/nimi-adaptation.md` for the exact acceptance evidence. Registry admission, Catalog download/install, production running and Windows user journeys require their separate validation; publishing these artifacts does not claim those checks have passed.
