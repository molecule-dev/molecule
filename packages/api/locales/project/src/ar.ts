import type { ProjectTranslations } from './types.js'

/** Project translations for Arabic. */
export const ar: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'مطلوب name و projectType',
  'project.error.notFound': 'غير موجود',
  'project.error.forbidden': 'تم الرفض',
  'project.error.createFailed': 'فشل إنشاء المشروع',
  'project.error.invalidType':
    'نوع المشروع غير مدعوم؛ المتوقع أحد الأنواع التالية: api، app، full-stack، static، status-page، status-page-edge',
  'project.error.deleteFailed': 'فشل حذف المشروع',
  'project.error.listFailed': 'فشل في إدراج المشاريع',
  'project.error.readFailed': 'فشل في قراءة المشروع',
  'project.error.updateFailed': 'فشل تحديث المشروع',
}
