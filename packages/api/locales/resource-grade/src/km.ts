import type { GradeTranslations } from './types.js'

/** Grade translations for Khmer. */
export const km: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'តម្រូវ​ឲ្យ​មាន enrollmentId, assignmentId, userId និង courseId',
  'grade.error.scoreNumeric': 'ពិន្ទុ​ពិន្ទុ និង​ពិន្ទុ​អតិបរមា​ត្រូវតែ​ជា​លេខ',
  'grade.error.maxPointsPositive': 'ពិន្ទុអតិបរមាត្រូវតែធំជាងសូន្យ',
  'grade.error.scoreOutOfRange': 'ពិន្ទុ​ត្រូវតែ​ស្ថិតនៅចន្លោះ 0 និង maxPoints',
  'grade.error.createFailed': 'មិនអាចបង្ហោះចំណាត់ថ្នាក់បានទេ',
  'grade.error.notFound': 'រកមិនឃើញថ្នាក់',
  'grade.error.readFailed': 'មិនអាចអានចំណាត់ថ្នាក់បានទេ',
  'grade.error.listFailed': 'មិនអាចរាយបញ្ជីចំណាត់ថ្នាក់បានទេ',
  'grade.error.updateFailed': 'មិនអាចធ្វើបច្ចុប្បន្នភាពចំណាត់ថ្នាក់បានទេ',
  'grade.error.deleteFailed': 'មិនអាចលុបចំណាត់ថ្នាក់បានទេ',
  'grade.error.noGrades': 'រកមិនឃើញចំណាត់ថ្នាក់ទេ',
  'grade.error.courseAverageFailed': 'មិនអាចគណនាមធ្យមភាគវគ្គសិក្សាបានទេ',
  'grade.error.gpaFailed': 'មិនអាចគណនា GPA បានទេ',
  'grade.error.transcriptFailed': 'មិនអាចបង្កើតប្រតិចារឹកបានទេ',
}
