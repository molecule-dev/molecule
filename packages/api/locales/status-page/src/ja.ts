import type { StatusTranslations } from './types.js'

/** Status translations for Japanese. */
export const ja: StatusTranslations = {
  'status.error.serviceNotFound': 'サービスが見つかりません。',
  'status.error.incidentNotFound': 'インシデントが見つかりません。',
  'status.error.validationFailed': 'バリデーションに失敗しました: {{errors}}',
  'status.error.createServiceFailed': 'サービスの作成に失敗しました。',
  'status.error.updateServiceFailed': 'サービスの更新に失敗しました。',
  'status.error.deleteServiceFailed': 'サービスの削除に失敗しました。',
  'status.error.getServiceFailed': 'サービスの取得に失敗しました。',
  'status.error.listServicesFailed': 'サービス一覧の取得に失敗しました。',
  'status.error.createIncidentFailed': 'インシデントの作成に失敗しました。',
  'status.error.updateIncidentFailed': 'インシデントの更新に失敗しました。',
  'status.error.listIncidentsFailed': 'インシデント一覧の取得に失敗しました。',
  'status.error.getStatusFailed': 'システム状態の取得に失敗しました。',
  'status.error.getUptimeFailed': 'アップタイムデータの取得に失敗しました。',
}
