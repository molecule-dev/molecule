import type { GradeTranslations } from './types.js'

/** Grade translations for Chinese (Simplified). */
export const zh: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': '需要提供 enrollmentId、assignmentId、userId 和 courseId。',
  'grade.error.scoreNumeric': 'scorePoints 和 maxPoints 必须是数字。',
  'grade.error.maxPointsPositive': 'maxPoints 必须大于零',
  'grade.error.scoreOutOfRange': '得分必须介于 0 和 maxPoints 之间',
  'grade.error.createFailed': '成绩发布失败',
  'grade.error.notFound': '未找到成绩',
  'grade.error.readFailed': '未能读懂成绩',
  'grade.error.listFailed': '未能列出成绩',
  'grade.error.updateFailed': '更新成绩失败',
  'grade.error.deleteFailed': '删除成绩失败',
  'grade.error.noGrades': '未找到成绩',
  'grade.error.courseAverageFailed': '计算课程平均分失败',
  'grade.error.gpaFailed': '计算GPA失败',
  'grade.error.transcriptFailed': '成绩单生成失败',
}
