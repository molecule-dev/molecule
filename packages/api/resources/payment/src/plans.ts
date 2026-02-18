import { t } from '@molecule/api-i18n'

import type { Plan } from './types.js'

const defaultPlan: Plan = {
  planKey: '',
  platformKey: '',
  platformProductId: '',
  alias: '',
  period: '',
  price: '',
  title: t('payment.plan.free.title', undefined, { defaultValue: 'Free' }),
  titleKey: 'payment.plan.free.title',
  description: t('payment.plan.free.description', undefined, {
    defaultValue: 'Free plan with limited features',
  }),
  descriptionKey: 'payment.plan.free.description',
  shortDescription: t('payment.plan.free.shortDescription', undefined, { defaultValue: 'Free' }),
  shortDescriptionKey: 'payment.plan.free.shortDescription',
  capabilities: {
    premium: false,
  },
}

/** Stripe monthly subscription plan ($5/month, auto-renews). */
export const stripeMonthly: Plan = {
  planKey: 'stripeMonthly',
  platformKey: 'stripe',
  platformProductId: process.env.NODE_ENV === 'production' ? 'price_prod_id' : 'price_test_id',
  alias: 'monthly',
  period: 'month',
  price: '$5',
  autoRenews: true,
  title: t('payment.plan.monthly.title', undefined, { defaultValue: 'Monthly' }),
  titleKey: 'payment.plan.monthly.title',
  description: t('payment.plan.premium.description', undefined, {
    defaultValue: 'Full access to premium features',
  }),
  descriptionKey: 'payment.plan.premium.description',
  capabilities: { premium: true },
}

/** Stripe yearly subscription plan ($55/year, auto-renews). */
export const stripeYearly: Plan = {
  planKey: 'stripeYearly',
  platformKey: 'stripe',
  platformProductId: process.env.NODE_ENV === 'production' ? 'price_prod_id' : 'price_test_id',
  alias: 'yearly',
  period: 'year',
  price: '$55',
  autoRenews: true,
  title: t('payment.plan.yearly.title', undefined, { defaultValue: 'Yearly' }),
  titleKey: 'payment.plan.yearly.title',
  description: t('payment.plan.premium.description', undefined, {
    defaultValue: 'Full access to premium features',
  }),
  descriptionKey: 'payment.plan.premium.description',
  highlightedDescription: t('payment.plan.yearly.highlightedDescription', undefined, {
    defaultValue: 'Save with annual billing',
  }),
  highlightedDescriptionKey: 'payment.plan.yearly.highlightedDescription',
  capabilities: { premium: true },
}

/** Apple App Store monthly subscription plan ($5.99/month, auto-renews). */
export const appleMonthly: Plan = {
  planKey: 'appleMonthly',
  platformKey: 'apple',
  platformProductId: 'molecule_monthly_early_adopter',
  alias: 'monthly',
  period: 'month',
  price: '$5.99',
  autoRenews: true,
  title: t('payment.plan.monthly.title', undefined, { defaultValue: 'Monthly' }),
  titleKey: 'payment.plan.monthly.title',
  description: t('payment.plan.premium.description', undefined, {
    defaultValue: 'Full access to premium features',
  }),
  descriptionKey: 'payment.plan.premium.description',
  capabilities: { premium: true },
}

/** Apple App Store yearly subscription plan ($64.99/year, auto-renews). */
export const appleYearly: Plan = {
  planKey: 'appleYearly',
  platformKey: 'apple',
  platformProductId: 'molecule_yearly_early_adopter',
  alias: 'yearly',
  period: 'year',
  price: '$64.99',
  autoRenews: true,
  title: t('payment.plan.yearly.title', undefined, { defaultValue: 'Yearly' }),
  titleKey: 'payment.plan.yearly.title',
  description: t('payment.plan.premium.description', undefined, {
    defaultValue: 'Full access to premium features',
  }),
  descriptionKey: 'payment.plan.premium.description',
  highlightedDescription: t('payment.plan.yearly.highlightedDescription', undefined, {
    defaultValue: 'Save with annual billing',
  }),
  highlightedDescriptionKey: 'payment.plan.yearly.highlightedDescription',
  capabilities: { premium: true },
}

/** Google Play monthly subscription plan ($5.99/month, auto-renews). */
export const googleMonthly: Plan = {
  planKey: 'googleMonthly',
  platformKey: 'google',
  platformProductId: 'monthly_early_adopter',
  alias: 'monthly',
  period: 'month',
  price: '$5.99',
  autoRenews: true,
  title: t('payment.plan.monthly.title', undefined, { defaultValue: 'Monthly' }),
  titleKey: 'payment.plan.monthly.title',
  description: t('payment.plan.premium.description', undefined, {
    defaultValue: 'Full access to premium features',
  }),
  descriptionKey: 'payment.plan.premium.description',
  capabilities: { premium: true },
}

/** Google Play yearly subscription plan ($64.99/year, auto-renews). */
export const googleYearly: Plan = {
  planKey: 'googleYearly',
  platformKey: 'google',
  platformProductId: 'yearly_early_adopter',
  alias: 'yearly',
  period: 'year',
  price: '$64.99',
  autoRenews: true,
  title: t('payment.plan.yearly.title', undefined, { defaultValue: 'Yearly' }),
  titleKey: 'payment.plan.yearly.title',
  description: t('payment.plan.premium.description', undefined, {
    defaultValue: 'Full access to premium features',
  }),
  descriptionKey: 'payment.plan.premium.description',
  highlightedDescription: t('payment.plan.yearly.highlightedDescription', undefined, {
    defaultValue: 'Save with annual billing',
  }),
  highlightedDescriptionKey: 'payment.plan.yearly.highlightedDescription',
  capabilities: { premium: true },
}

/** All available plans indexed by planKey. The empty string key `''` maps to the default free plan. */
export const plans: Record<string, Plan> = {
  '': defaultPlan,
  stripeMonthly,
  stripeYearly,
  appleMonthly,
  appleYearly,
  googleMonthly,
  googleYearly,
}
