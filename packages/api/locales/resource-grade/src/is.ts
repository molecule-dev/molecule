import type { GradeTranslations } from './types.js'

/** Grade translations for Icelandic. */
export const is: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Skráningarkenni, verkefniskenni, notandakenni og námskeiðskenni eru nauðsynleg',
  'grade.error.scoreNumeric': 'ScorePoints og maxPoints verða að vera tölur',
  'grade.error.maxPointsPositive': 'maxStig verður að vera stærra en núll',
  'grade.error.scoreOutOfRange': 'Stig verða að vera á milli 0 og hámarksstiga',
  'grade.error.createFailed': 'Mistókst að birta einkunn',
  'grade.error.notFound': 'Einkunn fannst ekki',
  'grade.error.readFailed': 'Mistókst að lesa einkunn',
  'grade.error.listFailed': 'Mistókst að lista upp einkunnir',
  'grade.error.updateFailed': 'Mistókst að uppfæra einkunn',
  'grade.error.deleteFailed': 'Mistókst að eyða einkunn',
  'grade.error.noGrades': 'Engar einkunnir fundust',
  'grade.error.courseAverageFailed': 'Mistókst að reikna út meðaltal námskeiðsins',
  'grade.error.gpaFailed': 'Mistókst að reikna meðaleinkunn',
  'grade.error.transcriptFailed': 'Mistókst að búa til afrit',
}
