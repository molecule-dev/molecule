import type { GradeTranslations } from './types.js'

/** Grade translations for Thai. */
export const th: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired':
    'enrollmentId, assignmentId, userId และ courseId เป็นข้อมูลที่จำเป็น',
  'grade.error.scoreNumeric': 'scorePoints และ maxPoints ต้องเป็นตัวเลข',
  'grade.error.maxPointsPositive': 'ค่า maxPoints ต้องมากกว่าศูนย์',
  'grade.error.scoreOutOfRange': 'คะแนนต้องอยู่ระหว่าง 0 ถึงคะแนนสูงสุด',
  'grade.error.createFailed': 'ไม่สามารถโพสต์เกรดได้',
  'grade.error.notFound': 'ไม่พบเกรด',
  'grade.error.readFailed': 'อ่านเกรดไม่ขึ้น',
  'grade.error.listFailed': 'ไม่ได้ระบุเกรด',
  'grade.error.updateFailed': 'ไม่สามารถอัปเดตเกรดได้',
  'grade.error.deleteFailed': 'ไม่สามารถลบเกรดได้',
  'grade.error.noGrades': 'ไม่พบเกรด',
  'grade.error.courseAverageFailed': 'ไม่สามารถคำนวณคะแนนเฉลี่ยของรายวิชาได้',
  'grade.error.gpaFailed': 'ไม่สามารถคำนวณเกรดเฉลี่ยได้',
  'grade.error.transcriptFailed': 'ไม่สามารถสร้างบันทึกการถอดเสียงได้',
}
