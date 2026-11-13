import type { ProjectTranslations } from './types.js'

/** Project translations for Japanese. */
export const ja: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'nameとprojectTypeは必須です',
  'project.error.notFound': '見つかりません',
  'project.error.forbidden': 'アクセスが拒否されました',
  'project.error.createFailed': 'プロジェクトの作成に失敗しました',
  'project.error.invalidType':
    'サポートされていないプロジェクトタイプ。以下のいずれかが必要です: api、app、full-stack、static、status-page、status-page-edge',
  'project.error.deleteFailed': 'プロジェクトの削除に失敗しました',
  'project.error.listFailed': 'プロジェクトの一覧表示に失敗しました',
  'project.error.readFailed': 'プロジェクトの読み込みに失敗しました',
  'project.error.updateFailed': 'プロジェクトの更新に失敗しました',
}
