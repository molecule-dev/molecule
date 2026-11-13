import type { GradeTranslations } from './types.js'

/** Grade translations for Malayalam. */
export const ml: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId, courseId എന്നിവ ആവശ്യമാണ്.',
  'grade.error.scoreNumeric': 'സ്കോർപോയിന്റുകളും മാക്സ്പോയിന്റുകളും സംഖ്യകളായിരിക്കണം.',
  'grade.error.maxPointsPositive': 'പരമാവധി പോയിന്റുകൾ പൂജ്യത്തേക്കാൾ വലുതായിരിക്കണം',
  'grade.error.scoreOutOfRange': 'സ്കോർ പോയിന്റുകൾ 0 നും പരമാവധി പോയിന്റുകൾക്കും ഇടയിലായിരിക്കണം.',
  'grade.error.createFailed': 'ഗ്രേഡ് പോസ്റ്റ് ചെയ്യാനായില്ല',
  'grade.error.notFound': 'ഗ്രേഡ് കണ്ടെത്തിയില്ല',
  'grade.error.readFailed': 'ഗ്രേഡ് വായിക്കാനായില്ല',
  'grade.error.listFailed': 'ഗ്രേഡുകൾ ലിസ്റ്റ് ചെയ്യാനായില്ല',
  'grade.error.updateFailed': 'ഗ്രേഡ് അപ്ഡേറ്റ് ചെയ്യാനായില്ല',
  'grade.error.deleteFailed': 'ഗ്രേഡ് ഇല്ലാതാക്കാനായില്ല',
  'grade.error.noGrades': 'ഗ്രേഡുകളൊന്നും കണ്ടെത്തിയില്ല',
  'grade.error.courseAverageFailed': 'കോഴ്‌സ് ശരാശരി കണക്കാക്കുന്നതിൽ പരാജയപ്പെട്ടു',
  'grade.error.gpaFailed': 'GPA കണക്കാക്കുന്നതിൽ പരാജയപ്പെട്ടു',
  'grade.error.transcriptFailed': 'ട്രാൻസ്ക്രിപ്റ്റ് നിർമ്മിക്കുന്നതിൽ പരാജയപ്പെട്ടു',
}
