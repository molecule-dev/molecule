import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for id. */
export const id: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': 'Jeda',
  'audioRecorder.resume': 'Lanjutkan',
  'audioRecorder.statusPaused': 'Dijeda',
  'audioRecorder.unsupported': 'Perekaman audio tidak didukung di browser ini.',
  'audioRecorder.error': 'Perekaman gagal. Silakan coba lagi.',
  'audioRecorder.permissionDenied':
    'Izin penggunaan mikrofon ditolak. Izinkan akses dan coba lagi.',
  'audioRecorder.stop': 'Berhenti',
  'audioRecorder.elapsed': 'Waktu berlalu<x> {{waktu}}</x>',
  'audioRecorder.statusProcessed': 'Tercatat',
  'audioRecorder.statusError': 'Kesalahan',
  'audioRecorder.statusIdle': 'Siap merekam',
  'audioRecorder.group': 'Perekam audio',
}
