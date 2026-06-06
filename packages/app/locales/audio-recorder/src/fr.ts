import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for fr. */
export const fr: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': 'Mettre en pause',
  'audioRecorder.resume': 'Reprendre',
  'audioRecorder.statusPaused': 'En pause',
  'audioRecorder.unsupported': "L'enregistrement audio n'est pas pris en charge par ce navigateur.",
  'audioRecorder.error': "L'enregistrement a échoué. Veuillez réessayer.",
  'audioRecorder.permissionDenied':
    "Autorisation d'accès au microphone refusée. Veuillez autoriser l'accès et réessayer.",
  'audioRecorder.stop': 'Arrêt',
  'audioRecorder.elapsed': 'Échéance<x> {{temps}}</x>',
  'audioRecorder.statusProcessed': 'Enregistré',
  'audioRecorder.statusError': 'Erreur',
  'audioRecorder.statusIdle': 'Prêt à enregistrer',
  'audioRecorder.group': 'Enregistreur audio',
}
