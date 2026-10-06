---
'@molecule/api-video-render': major
---

`createEnqueueRenderHandler` now requires `mediaRoot` and `outputDir`, ignores client `outputPath`/`jobId`/`queueName`, confines clip sources to the media root, and ffmpeg opens only local files unless `allowRemoteSources` is set.
