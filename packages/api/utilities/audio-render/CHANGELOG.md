# @molecule/api-audio-render

## 2.0.4

### Patch Changes

- Checks audio channel, clip and option types before queueing an HTTP render request.

## 2.0.3

### Patch Changes

- The docs name packages that exist, and the link-preview and oEmbed cache examples convert their millisecond TTL for `@molecule/api-cache`.

## 2.0.1

### Patch Changes

- 26d16d9: Media sources are checked against their real path, so a symlink inside the media root can no longer reach files outside it.

## 2.0.0

### Major Changes

- cd7d4ad: `createAudioRenderRoutes` now requires `mediaRoot` and `outputDir`, ignores client `outputPath`/`queueName`, confines clip sources to the media root, and ffmpeg opens only local files unless `allowRemoteSources` is set.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-queue@1.0.1
