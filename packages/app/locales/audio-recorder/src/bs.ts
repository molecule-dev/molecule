import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for bs. */
export const bs: Partial<AudioRecorderTranslations> = {
  'audioRecorder.unsupported': 'Snimanje zvuka nije podržano u ovom pregledniku',
  'audioRecorder.error': 'Snimanje nije uspjelo. Pokušajte ponovo.',
  'audioRecorder.permissionDenied':
    'Dozvola za mikrofon je odbijena. Dozvolite pristup i pokušajte ponovo.',
  'audioRecorder.pause': 'Pauza',
  'audioRecorder.resume': 'Životopis',
  'audioRecorder.stop': 'Zaustavi',
  'audioRecorder.elapsed': 'Proteklo<x> {{vrijeme}}</x>',
  'audioRecorder.statusPaused': 'Pauzirano',
  'audioRecorder.statusProcessed': 'Snimljeno',
  'audioRecorder.statusError': 'Greška',
  'audioRecorder.statusIdle': 'Spremno za snimanje',
  'audioRecorder.group': 'Snimač zvuka',
}
