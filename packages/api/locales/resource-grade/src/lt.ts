import type { GradeTranslations } from './types.js'

/** Grade translations for Lithuanian. */
export const lt: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'Privalomi registracijos ID, užduoties ID, vartotojo ID ir kurso ID.',
  'grade.error.scoreNumeric': '„scorePoints“ ir „maxPoints“ turi būti skaičiai',
  'grade.error.maxPointsPositive': '„maxPoints“ turi būti didesnis nei nulis',
  'grade.error.scoreOutOfRange': '„scorePoints“ turi būti nuo 0 iki „maxPoints“',
  'grade.error.createFailed': 'Nepavyko paskelbti įvertinimo',
  'grade.error.notFound': 'Įvertinimas nerastas',
  'grade.error.readFailed': 'Nepavyko perskaityti įvertinimo',
  'grade.error.listFailed': 'Nepavyko išvardyti pažymių',
  'grade.error.updateFailed': 'Nepavyko atnaujinti įvertinimo',
  'grade.error.deleteFailed': 'Nepavyko ištrinti įvertinimo',
  'grade.error.noGrades': 'Nerasta jokių pažymių',
  'grade.error.courseAverageFailed': 'Nepavyko apskaičiuoti kurso vidurkio',
  'grade.error.gpaFailed': 'Nepavyko apskaičiuoti GPA',
  'grade.error.transcriptFailed': 'Nepavyko sukurti transkripcijos',
}
