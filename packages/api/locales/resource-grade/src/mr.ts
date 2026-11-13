import type { GradeTranslations } from './types.js'

/** Grade translations for Marathi. */
export const mr: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'नोंदणी आयडी, असाइनमेंट आयडी, वापरकर्ता आयडी आणि कोर्स आयडी आवश्यक आहेत.',
  'grade.error.scoreNumeric': 'स्कोरपॉइंट्स आणि मॅक्सपॉइंट्स हे अंकच असले पाहिजेत.',
  'grade.error.maxPointsPositive': 'कमाल गुण शून्यापेक्षा जास्त असले पाहिजेत',
  'grade.error.scoreOutOfRange': 'स्कोअरपॉइंट्स ० आणि मॅक्सपॉइंट्सच्या दरम्यान असले पाहिजेत.',
  'grade.error.createFailed': 'ग्रेड पोस्ट करण्यात अयशस्वी',
  'grade.error.notFound': 'ग्रेड सापडला नाही',
  'grade.error.readFailed': 'ग्रेड वाचण्यात अयशस्वी',
  'grade.error.listFailed': 'गुण सूचीबद्ध करण्यात अयशस्वी',
  'grade.error.updateFailed': 'श्रेणी अद्ययावत करण्यात अयशस्वी',
  'grade.error.deleteFailed': 'ग्रेड हटवण्यात अयशस्वी झाले',
  'grade.error.noGrades': 'कोणतेही ग्रेड आढळले नाहीत',
  'grade.error.courseAverageFailed': 'अभ्यासक्रमाची सरासरी काढण्यात अयशस्वी',
  'grade.error.gpaFailed': 'जीपीए मोजण्यात अयशस्वी',
  'grade.error.transcriptFailed': 'प्रतिलेख तयार करण्यात अयशस्वी',
}
