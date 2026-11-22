import type { SvelteTranslations } from './types.js'

/** Svelte translations for Indonesian. */
export const id: SvelteTranslations = {
  'svelte.error.noStateProvider': 'Penyedia state tidak ditemukan dalam konteks',
  'svelte.error.noAuthClient': 'Klien auth tidak ditemukan dalam konteks',
  'svelte.error.noThemeProvider': 'Penyedia tema tidak ditemukan dalam konteks',
  'svelte.error.noRouter':
    'Tidak ada router di sini. Pasang `MoleculeRouterProvider` dari binding routing (`@molecule/app-routing-sveltekit`) di root `+layout.svelte`, atau panggil `setMoleculeContext({ router })` di sana. Jika aplikasi sudah melakukan ini, binding routing-nya lebih lama dari binding ini: perbarui (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider': 'Penyedia i18n tidak ditemukan dalam konteks',
  'svelte.error.noHttpClient': 'Klien HTTP tidak ditemukan dalam konteks',
  'svelte.error.noStorageProvider': 'Penyedia penyimpanan tidak ditemukan dalam konteks',
  'svelte.error.noLoggerProvider': 'Penyedia logger tidak ditemukan dalam konteks',
  'svelte.error.unknownPaginationDirection': 'Arah paginasi tidak dikenal: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider harus digunakan di dalam ChatProvider',
  'svelte.error.useToastOutsideProvider': 'useToast harus digunakan di dalam ToastProvider',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider harus digunakan di dalam WorkspaceProvider.',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider harus digunakan di dalam EditorProvider.',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider harus digunakan di dalam PreviewProvider.',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient harus digunakan di dalam AuthProvider.',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider harus digunakan di dalam ThemeProvider.',
  'svelte.error.useRouterOutsideProvider':
    'Tidak ada router di sini. Pasang `MoleculeRouterProvider` dari binding routing (`@molecule/app-routing-sveltekit`) di root `+layout.svelte`, atau panggil `setMoleculeContext({ router })` di sana. Jika aplikasi sudah melakukan ini, binding routing-nya lebih lama dari binding ini: perbarui (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    'Tidak ada tampilan yang dirutekan di sini. SvelteKit memberikan tata letak halamannya sebagai `children`: berikan `{@render children()}` di dalam komponen ini.',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient harus digunakan di dalam HttpProvider.',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider harus digunakan di dalam StorageProvider.',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider harus digunakan di dalam LoggerProvider.',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider harus digunakan di dalam StateProvider.',
  'svelte.error.unsupportedMethod': 'Metode yang tidak didukung: {{method}}',
  'svelte.error.oauthFailed': 'Login OAuth gagal.',
}
