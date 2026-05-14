import type { TrashTranslations } from './types.js'

/** Trash translations for Indonesian. */
export const id: TrashTranslations = {
  'trash.error.alreadyResolved': 'Item yang dibuang sudah dipulihkan atau dihapus permanen',
  'trash.error.countFailed': 'Gagal menghitung item yang dibuang',
  'trash.error.listFailed': 'Gagal menampilkan daftar item yang dibuang',
  'trash.error.missingId': 'ID sampah diperlukan',
  'trash.error.missingResource': 'Tipe dan ID sumber daya diperlukan',
  'trash.error.notFound': 'Item yang dibuang tidak ditemukan',
  'trash.error.noRestoreHandler':
    'Tidak ada penangan pemulihan yang terdaftar untuk tipe sumber daya ini',
  'trash.error.purgeFailed': 'Gagal menghapus permanen item yang dibuang',
  'trash.error.readFailed': 'Gagal membaca item yang dibuang',
  'trash.error.restoreFailed': 'Gagal memulihkan item yang dibuang',
  'trash.error.trashFailed': 'Gagal memindahkan item ke sampah',
  'trash.error.validationFailed': 'Validasi gagal',
}
