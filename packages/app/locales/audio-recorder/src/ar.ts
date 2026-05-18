import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for ar. */
export const ar: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': 'إيقاف مؤقت',
  'audioRecorder.resume': 'استئناف',
  'audioRecorder.statusPaused': 'متوقفة مؤقتًا',
  'audioRecorder.unsupported': 'لا يدعم هذا المتصفح تسجيل الصوت',
  'audioRecorder.error': 'فشل التسجيل. يرجى المحاولة مرة أخرى.',
  'audioRecorder.permissionDenied':
    'تم رفض منح إذن الوصول إلى الميكروفون. امنح الإذن وحاول مرة أخرى.',
  'audioRecorder.stop': 'قف',
  'audioRecorder.elapsed': 'الوقت المنقضي<x> {{وقت}}</x>',
  'audioRecorder.statusProcessed': 'تم التسجيل',
  'audioRecorder.statusError': 'خطأ',
  'audioRecorder.statusIdle': 'جاهز للتسجيل',
  'audioRecorder.group': 'مسجل الصوت',
}
