import type { GradeTranslations } from './types.js'

/** Grade translations for Chinese (Traditional). */
export const zhTW: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': '需要提供 enrollmentId、assignmentId、userId 和 courseId。',
  'grade.error.scoreNumeric': 'scorePoints 和 maxPoints 必須是數字。',
  'grade.error.maxPointsPositive': 'maxPoints 必須大於零',
  'grade.error.scoreOutOfRange': '得分必須介於 0 和 maxPoints 之間',
  'grade.error.createFailed': '成績發布失敗',
  'grade.error.notFound': '未找到成績',
  'grade.error.readFailed': '未能讀懂成績',
  'grade.error.listFailed': '未能列出成績',
  'grade.error.updateFailed': '更新成績失敗',
  'grade.error.deleteFailed': '刪除成績失敗',
  'grade.error.noGrades': '未找到成績',
  'grade.error.courseAverageFailed': '計算課程平均分數失敗',
  'grade.error.gpaFailed': '計算GPA失敗',
  'grade.error.transcriptFailed': '成績單產生失敗',
}
