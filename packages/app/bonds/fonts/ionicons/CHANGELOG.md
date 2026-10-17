# @molecule/app-fonts-ionicons

## 1.1.1

### Patch Changes

- 2584a32: The README now documents bonding the font without `mlcl`: import the packaged webfont from `./fonts/*` as a bundler asset URL and pass it as the face, or copy `fonts/` into the app's `public/fonts/`.

## 1.1.0

### Minor Changes

- cec1e3e: New `@molecule/app-fonts-ionicons` font provider: the Ionicons 2.0 icon font and its `ion-*` glyph classes, self-hosted, so markup written against the 2.x class names (e.g. the RealWorld Conduit spec's `<i class="ion-heart">`) renders icons without an external CDN.
