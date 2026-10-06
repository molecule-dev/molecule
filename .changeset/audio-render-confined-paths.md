---
'@molecule/api-audio-render': major
---

`createAudioRenderRoutes` now requires `mediaRoot` and `outputDir`, ignores client `outputPath`/`queueName`, confines clip sources to the media root, and ffmpeg opens only local files unless `allowRemoteSources` is set.
