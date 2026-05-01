# @molecule/app-word-cloud-react

Word cloud visualization with hand-rolled spiral packing (SVG, no library dep)

## Type
`feature`

## Injection Notes

### Requirements
- None

### Post-Injection Steps
- Run `npm install` to install dependencies
- Run `npm run build` to compile

### Known Limitations
- Bounding-box collision uses an approximate glyph-width ratio (no DOM
  text-metrics measurement). Very long words at the maximum font size may
  visually overlap by a few pixels.
- Spiral packing is deterministic but O(n * spiralSteps) — recommend
  capping `words.length` at ~150 for interactive surfaces.
