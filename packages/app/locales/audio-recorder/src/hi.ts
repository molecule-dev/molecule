import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for hi. */
export const hi: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': 'रोकें',
  'audioRecorder.resume': 'जारी रखें',
  'audioRecorder.statusPaused': 'रोका गया',
  'audioRecorder.unsupported': 'इस ब्राउज़र में ऑडियो रिकॉर्डिंग समर्थित नहीं है।',
  'audioRecorder.error': 'रिकॉर्डिंग विफल रही। कृपया पुनः प्रयास करें।',
  'audioRecorder.permissionDenied':
    'माइक्रोफ़ोन की अनुमति नहीं दी गई। कृपया अनुमति दें और पुनः प्रयास करें।',
  'audioRecorder.stop': 'रुकना',
  'audioRecorder.elapsed': 'बीता हुआ समय<x> {{समय}}</x>',
  'audioRecorder.statusProcessed': 'रिकॉर्डेड',
  'audioRecorder.statusError': 'गलती',
  'audioRecorder.statusIdle': 'रिकॉर्डिंग के लिए तैयार',
  'audioRecorder.group': 'ऑडियो रिकॉर्डर',
}
