import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for ky. */
export const ky: Partial<AudioRecorderTranslations> = {
  'audioRecorder.unsupported': 'Бул браузерде аудио жаздыруу колдоого алынбайт',
  'audioRecorder.error': 'Жаздыруу ишке ашкан жок. Кайра аракет кылыңыз.',
  'audioRecorder.permissionDenied':
    'Микрофонго уруксат берилген жок. Кирүүгө уруксат берип, кайра аракет кылыңыз.',
  'audioRecorder.pause': 'Тыным',
  'audioRecorder.resume': 'Резюме',
  'audioRecorder.stop': 'Токтотуу',
  'audioRecorder.elapsed': 'Өтүп кеткен<x> {{убакыт}}</x>',
  'audioRecorder.statusPaused': 'Тындырылды',
  'audioRecorder.statusProcessed': 'Жаздырылган',
  'audioRecorder.statusError': 'Ката',
  'audioRecorder.statusIdle': 'Жаздырууга даяр',
  'audioRecorder.group': 'Аудио жазгыч',
}
