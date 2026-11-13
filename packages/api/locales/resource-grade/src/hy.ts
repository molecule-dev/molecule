import type { GradeTranslations } from './types.js'

/** Grade translations for Armenian. */
export const hy: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'գրանցման նույնականացուցիչը, հանձնարարության նույնականացուցիչը, օգտատիրոջ նույնականացուցիչը և դասընթացի նույնականացուցիչը պարտադիր են',
  'grade.error.scoreNumeric': 'scorePoints-ը և maxPoints-ը պետք է թվեր լինեն',
  'grade.error.maxPointsPositive': 'maxPoints-ը պետք է մեծ լինի զրոյից',
  'grade.error.scoreOutOfRange': 'scorePoints-ը պետք է լինի 0-ից մինչև maxPoints միջակայքում',
  'grade.error.createFailed': 'Գնահատականը չհաջողվեց հրապարակել',
  'grade.error.notFound': 'Գնահատականը չի գտնվել',
  'grade.error.readFailed': 'Չհաջողվեց կարդալ գնահատականը',
  'grade.error.listFailed': 'Գնահատականները չհաջողվեց ցուցադրել',
  'grade.error.updateFailed': 'Չհաջողվեց թարմացնել գնահատականը',
  'grade.error.deleteFailed': 'Չհաջողվեց ջնջել գնահատականը',
  'grade.error.noGrades': 'Գնահատականներ չեն գտնվել',
  'grade.error.courseAverageFailed': 'Չհաջողվեց հաշվարկել դասընթացի միջինը',
  'grade.error.gpaFailed': 'Չհաջողվեց հաշվարկել GPA-ն',
  'grade.error.transcriptFailed': 'Տառադարձումը չհաջողվեց կազմել',
}
