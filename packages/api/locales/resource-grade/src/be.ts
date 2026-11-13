import type { GradeTranslations } from './types.js'

/** Grade translations for Belarusian. */
export const be: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Абавязковыя палі enrollmentId, assignmentId, userId і courseId',
  'grade.error.scoreNumeric': 'scorePoints і maxPoints павінны быць лічбамі',
  'grade.error.maxPointsPositive': 'maxPoints павінна быць больш за нуль',
  'grade.error.scoreOutOfRange': 'Значэнне scorePoints павінна быць паміж 0 і maxPoints',
  'grade.error.createFailed': 'Не атрымалася апублікаваць адзнаку',
  'grade.error.notFound': 'Адзнака не знойдзена',
  'grade.error.readFailed': 'Не атрымалася прачытаць адзнаку',
  'grade.error.listFailed': 'Не атрымалася пералічыць адзнакі',
  'grade.error.updateFailed': 'Не атрымалася абнавіць адзнаку',
  'grade.error.deleteFailed': 'Не атрымалася выдаліць адзнаку',
  'grade.error.noGrades': 'Адзнак не знойдзена',
  'grade.error.courseAverageFailed': 'Не атрымалася вылічыць сярэдні паказчык курса',
  'grade.error.gpaFailed': 'Не атрымалася вылічыць сярэдні бал',
  'grade.error.transcriptFailed': 'Не атрымалася стварыць транскрыпцыю',
}
