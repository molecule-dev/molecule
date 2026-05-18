import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for it. */
export const it: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': 'Pausa',
  'audioRecorder.resume': 'Riprendi',
  'audioRecorder.statusPaused': 'In pausa',
  'audioRecorder.unsupported': 'La registrazione audio non è supportata in questo browser.',
  'audioRecorder.error': 'Registrazione non riuscita. Riprova.',
  'audioRecorder.permissionDenied':
    'Accesso al microfono negato. Consenti l&#39;accesso e riprova.',
  'audioRecorder.stop': 'Fermare',
  'audioRecorder.elapsed': 'Tempo trascorso<x> {{tempo}}</x>',
  'audioRecorder.statusProcessed': 'Registrato',
  'audioRecorder.statusError': 'Errore',
  'audioRecorder.statusIdle': 'Pronto per la registrazione',
  'audioRecorder.group': 'Registratore audio',
}
