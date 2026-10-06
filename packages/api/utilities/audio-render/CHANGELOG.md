# @molecule/api-audio-render

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
