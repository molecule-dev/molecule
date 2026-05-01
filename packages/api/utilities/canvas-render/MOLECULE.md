# @molecule/api-canvas-render

Server-side canvas rendering — render a canvas-document JSON into PNG/SVG/PDF buffers.

## Type
`utility`

## Injection Notes

### Requirements
- None

### Post-Injection Steps
- Run `npm install` to install dependencies
- Run `npm run build` to compile

### Known Limitations
- PDF output is a single-page wrapper around the rendered SVG body; complex font / image embedding is not yet supported.
