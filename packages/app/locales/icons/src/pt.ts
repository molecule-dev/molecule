import type { IconsTranslations } from './types.js'

/** Icons translations for Portuguese. */
export const pt: IconsTranslations = {
  'icons.error.noIconSet':
    'Nenhum IconSet foi definido. Chame setIconSet() na inicialização do aplicativo com uma biblioteca de ícones (ex., @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Nenhum conjunto de ícones vinculado. Chame setIconSet() com um IconSet (ex., a exportação de @molecule/app-icons-molecule).',
  'icons.error.notFound': 'O ícone "{{name}}" não foi encontrado no conjunto de ícones atual.',
}
