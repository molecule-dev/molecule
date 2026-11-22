import type { ReactTranslations } from './types.js'

/** React translations for Slovak. */
export const sk: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Komponenty Accordion musia byť použité vnútri Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient musí byť použitý vnútri AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider musí byť použitý vnútri ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider musí byť použitý vnútri EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient musí byť použitý vnútri HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider musí byť použitý vnútri LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider musí byť použitý vnútri PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Žiadny smerovač tu nie je. Pripojte komponent smerovača z smerovacej väzby aplikácie (`BrowserRouter` z `@molecule/app-routing-react-router`) alebo odovzdajte `router` do `MoleculeProvider`. Ak to aplikácia už robí, jej smerovacia väzba je staršia ako táto väzba: aktualizujte ju (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Toto smerovacie prepojenie nemá žiadny smerovaný pohľad na vykreslenie: namiesto toho odovzdajte stránku ako deti. Ak aplikácia smeruje s `@molecule/app-routing-react-router`, toto prepojenie je staršie ako toto prepojenie: aktualizujte ho (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider': 'useStateProvider musí byť použitý vnútri StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider musí byť použitý vnútri StorageProvider',
  'react.error.useThemeOutsideProvider': 'useThemeProvider musí byť použitý vnútri ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast musí byť použitý vnútri ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider musí byť použitý vnútri WorkspaceProvider',
  'react.error.unsupportedMethod': 'Nepodporovaná metóda: {{method}}',
  'react.error.oauthFailed': 'Prihlásenie cez OAuth zlyhalo',
}
