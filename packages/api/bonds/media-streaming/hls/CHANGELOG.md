# @molecule/api-media-streaming-hls

## 1.1.0

### Minor Changes

- f14c052: String inputs to `createStream()`/`transcode()` are now validated as local absolute file paths — URLs and any `scheme:`-prefixed value are rejected before ffmpeg runs, closing an SSRF/file-read primitive when apps forward user-supplied strings. The ffmpeg protocol whitelist is trimmed to local protocols (`file,crypto`); fetch remote media yourself and pass a `Buffer`.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-media-streaming@1.0.1
