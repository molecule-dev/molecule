import type { IconsTranslations } from './types.js'

/** Icons translations for Arabic. */
export const ar: IconsTranslations = {
  'icons.error.noIconSet':
    'لم يتم تعيين أي IconSet. قم باستدعاء setIconSet() عند بدء تشغيل التطبيق مع مكتبة أيقونات (مثل @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: لم يتم ربط أي مجموعة أيقونات. قم باستدعاء setIconSet() مع IconSet (مثل التصدير من @molecule/app-icons-molecule).',
  'icons.error.notFound': 'الأيقونة "{{name}}" غير موجودة في مجموعة الأيقونات الحالية.',
}
