import type { IconsTranslations } from './types.js'

/** Icons translations for Turkish. */
export const tr: IconsTranslations = {
  'icons.error.noIconSet':
    'Hiçbir IconSet ayarlanmadı. Uygulama başlatılırken bir simge kütüphanesi ile setIconSet() çağrısı yapın (ör., @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Hiçbir simge seti bağlanmadı. setIconSet() çağrısını bir IconSet ile yapın (ör., @molecule/app-icons-molecule paketinin dışa aktarımı).',
  'icons.error.notFound': '"{{name}}" simgesi mevcut simge setinde bulunamadı.',
}
