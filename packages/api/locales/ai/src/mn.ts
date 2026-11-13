import type { AiTranslations } from './types.js'

/** Ai translations for Mongolian. */
export const mn: AiTranslations = {
  'ai.error.noProvider':
    'AI нийлүүлэгч тохируулагдаагүй байна. Эхлээд AI нийлүүлэгчийг холбоно уу.',
  'ai.error.ambiguousProvider':
    'Нэртэй олон AI нийлүүлэгч холбогдсон бөгөөд өгөгдмөл тохируулаагүй байна. Нэгийг сонгохын тулд getProviderByName(name)-г ашиглана уу.',
  'ai.error.responseIncomplete':
    'Хиймэл оюун ухааны хариу үйлдэл дуусахаас өмнө дууссан. Дахин оролдоно уу.',
  'ai.error.responseTokenLimit':
    'Хиймэл оюун ухааны хариу үйлдэл дуусахаас өмнө гаралтын токенийн хязгаарт хүрсэн.',
  'ai.error.apiError': 'Хиймэл оюун ухааны үйлчилгээний алдаа. Дахин оролдоно уу.',
  'ai.error.noResponseBody': 'Хиймэл оюун ухааны үйлчилгээнээс хариу ирээгүй байна.',
}
