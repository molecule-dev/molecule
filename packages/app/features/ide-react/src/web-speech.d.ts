/** The recognition constructors used by the browser dictation controller. */
import type { SpeechRecognitionConstructor } from '@molecule/app-ide-panel-logic/panels'

declare global {
  interface Window {
    /** Web Speech recognition, where supported. */
    SpeechRecognition?: SpeechRecognitionConstructor
    /** The prefixed constructor exposed by some browsers. */
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}
