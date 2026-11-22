import type { VueTranslations } from './types.js'

/** Vue translations for Finnish. */
export const fi: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Ei reititintä. Kääri sovellus `MoleculeRouterProvider` elementtiin reitityslinkin (`@molecule/app-routing-vue-router`) kautta tai välitä `router` `moleculePlugin` elementille. Jos sovellus jo tekee tämän, sen reitityslinkki on vanhempi kuin tämä sidonta: päivitä se (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Tällä reitityslinkillä ei ole reititettyä näkymää renderöintiä varten: välitä sivu sen sijaan lapsisivuina. Jos sovellus reitittää `@molecule/app-routing-vue-router` komennolla, kyseinen linkki on tätä linkitystä vanhempi: päivitä se (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider tulee käyttää StateProvider sisällä',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider tulee käyttää ThemeProvider sisällä',
  'vue.error.useAuthOutsideProvider': 'useAuthClient tulee käyttää AuthProvider sisällä',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider tulee käyttää StorageProvider sisällä',
  'vue.error.useHttpOutsideProvider': 'useHttpClient tulee käyttää HttpProvider sisällä',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider tulee käyttää LoggerProvider sisällä',
  'vue.error.useToastOutsideProvider': 'useToast tulee käyttää ToastProvider sisällä',
  'vue.error.unsupportedMethod': 'Ei-tuettu menetelmä: {{method}}',
  'vue.error.useChatOutsideProvider':
    'useChatProvider on käytettävä ChatProvider-komponentin sisällä',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider-muuttujaa on käytettävä EditorProvider-muuttujassa.',
  'vue.error.oauthFailed': 'OAuth-kirjautuminen epäonnistui',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider-parametria on käytettävä PreviewProvider-parametrin sisällä.',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider-arvoa on käytettävä WorkspaceProvider-arvoa noudattaen.',
}
