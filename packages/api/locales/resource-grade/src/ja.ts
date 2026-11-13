import type { GradeTranslations } from './types.js'

/** Grade translations for Japanese. */
export const ja: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId、assignmentId、userId、およびcourseIdは必須です。',
  'grade.error.scoreNumeric': 'scorePointsとmaxPointsは数値でなければなりません。',
  'grade.error.maxPointsPositive': 'maxPointsは0より大きい値でなければなりません',
  'grade.error.scoreOutOfRange': 'scorePointsは0からmaxPointsの間である必要があります。',
  'grade.error.createFailed': '成績の投稿に失敗しました',
  'grade.error.notFound': 'グレードが見つかりません',
  'grade.error.readFailed': 'グレードを読み取れませんでした',
  'grade.error.listFailed': '成績を記載しなかった',
  'grade.error.updateFailed': '成績の更新に失敗しました',
  'grade.error.deleteFailed': '成績の削除に失敗しました',
  'grade.error.noGrades': '成績は見つかりませんでした',
  'grade.error.courseAverageFailed': 'コース平均の計算に失敗しました',
  'grade.error.gpaFailed': 'GPAの計算に失敗しました',
  'grade.error.transcriptFailed': 'トランスクリプトの作成に失敗しました',
}
