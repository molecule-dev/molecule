import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for es. */
export const es: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': 'Pausar',
  'audioRecorder.resume': 'Reanudar',
  'audioRecorder.statusPaused': 'En pausa',
  'audioRecorder.unsupported': 'Este navegador no admite la grabación de audio.',
  'audioRecorder.error': 'La grabación ha fallado. Por favor, inténtelo de nuevo.',
  'audioRecorder.permissionDenied':
    'Permiso de micrófono denegado. Permita el acceso e inténtelo de nuevo.',
  'audioRecorder.stop': 'Detener',
  'audioRecorder.elapsed': 'Transcurrido<x> {{tiempo}}</x>',
  'audioRecorder.statusProcessed': 'Grabado',
  'audioRecorder.statusError': 'Error',
  'audioRecorder.statusIdle': 'Listo para grabar',
  'audioRecorder.group': 'grabadora de audio',
}
