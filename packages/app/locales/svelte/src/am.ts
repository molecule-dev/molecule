import type { SvelteTranslations } from './types.js'

/** Svelte translations for Amharic. */
export const am: SvelteTranslations = {
  'svelte.error.noStateProvider': 'የሁኔታ አቅራቢ በአውድ ውስጥ አልተገኘም',
  'svelte.error.noAuthClient': 'የማረጋገጫ ደንበኛ በአውድ ውስጥ አልተገኘም',
  'svelte.error.noThemeProvider': 'የገጽታ አቅራቢ በአውድ ውስጥ አልተገኘም',
  'svelte.error.noRouter':
    'እዚህ ራውተር የለም። ከ routing bond (`@molecule/app-routing-sveltekit`) ውስጥ `+layout.svelte` የሚለውን ሩት ውስጥ `MoleculeRouterProvider` ይጫኑ፣ ወይም `setMoleculeContext({ router })` ብለው እዚያው ይደውሉ። መተግበሪያው ይህን ካደረገ፣ የ routing bond ከዚህ ማሰሪያ የቆየ ነው፡ ያዘምኑት (`npm install @molecule/app-routing-sveltekit@latest`)።',
  'svelte.error.noI18nProvider': 'I18n አቅራቢ በአውድ ውስጥ አልተገኘም',
  'svelte.error.noHttpClient': 'HTTP ደንበኛ በአውድ ውስጥ አልተገኘም',
  'svelte.error.noStorageProvider': 'የማከማቻ አቅራቢ በአውድ ውስጥ አልተገኘም',
  'svelte.error.noLoggerProvider': 'የመዝገብ አቅራቢ በአውድ ውስጥ አልተገኘም',
  'svelte.error.unknownPaginationDirection': 'ያልታወቀ የገጽ አቅጣጫ: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider በChatProvider ውስጥ መጠቀም አለበት',
  'svelte.error.useToastOutsideProvider': 'useToast በToastProvider ውስጥ መጠቀም አለበት',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider በWorkspaceProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'svelte.error.useEditorOutsideProvider': 'useEditorProvider በEditorProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider በ PreviewProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient በፈቃድ አቅራቢ ውስጥ ጥቅም ላይ መዋል አለበት',
  'svelte.error.useThemeOutsideProvider': 'useThemeProvider በThemeProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'svelte.error.useRouterOutsideProvider':
    'እዚህ ራውተር የለም። ከ routing bond (`@molecule/app-routing-sveltekit`) ውስጥ `+layout.svelte` የሚለውን ሩት ውስጥ `MoleculeRouterProvider` ይጫኑ፣ ወይም `setMoleculeContext({ router })` ብለው እዚያው ይደውሉ። መተግበሪያው ይህን ካደረገ፣ የ routing bond ከዚህ ማሰሪያ የቆየ ነው፡ ያዘምኑት (`npm install @molecule/app-routing-sveltekit@latest`)።',
  'svelte.error.noRoutedView':
    'እዚህ ምንም የተዘዋወረ እይታ የለም። SvelteKit ገጹን እንደ `children` ያቀርባል፡ በዚህ ክፍል ውስጥ `{@render children()}` ያስተላልፉ።',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient በHttpProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider በ StorageProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'svelte.error.useLoggerOutsideProvider': 'useLoggerProvider በሎገር አቅራቢ ውስጥ ጥቅም ላይ መዋል አለበት',
  'svelte.error.useStoreOutsideProvider': 'useStateProvider በስቴት አቅራቢ ውስጥ ጥቅም ላይ መዋል አለበት',
  'svelte.error.unsupportedMethod': 'የማይደገፍ ዘዴ፦ {{method}}',
  'svelte.error.oauthFailed': 'የOAuth መግቢያ አልተሳካም',
}
