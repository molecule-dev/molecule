import type { VueTranslations } from './types.js'

/** Vue translations for Georgian. */
export const ka: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'აქ როუტერი არ არის. აპლიკაცია გადაიტანეთ `MoleculeRouterProvider`-ში მარშრუტიზაციის ბმიდან (`@molecule/app-routing-vue-router`), ან გადაეცით `router` `moleculePlugin`-ს. თუ აპლიკაცია უკვე აკეთებს ამას, მისი მარშრუტიზაციის ბმა უფრო ძველია, ვიდრე ეს ბმა: განაახლეთ იგი (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'ამ მარშრუტიზაციის ბმას არ აქვს მარშრუტიზებული ხედი აქ გამოსატანად: გვერდი გადაეცით როგორც შვილობილი. თუ აპლიკაცია მარშრუტიზირდება `@molecule/app-routing-vue-router`-ით, ეს ბმა უფრო ძველია, ვიდრე ეს ბმა: განაახლეთ იგი (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider უნდა გამოიყენოთ StateProvider-ის შიგნით',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider უნდა გამოიყენოთ ThemeProvider-ის შიგნით',
  'vue.error.useAuthOutsideProvider': 'useAuthClient უნდა გამოიყენოთ AuthProvider-ის შიგნით',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider უნდა გამოიყენოთ StorageProvider-ის შიგნით',
  'vue.error.useHttpOutsideProvider': 'useHttpClient უნდა გამოიყენოთ HttpProvider-ის შიგნით',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider უნდა გამოიყენოთ LoggerProvider-ის შიგნით',
  'vue.error.useToastOutsideProvider': 'useToast უნდა გამოიყენოთ ToastProvider-ის შიგნით',
  'vue.error.unsupportedMethod': 'მხარდაუჭერელი მეთოდი: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider უნდა გამოიყენოთ ChatProvider-ის შიგნით',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider უნდა იქნას გამოყენებული EditorProvider-ში',
  'vue.error.oauthFailed': 'OAuth-ში შესვლა ვერ მოხერხდა',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider უნდა იქნას გამოყენებული PreviewProvider-ში',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider უნდა იქნას გამოყენებული WorkspaceProvider-ში.',
}
