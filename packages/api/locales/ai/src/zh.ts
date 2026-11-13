import type { AiTranslations } from './types.js'

/** Ai translations for Chinese. */
export const zh: AiTranslations = {
  'ai.error.noProvider': 'AI 提供者未配置。请先绑定 AI 提供者。',
  'ai.error.ambiguousProvider':
    '已绑定多个命名的 AI 提供者，且未设置默认值。使用 getProviderByName(name) 选择一个。',
  'ai.error.responseIncomplete': 'AI响应尚未完成即结束，请重试。',
  'ai.error.responseTokenLimit': 'AI响应在完成前已达到输出令牌限制。',
  'ai.error.apiError': 'AI服务出错，请重试。',
  'ai.error.noResponseBody': '人工智能服务没有响应。',
}
