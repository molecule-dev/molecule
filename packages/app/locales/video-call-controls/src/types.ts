/** Translation keys for the video-call-controls locale package. */
export type VideoCallControlsTranslationKey =
  | 'call.muteOn'
  | 'call.muteOff'
  | 'call.cameraOn'
  | 'call.cameraOff'
  | 'call.share'
  | 'call.leave'
  | 'call.aria.muted'
  | 'call.aria.handRaised'
  | 'call.label.you'

/** Translation record mapping video-call-controls-react keys to translated strings. */
export type VideoCallControlsTranslations = Record<VideoCallControlsTranslationKey, string>
