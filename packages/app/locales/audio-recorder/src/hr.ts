import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for hr. */
export const hr: Partial<AudioRecorderTranslations> = {
  'audioRecorder.unsupported': 'Snimanje zvuka nije podržano u ovom pregledniku',
  'audioRecorder.error': 'Snimanje nije uspjelo. Pokušajte ponovno.',
  'audioRecorder.permissionDenied':
    'Dozvola za mikrofon odbijena. Dopustite pristup i pokušajte ponovno.',
  'audioRecorder.pause': 'Pauza',
  'audioRecorder.resume': 'Životopis',
  'audioRecorder.stop': 'Stop',
  'audioRecorder.elapsed': 'Proteklo<x> {{vrijeme}}</x>',
  'audioRecorder.statusPaused': 'Pauzirano',
  'audioRecorder.statusProcessed': 'Snimljeno',
  'audioRecorder.statusError': 'Pogreška',
  'audioRecorder.statusIdle': 'Spremno za snimanje',
  'audioRecorder.group': 'Snimač zvuka',
}
