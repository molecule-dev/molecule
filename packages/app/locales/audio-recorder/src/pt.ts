import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for pt. */
export const pt: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': 'Pausar',
  'audioRecorder.resume': 'Retomar',
  'audioRecorder.statusPaused': 'Pausado',
  'audioRecorder.unsupported': 'A gravação de áudio não é suportada neste navegador.',
  'audioRecorder.error': 'A gravação falhou. Tente novamente.',
  'audioRecorder.permissionDenied':
    'Acesso ao microfone negado. Permita o acesso e tente novamente.',
  'audioRecorder.stop': 'Parar',
  'audioRecorder.elapsed': 'Decorrido<x> {{tempo}}</x>',
  'audioRecorder.statusProcessed': 'Gravado',
  'audioRecorder.statusError': 'Erro',
  'audioRecorder.statusIdle': 'Pronto para gravar',
  'audioRecorder.group': 'Gravador de áudio',
}
