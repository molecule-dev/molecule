import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for ml. */
export const ml: Partial<AudioRecorderTranslations> = {
  'audioRecorder.unsupported': 'ഈ ബ്രൗസറിൽ ഓഡിയോ റെക്കോർഡിംഗ് പിന്തുണയ്ക്കുന്നില്ല.',
  'audioRecorder.error': 'റെക്കോർഡിംഗ് പരാജയപ്പെട്ടു. വീണ്ടും ശ്രമിക്കുക.',
  'audioRecorder.permissionDenied':
    'മൈക്രോഫോൺ അനുമതി നിരസിച്ചു. ആക്‌സസ് അനുവദിച്ച് വീണ്ടും ശ്രമിക്കുക.',
  'audioRecorder.pause': 'താൽക്കാലികമായി നിർത്തുക',
  'audioRecorder.resume': 'പുനരാരംഭിക്കുക',
  'audioRecorder.stop': 'നിർത്തുക',
  'audioRecorder.elapsed': 'കഴിഞ്ഞു<x> {{സമയം}}</x>',
  'audioRecorder.statusPaused': 'താൽക്കാലികമായി നിർത്തി',
  'audioRecorder.statusProcessed': 'റെക്കോർഡുചെയ്‌തു',
  'audioRecorder.statusError': 'പിശക്',
  'audioRecorder.statusIdle': 'റെക്കോർഡ് ചെയ്യാൻ തയ്യാറാണ്',
  'audioRecorder.group': 'ഓഡിയോ റെക്കോർഡർ',
}
