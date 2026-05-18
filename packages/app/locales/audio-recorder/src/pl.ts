import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for pl. */
export const pl: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': 'Pauza',
  'audioRecorder.resume': 'Wznów',
  'audioRecorder.statusPaused': 'Wstrzymany',
  'audioRecorder.unsupported': 'Nagrywanie dźwięku nie jest obsługiwane w tej przeglądarce',
  'audioRecorder.error': 'Nagrywanie nie powiodło się. Spróbuj ponownie.',
  'audioRecorder.permissionDenied':
    'Odmowa dostępu do mikrofonu. Zezwól na dostęp i spróbuj ponownie.',
  'audioRecorder.stop': 'Zatrzymywać się',
  'audioRecorder.elapsed': 'Upłynął<x> {{czas}}</x>',
  'audioRecorder.statusProcessed': 'Nagrany',
  'audioRecorder.statusError': 'Błąd',
  'audioRecorder.statusIdle': 'Gotowy do nagrywania',
  'audioRecorder.group': 'Rejestrator dźwięku',
}
