import type { GradebookTranslations } from './types.js'

/** Gradebook translations for th. */
export const th: Partial<GradebookTranslations> = {
  'gradebook.aria.region': 'สมุดบันทึกคะแนน',
  'gradebook.empty': 'ยังไม่มีการให้คะแนน',
  'gradebook.col.title': 'คอร์ส',
  'gradebook.col.letter': 'จดหมาย',
  'gradebook.col.numeric': 'คะแนน',
  'gradebook.col.numericPct': 'คะแนน (%)',
  'gradebook.col.weight': 'น้ำหนัก',
  'gradebook.col.contribution': 'การมีส่วนร่วมของ GPA',
  'gradebook.col.posted': 'โพสต์',
  'gradebook.gpa.title': 'เกรดเฉลี่ย',
  'gradebook.gpa.outOf': 'จาก<x> {{max}}</x>',
  'gradebook.gpa.trend.up': 'แนวโน้มขาขึ้น',
  'gradebook.gpa.trend.down': 'แนวโน้มลดลง',
  'gradebook.gpa.trend.flat': 'มั่นคง',
}
