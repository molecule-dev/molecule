import type { IconsTranslations } from './types.js'

/** Icons translations for Chinese. */
export const zh: IconsTranslations = {
  'icons.error.noIconSet':
    '未设置 IconSet。请在应用启动时使用图标库调用 setIconSet()（例如 @molecule/app-icons-molecule）。',
  'icons.error.noProvider':
    '@molecule/app-icons: 未绑定图标集。请使用 IconSet 调用 setIconSet()（例如 @molecule/app-icons-molecule 的导出）。',
  'icons.error.notFound': '在当前图标集中未找到图标 "{{name}}"。',
}
