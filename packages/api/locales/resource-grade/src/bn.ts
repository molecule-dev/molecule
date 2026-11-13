import type { GradeTranslations } from './types.js'

/** Grade translations for Bengali. */
export const bn: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'enrollmentId, assignmentId, userId, এবং courseId আবশ্যক।',
  'grade.error.scoreNumeric': 'scorePoints এবং maxPoints অবশ্যই সংখ্যা হতে হবে।',
  'grade.error.maxPointsPositive': 'সর্বোচ্চ পয়েন্ট অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।',
  'grade.error.scoreOutOfRange': 'স্কোরপয়েন্ট অবশ্যই ০ এবং সর্বোচ্চ পয়েন্টের মধ্যে হতে হবে।',
  'grade.error.createFailed': 'গ্রেড পোস্ট করতে ব্যর্থ হয়েছে',
  'grade.error.notFound': 'গ্রেড খুঁজে পাওয়া যায়নি',
  'grade.error.readFailed': 'গ্রেড পড়তে ব্যর্থ',
  'grade.error.listFailed': 'গ্রেড তালিকাভুক্ত করতে ব্যর্থ হয়েছে',
  'grade.error.updateFailed': 'গ্রেড আপডেট করতে ব্যর্থ হয়েছে',
  'grade.error.deleteFailed': 'গ্রেড মুছে ফেলতে ব্যর্থ হয়েছে',
  'grade.error.noGrades': 'কোন গ্রেড পাওয়া যায়নি',
  'grade.error.courseAverageFailed': 'কোর্সের গড় গণনা করতে ব্যর্থ হয়েছে',
  'grade.error.gpaFailed': 'জিপিএ গণনা করতে ব্যর্থ হয়েছে',
  'grade.error.transcriptFailed': 'প্রতিলিপি তৈরি করতে ব্যর্থ হয়েছে',
}
