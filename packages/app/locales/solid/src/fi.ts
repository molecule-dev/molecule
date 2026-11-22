import type { SolidTranslations } from './types.js'

/** Solid translations for Finnish. */
export const fi: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty tila',
  'solid.error.authOutsideProvider':
    'getAuthClient on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty todennus',
  'solid.error.themeOutsideProvider':
    'getThemeProvider on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty teema',
  'solid.error.routerOutsideProvider':
    'getRouter on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty reititin',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty tallennus',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider on käytettävä MoleculeProvider-komponentin sisällä, jossa on määritetty loki',
  'solid.error.useAccordionOutsideProvider':
    'Accordion-komponentteja on käytettävä Accordion-komponentin sisällä',
  'solid.error.useToastOutsideProvider': 'useToast on käytettävä ToastProvider-komponentin sisällä',
  'solid.error.useChatOutsideProvider':
    'useChatProvider on käytettävä ChatProvider-komponentin sisällä',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider-arvoa on käytettävä WorkspaceProvider-arvoa noudattaen.',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider-muuttujaa on käytettävä EditorProvider-muuttujassa.',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider-parametria on käytettävä PreviewProvider-parametrin sisällä.',
  'solid.error.useAuthOutsideProvider':
    'useAuthClient-ominaisuutta on käytettävä AuthProvider-ominaisuuden sisällä.',
  'solid.error.useHttpOutsideProvider':
    'useHttpClient-ominaisuutta on käytettävä HttpProvider-palvelun sisällä.',
  'solid.error.unsupportedMethod': 'Ei-tuettu menetelmä: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider-parametria on käytettävä LoggerProvider-parametrin sisällä.',
  'solid.error.oauthFailed': 'OAuth-kirjautuminen epäonnistui',
  'solid.error.useRouterOutsideProvider':
    'Tässä ei ole reititintä. Käytä reitityslinkin `MoleculeRouterProvider` -objektia (`@molecule/app-routing-solid-router`) reitittimen `root` tai välitä `router` `MoleculeProvider` objektille. Jos sovellus jo tekee tämän, sen reitityslinkki on vanhempi kuin tämä sidonta: päivitä se (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'Ei reititettyä näkymää. Solid Router antaa reitin komponentille sen sisäkkäisen reitin muodossa `props.children`: käytä tätä reitin `component` tai välitä sivu alikomponentteina.',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider-arvoa on käytettävä StateProvider-arvoa käyttävänä arvona.',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider-parametria on käytettävä StorageProvider-parametrin sisällä.',
  'solid.error.useThemeOutsideProvider':
    'useThemeProvider-muuttujaa on käytettävä ThemeProvider-muuttujassa.',
}
