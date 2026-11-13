import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Mongolian. */
export const mn: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Хариултын бие байхгүй',
  'chat.error.streamError': 'Стримийн алдаа',
  'chat.error.unknownError': 'Тодорхойгүй алдаа',
  'chat.error.sendFailed': 'Мессеж илгээж чадсангүй',
  'chat.error.stalled':
    '{{agentName}} хариу өгөхөө больсон. Энэ нь ард дуусаж байж магадгүй — хамгийн сүүлийн үеийн мэдээллийг харахын тулд дахин ачаална уу эсвэл шинэ мессеж илгээнэ үү.',
  'aiChat.error.noProvider':
    'Хиймэл оюун ухааны чатын үйлчилгээ үзүүлэгчийг тохируулаагүй байна. Эхлээд хиймэл оюун ухааны чатын үйлчилгээ үзүүлэгчтэй гэрээ байгуулна уу.',
}
