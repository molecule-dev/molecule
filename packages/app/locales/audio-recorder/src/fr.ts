import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for fr. */
export const fr: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': 'Mettre en pause',
  'audioRecorder.resume': 'Reprendre',
  'audioRecorder.statusPaused': 'En pause',
  'audioRecorder.unsupported':
    'L&#39;enregistrement audio n&#39;est pas pris en charge par ce navigateur.',
  'audioRecorder.error': 'L&#39;enregistrement a échoué. Veuillez réessayer.',
  'audioRecorder.permissionDenied':
    'Autorisation d&#39;accès au microphone refusée. Veuillez autoriser l&#39;accès et réessayer.',
  'audioRecorder.stop': 'Arrêt',
  'audioRecorder.elapsed': 'Échéance<x> {{temps}}</x>',
  'audioRecorder.statusProcessed': 'Enregistré',
  'audioRecorder.statusError': 'Erreur',
  'audioRecorder.statusIdle': 'Prêt à enregistrer',
  'audioRecorder.group': 'Enregistreur audio',
}
