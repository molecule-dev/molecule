import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for tr. */
export const tr: Partial<FilesystemTranslations> = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: Sağlayıcı ayarlanmadı. `setProvider()` işlevini bir `FilesystemProvider` uygulamasıyla çağırın — Molecule bunun için bir sağlayıcı içermiyor; arayüzü yerel çalışma ortamınızda uygulayın ve bağlayın.',
}
