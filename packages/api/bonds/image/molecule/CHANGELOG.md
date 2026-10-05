# @molecule/api-image-molecule

## 1.1.0

### Minor Changes

- New bond: molecule.dev hosted image transformation — resize, crop, rotate, flip, flop, thumbnail, optimize and format-convert (jpeg/png/webp/avif/gif/tiff) as a drop-in `ImageProvider`, billed to your molecule project (scope `broker:image`; self-hosted upstream, zero vendor cost). Use the raw `transform()` to run a multi-op pipeline in one round trip.
