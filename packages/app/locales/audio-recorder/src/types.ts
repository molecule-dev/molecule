/** Translation keys for the audio-recorder locale package. */
export type AudioRecorderTranslationKey =
  | 'audioRecorder.unsupported'
  | 'audioRecorder.error'
  | 'audioRecorder.permissionDenied'
  | 'audioRecorder.pause'
  | 'audioRecorder.resume'
  | 'audioRecorder.stop'
  | 'audioRecorder.elapsed'
  | 'audioRecorder.statusPaused'
  | 'audioRecorder.statusProcessed'
  | 'audioRecorder.statusError'
  | 'audioRecorder.statusIdle'
  | 'audioRecorder.group'

/** Translation record mapping audio-recorder-react keys to translated strings. */
export type AudioRecorderTranslations = Record<AudioRecorderTranslationKey, string>
