# @molecule/api-export-pptx

## 1.0.2

### Patch Changes

- c504779: Deck export now refuses ICNS, JPEG XL and HEIF/HEIC images. The image measurement library used to embed images has unpatched denial-of-service flaws in exactly those three parsers, so images are checked by magic number — not just by declared MIME type — before they reach it. PNG, JPEG, GIF, BMP, SVG and WebP are unaffected.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.
