/**
 * Translation keys for the file-card locale package.
 *
 * Keys are referenced from `@molecule/app-file-card-react` via
 * `t('file-card.<key>', …, { defaultValue })`.
 */
export type FileCardTranslationKey =
  | 'file-card.kind.image'
  | 'file-card.kind.video'
  | 'file-card.kind.audio'
  | 'file-card.kind.document'
  | 'file-card.kind.archive'
  | 'file-card.kind.code'
  | 'file-card.kind.folder'
  | 'file-card.kind.other'
  | 'file-card.aria.root'
  | 'file-card.aria.size'
  | 'file-card.aria.modified'
  | 'file-card.modified.just-now'
  | 'file-card.modified.minute-one'
  | 'file-card.modified.minute-other'
  | 'file-card.modified.hour-one'
  | 'file-card.modified.hour-other'
  | 'file-card.modified.day-one'
  | 'file-card.modified.day-other'
  | 'file-card.modified.week-one'
  | 'file-card.modified.week-other'
  | 'file-card.modified.month-one'
  | 'file-card.modified.month-other'

/** Translation record mapping file-card keys to translated strings. */
export type FileCardTranslations = Record<FileCardTranslationKey, string>
