import type { GradeTranslations } from './types.js'

/** Grade translations for Tamil. */
export const ta: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId மற்றும் courseId ஆகியவை தேவைப்படுகின்றன.',
  'grade.error.scoreNumeric': 'scorePoints மற்றும் maxPoints ஆகியவை எண்களாக இருக்க வேண்டும்.',
  'grade.error.maxPointsPositive': 'அதிகபட்சப் புள்ளிகள் பூஜ்ஜியத்தை விட அதிகமாக இருக்க வேண்டும்',
  'grade.error.scoreOutOfRange':
    'மதிப்பெண் புள்ளிகள் 0 மற்றும் அதிகபட்சப் புள்ளிகளுக்கு இடையில் இருக்க வேண்டும்.',
  'grade.error.createFailed': 'மதிப்பெண்ணைப் பதிவிடத் தவறியது',
  'grade.error.notFound': 'தரம் காணப்படவில்லை',
  'grade.error.readFailed': 'தரத்தைப் படிக்கத் தவறிவிட்டார்',
  'grade.error.listFailed': 'மதிப்பெண்களைப் பட்டியலிடத் தவறிவிட்டது',
  'grade.error.updateFailed': 'தரத்தைப் புதுப்பிக்கத் தவறிவிட்டது',
  'grade.error.deleteFailed': 'மதிப்பெண்ணை நீக்க முடியவில்லை',
  'grade.error.noGrades': 'தரங்கள் எதுவும் காணப்படவில்லை',
  'grade.error.courseAverageFailed': 'பாட சராசரியைக் கணக்கிட முடியவில்லை',
  'grade.error.gpaFailed': 'GPA-ஐக் கணக்கிடத் தவறியது',
  'grade.error.transcriptFailed': 'படியை உருவாக்க முடியவில்லை',
}
