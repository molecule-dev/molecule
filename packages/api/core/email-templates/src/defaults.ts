/**
 * Built-in transactional email templates.
 *
 * These cover the standard subscription lifecycle that any flagship app needs
 * out of the box. Apps may override individual keys (e.g. to brand the
 * subject) by calling `registerTemplate(...)` with the same `key`.
 *
 * All keys live under the `emailTemplates.*` i18n namespace so locale bond
 * packages can supply translations without colliding with other namespaces.
 *
 * Variable conventions:
 * - `appName`   — the application's display name
 * - `userName`  — the recipient's display name (or email if no name)
 * - `planName`  — the human-readable plan name (e.g. "Pro")
 * - `amount`    — the formatted price (e.g. "$19.00")
 * - `period`    — the billing period (e.g. "month", "year")
 * - `endDate`   — formatted date the access ends
 * - `manageUrl` — link to the customer billing portal
 * - `usageMetric` — name of the usage type that hit a limit
 * - `usageLimit` — the numeric cap that was reached
 *
 * @module
 */

import type { EmailTemplate } from './types.js'

/** Identifier of the built-in subscription lifecycle templates. */
export const TEMPLATE_KEYS = {
  subscriptionStarted: 'subscription.started',
  subscriptionRenewed: 'subscription.renewed',
  subscriptionCanceled: 'subscription.canceled',
  paymentFailed: 'subscription.paymentFailed',
  usageLimitWarning: 'subscription.usageLimitWarning',
  trialEnding: 'subscription.trialEnding',
} as const

/**
 * Type of every key declared in `TEMPLATE_KEYS`. Use this for type-safe
 * `sendTemplate(...)` calls.
 */
export type TransactionalTemplateKey = (typeof TEMPLATE_KEYS)[keyof typeof TEMPLATE_KEYS]

/**
 * Built-in templates indexed by key. Read by `getTemplate(key)` whenever
 * the runtime registry has no override registered.
 */
export const defaultTemplates: Record<string, EmailTemplate> = {
  [TEMPLATE_KEYS.subscriptionStarted]: {
    key: TEMPLATE_KEYS.subscriptionStarted,
    subjectKey: 'emailTemplates.subscriptionStarted.subject',
    defaultSubject: 'Welcome to {{planName}} on {{appName}}',
    textKey: 'emailTemplates.subscriptionStarted.text',
    defaultText:
      'Hi {{userName}},\n\nYour {{planName}} subscription on {{appName}} is now active. ' +
      'You will be billed {{amount}} per {{period}}.\n\nManage your subscription at any time:\n{{manageUrl}}\n\n— The {{appName}} team',
    htmlKey: 'emailTemplates.subscriptionStarted.html',
    defaultHtml:
      '<p>Hi {{userName}},</p>' +
      '<p>Your <strong>{{planName}}</strong> subscription on <strong>{{appName}}</strong> is now active. You will be billed <strong>{{amount}}</strong> per {{period}}.</p>' +
      '<p><a href="{{manageUrl}}">Manage your subscription</a></p>' +
      '<p>— The {{appName}} team</p>',
    variables: ['appName', 'userName', 'planName', 'amount', 'period', 'manageUrl'],
  },

  [TEMPLATE_KEYS.subscriptionRenewed]: {
    key: TEMPLATE_KEYS.subscriptionRenewed,
    subjectKey: 'emailTemplates.subscriptionRenewed.subject',
    defaultSubject: 'Your {{appName}} subscription has renewed',
    textKey: 'emailTemplates.subscriptionRenewed.text',
    defaultText:
      'Hi {{userName}},\n\nYour {{planName}} subscription on {{appName}} has renewed for another {{period}} at {{amount}}.\n\n' +
      'Manage your subscription at any time:\n{{manageUrl}}\n\n— The {{appName}} team',
    htmlKey: 'emailTemplates.subscriptionRenewed.html',
    defaultHtml:
      '<p>Hi {{userName}},</p>' +
      '<p>Your <strong>{{planName}}</strong> subscription on <strong>{{appName}}</strong> has renewed for another {{period}} at <strong>{{amount}}</strong>.</p>' +
      '<p><a href="{{manageUrl}}">Manage your subscription</a></p>' +
      '<p>— The {{appName}} team</p>',
    variables: ['appName', 'userName', 'planName', 'amount', 'period', 'manageUrl'],
  },

  [TEMPLATE_KEYS.subscriptionCanceled]: {
    key: TEMPLATE_KEYS.subscriptionCanceled,
    subjectKey: 'emailTemplates.subscriptionCanceled.subject',
    defaultSubject: 'Your {{appName}} subscription was canceled',
    textKey: 'emailTemplates.subscriptionCanceled.text',
    defaultText:
      'Hi {{userName}},\n\nYour {{planName}} subscription on {{appName}} has been canceled. ' +
      'You will retain access until {{endDate}}.\n\nIf this was a mistake you can resubscribe here:\n{{manageUrl}}\n\n— The {{appName}} team',
    htmlKey: 'emailTemplates.subscriptionCanceled.html',
    defaultHtml:
      '<p>Hi {{userName}},</p>' +
      '<p>Your <strong>{{planName}}</strong> subscription on <strong>{{appName}}</strong> has been canceled. You will retain access until <strong>{{endDate}}</strong>.</p>' +
      '<p>If this was a mistake you can <a href="{{manageUrl}}">resubscribe</a>.</p>' +
      '<p>— The {{appName}} team</p>',
    variables: ['appName', 'userName', 'planName', 'endDate', 'manageUrl'],
  },

  [TEMPLATE_KEYS.paymentFailed]: {
    key: TEMPLATE_KEYS.paymentFailed,
    subjectKey: 'emailTemplates.paymentFailed.subject',
    defaultSubject: 'Action required: payment failed for {{appName}}',
    textKey: 'emailTemplates.paymentFailed.text',
    defaultText:
      'Hi {{userName}},\n\nWe were unable to charge {{amount}} for your {{planName}} subscription on {{appName}}. ' +
      'Please update your payment method to keep your access:\n{{manageUrl}}\n\n— The {{appName}} team',
    htmlKey: 'emailTemplates.paymentFailed.html',
    defaultHtml:
      '<p>Hi {{userName}},</p>' +
      '<p>We were unable to charge <strong>{{amount}}</strong> for your <strong>{{planName}}</strong> subscription on <strong>{{appName}}</strong>. ' +
      'Please <a href="{{manageUrl}}">update your payment method</a> to keep your access.</p>' +
      '<p>— The {{appName}} team</p>',
    variables: ['appName', 'userName', 'planName', 'amount', 'manageUrl'],
  },

  [TEMPLATE_KEYS.usageLimitWarning]: {
    key: TEMPLATE_KEYS.usageLimitWarning,
    subjectKey: 'emailTemplates.usageLimitWarning.subject',
    defaultSubject: 'You are approaching your {{usageMetric}} limit on {{appName}}',
    textKey: 'emailTemplates.usageLimitWarning.text',
    defaultText:
      'Hi {{userName}},\n\nYou have used most of your {{usageMetric}} allowance ({{usageLimit}}) on the {{planName}} plan. ' +
      'Upgrade to keep going without interruption:\n{{manageUrl}}\n\n— The {{appName}} team',
    htmlKey: 'emailTemplates.usageLimitWarning.html',
    defaultHtml:
      '<p>Hi {{userName}},</p>' +
      '<p>You have used most of your <strong>{{usageMetric}}</strong> allowance (<strong>{{usageLimit}}</strong>) on the <strong>{{planName}}</strong> plan.</p>' +
      '<p><a href="{{manageUrl}}">Upgrade your plan</a> to keep going without interruption.</p>' +
      '<p>— The {{appName}} team</p>',
    variables: ['appName', 'userName', 'planName', 'usageMetric', 'usageLimit', 'manageUrl'],
  },

  [TEMPLATE_KEYS.trialEnding]: {
    key: TEMPLATE_KEYS.trialEnding,
    subjectKey: 'emailTemplates.trialEnding.subject',
    defaultSubject: 'Your {{appName}} trial ends on {{endDate}}',
    textKey: 'emailTemplates.trialEnding.text',
    defaultText:
      'Hi {{userName}},\n\nYour free trial of {{planName}} on {{appName}} ends on {{endDate}}. ' +
      'You will be charged {{amount}} per {{period}} unless you cancel before then.\n\nManage your subscription:\n{{manageUrl}}\n\n— The {{appName}} team',
    htmlKey: 'emailTemplates.trialEnding.html',
    defaultHtml:
      '<p>Hi {{userName}},</p>' +
      '<p>Your free trial of <strong>{{planName}}</strong> on <strong>{{appName}}</strong> ends on <strong>{{endDate}}</strong>. ' +
      'You will be charged <strong>{{amount}}</strong> per {{period}} unless you cancel before then.</p>' +
      '<p><a href="{{manageUrl}}">Manage your subscription</a></p>' +
      '<p>— The {{appName}} team</p>',
    variables: ['appName', 'userName', 'planName', 'amount', 'period', 'endDate', 'manageUrl'],
  },
}
