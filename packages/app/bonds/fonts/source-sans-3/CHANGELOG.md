# @molecule/app-fonts-source-sans-3

## 1.1.1

### Patch Changes

- 2584a32: The README now documents bonding the font without `mlcl`: import the packaged webfont from `./fonts/*` as a bundler asset URL and pass it as the face, or copy `fonts/` into the app's `public/fonts/`.

## 1.1.0

### Minor Changes

- 9abec9b: New `@molecule/app-fonts-source-sans-3` font provider: the current upstream Source Sans 3 variable font, self-hosted and registered under the `Source Sans Pro` family name, so stylesheets that ask for `'Source Sans Pro'` (the RealWorld/Conduit theme among others) render without a CDN or a fontsource download.
