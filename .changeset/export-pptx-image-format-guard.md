---
'@molecule/api-export-pptx': patch
---

Deck export now refuses ICNS, JPEG XL and HEIF/HEIC images. The image measurement library used to embed images has unpatched denial-of-service flaws in exactly those three parsers, so images are checked by magic number — not just by declared MIME type — before they reach it. PNG, JPEG, GIF, BMP, SVG and WebP are unaffected.
