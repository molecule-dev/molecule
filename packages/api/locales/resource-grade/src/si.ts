import type { GradeTranslations } from './types.js'

/** Grade translations for Sinhala. */
export const si: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'enrollmentId, assignmentId, userId, සහ courseId අවශ්‍ය වේ.',
  'grade.error.scoreNumeric': 'ලකුණු ලකුණු සහ උපරිම ලකුණු සංඛ්‍යා විය යුතුය.',
  'grade.error.maxPointsPositive': 'උපරිම ලක්ෂ්‍ය බිංදුවට වඩා වැඩි විය යුතුය.',
  'grade.error.scoreOutOfRange': 'ලකුණු ලකුණු 0 සහ උපරිම ලකුණු අතර විය යුතුය.',
  'grade.error.createFailed': 'ශ්‍රේණිය පළ කිරීමට අසමත් විය.',
  'grade.error.notFound': 'ශ්‍රේණිය හමු නොවීය',
  'grade.error.readFailed': 'ශ්‍රේණිය කියවීමට අසමත් විය',
  'grade.error.listFailed': 'ශ්‍රේණි ලැයිස්තුගත කිරීමට අසමත් විය',
  'grade.error.updateFailed': 'ශ්‍රේණිය යාවත්කාලීන කිරීමට අසමත් විය.',
  'grade.error.deleteFailed': 'ශ්‍රේණිය මැකීමට අසමත් විය',
  'grade.error.noGrades': 'ශ්‍රේණි හමු නොවීය',
  'grade.error.courseAverageFailed': 'පාඨමාලා සාමාන්‍යය ගණනය කිරීමට අපොහොසත් විය.',
  'grade.error.gpaFailed': 'GPA ගණනය කිරීමට අපොහොසත් විය.',
  'grade.error.transcriptFailed': 'පිටපත ගොඩනැගීමට අසමත් විය.',
}
