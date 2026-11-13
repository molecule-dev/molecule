import type { GradeTranslations } from './types.js'

/** Grade translations for Lao. */
export const lo: GradeTranslations = {
  'grade.error.forbidden': 'Access denied',
  'grade.error.foreignKeysRequired': 'ຕ້ອງມີ enrollmentId, assignmentId, userId ແລະ courseId',
  'grade.error.scoreNumeric': 'scorePoints ແລະ maxPoints ຕ້ອງເປັນຕົວເລກ',
  'grade.error.maxPointsPositive': 'maxPoints ຕ້ອງຫຼາຍກວ່າສູນ',
  'grade.error.scoreOutOfRange': 'ຄະແນນຕ້ອງຢູ່ລະຫວ່າງ 0 ແລະ maxPoints',
  'grade.error.createFailed': 'ໂພສເກຣດບໍ່ສຳເລັດ',
  'grade.error.notFound': 'ບໍ່ພົບເກຣດ',
  'grade.error.readFailed': 'ອ່ານເກຣດບໍ່ສຳເລັດ',
  'grade.error.listFailed': 'ລາຍຊື່ເກຣດລົ້ມເຫຼວ',
  'grade.error.updateFailed': 'ອັບເດດເກຣດບໍ່ສຳເລັດ',
  'grade.error.deleteFailed': 'ລຶບເກຣດບໍ່ສຳເລັດ',
  'grade.error.noGrades': 'ບໍ່ພົບເກຣດ',
  'grade.error.courseAverageFailed': 'ການຄິດໄລ່ຄ່າສະເລ່ຍຂອງຫຼັກສູດລົ້ມເຫຼວ',
  'grade.error.gpaFailed': 'ການຄິດໄລ່ GPA ບໍ່ສຳເລັດ',
  'grade.error.transcriptFailed': 'ສ້າງບົດບັນທຶກສຽງບໍ່ສຳເລັດ',
}
