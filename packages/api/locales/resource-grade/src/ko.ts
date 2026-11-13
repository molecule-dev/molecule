import type { GradeTranslations } from './types.js'

/** Grade translations for Korean. */
export const ko: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    '등록 ID, 과제 ID, 사용자 ID 및 코스 ID는 필수 입력 사항입니다.',
  'grade.error.scoreNumeric': 'scorePoints와 maxPoints는 숫자여야 합니다.',
  'grade.error.maxPointsPositive': 'maxPoints는 0보다 커야 합니다.',
  'grade.error.scoreOutOfRange': 'scorePoints는 0과 maxPoints 사이여야 합니다.',
  'grade.error.createFailed': '성적을 입력하지 못했습니다.',
  'grade.error.notFound': '학년을 찾을 수 없습니다.',
  'grade.error.readFailed': '성적을 읽지 못했습니다',
  'grade.error.listFailed': '성적을 기재하지 못했습니다.',
  'grade.error.updateFailed': '성적 업데이트에 실패했습니다',
  'grade.error.deleteFailed': '성적 삭제에 실패했습니다',
  'grade.error.noGrades': '성적을 찾을 수 없습니다.',
  'grade.error.courseAverageFailed': '과목 평균 계산에 실패했습니다.',
  'grade.error.gpaFailed': '평점 계산에 실패했습니다',
  'grade.error.transcriptFailed': '녹취록을 생성하는 데 실패했습니다.',
}
