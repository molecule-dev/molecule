/**
 * `@molecule/app-integration-card-react` cases: the integration / connection
 * card — icon, title, description, the four status labels, and the action as a
 * button (onClick, disabled, loading ellipsis) or a link (href), plus the
 * `cta` gradient variant and the ClassMap / inline-style treatment.
 *
 * `IntegrationCard` is the package's only runtime export. The action's
 * `onClick` lives inside the `action` prop, so it rides the nested
 * `$callback` marker; the status labels go through `t()` under
 * `integrationCard.status.*`, proven by the locale-switch case.
 *
 * @module
 */

import type { CaseA11y } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The case passes an action with an empty label. */
const EMPTY_ACTION_LABEL: CaseA11y = {
  expect: ['button-name'],
  reason: 'The case passes an action with an empty label',
}

/** A leading icon, the way a caller passes a node. */
const icon = [{ tag: 'span', attrs: { 'data-icon': '' }, children: ['🔌'] }]
/** A node-valued title. */
const titleNode = [{ tag: 'strong', attrs: { 'data-node': 'title' }, children: ['Slack'] }]
/** A node-valued description. */
const descriptionNode = [
  { tag: 'em', attrs: { 'data-node': 'description' }, children: ['Team notifications'] },
]
/** A node-valued action label, nested inside the `action` prop. */
const labelNode = {
  $nodes: [{ tag: 'span', attrs: { 'data-node': 'action' }, children: ['Connect'] }],
}
/** The recording spy for the action's `onClick`, nested inside `action`. */
const connect = { $callback: 'connect' }

/** `@molecule/app-integration-card-react`. */
export const integrationCardFeature: FeatureCases = {
  package: '@molecule/app-integration-card-react',
  families: [
    {
      component: 'IntegrationCard',
      cases: [
        { name: 'title only', props: { title: 'Slack' } },
        {
          name: 'title and description',
          props: { title: 'Slack', description: 'Send notifications to your team channels.' },
        },
        { name: 'an icon', props: { title: 'Slack' }, slots: { icon } },
        { name: 'a node title', slots: { title: titleNode } },
        {
          name: 'node title, description and icon',
          slots: { icon, title: titleNode, description: descriptionNode },
        },
        { name: 'an empty description is omitted', props: { title: 'Slack', description: '' } },
        { name: 'status connected', props: { title: 'Slack', status: 'connected' } },
        { name: 'status pending', props: { title: 'Slack', status: 'pending' } },
        { name: 'status error', props: { title: 'Slack', status: 'error' } },
        { name: 'status disconnected', props: { title: 'Slack', status: 'disconnected' } },
        {
          name: 'action button',
          props: { title: 'Slack', action: { label: 'Connect', onClick: connect } },
        },
        {
          name: 'action button without a handler',
          props: { title: 'Slack', action: { label: 'Connect' } },
        },
        {
          name: 'action link',
          props: { title: 'Slack', action: { label: 'Connect', href: '/oauth/slack' } },
        },
        {
          name: 'disabled action button',
          props: {
            title: 'Slack',
            action: { label: 'Connect', onClick: connect, disabled: true },
          },
        },
        {
          name: 'disabled action link',
          props: { title: 'Slack', action: { label: 'Connect', href: '/oauth', disabled: true } },
        },
        {
          name: 'loading action shows the ellipsis',
          props: {
            title: 'Slack',
            action: { label: 'Connect', onClick: connect, loading: true },
          },
        },
        {
          name: 'loading action link keeps its label',
          props: {
            title: 'Slack',
            action: { label: 'Connect', href: '/oauth', loading: true },
          },
        },
        {
          name: 'action with a node label',
          props: { title: 'Slack', action: { label: labelNode, onClick: connect } },
        },
        {
          name: 'action with an empty label',
          a11y: EMPTY_ACTION_LABEL,
          props: { title: 'Slack', action: { label: '', onClick: connect } },
        },
        { name: 'cta variant', props: { title: 'Slack', variant: 'cta' } },
        { name: 'card variant', props: { title: 'Slack', variant: 'card' } },
        {
          name: 'className and dataMolId',
          props: { title: 'Slack', className: 'parity-token', dataMolId: 'slack-card' },
        },
        {
          name: 'clicking the action calls onClick',
          props: { title: 'Slack', action: { label: 'Connect', onClick: connect } },
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'clicking a disabled action calls nothing',
          props: {
            title: 'Slack',
            action: { label: 'Connect', onClick: connect, disabled: true },
          },
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'clicking a loading action calls nothing',
          props: {
            title: 'Slack',
            action: { label: 'Connect', onClick: connect, loading: true },
          },
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'status changes',
          props: { title: 'Slack', status: 'connected' },
          interactions: [{ type: 'props', props: { status: 'error' } }],
        },
        {
          name: 'title and description change',
          props: { title: 'Slack', description: 'Send notifications' },
          interactions: [
            { type: 'props', props: { title: 'Teams', description: 'Post to a channel' } },
          ],
        },
        {
          name: 'the icon appears and is removed',
          props: { title: 'Slack' },
          interactions: [
            { type: 'props', props: { icon: { $nodes: icon } } },
            { type: 'props', props: { icon: null } },
          ],
        },
        {
          name: 'the description appears and is removed',
          props: { title: 'Slack' },
          interactions: [
            { type: 'props', props: { description: 'Send notifications' } },
            { type: 'props', props: { description: null } },
          ],
        },
        {
          name: 'an action is added after mount and clicks',
          props: { title: 'Slack' },
          interactions: [
            { type: 'props', props: { action: { label: 'Connect', onClick: connect } } },
            { type: 'click', selector: 'button' },
          ],
        },
        {
          name: 'the action switches from a button to a link',
          props: { title: 'Slack', action: { label: 'Connect', onClick: connect } },
          interactions: [
            { type: 'props', props: { action: { label: 'Connect', href: '/oauth' } } },
          ],
        },
        {
          name: 'the variant switches to cta and back',
          props: { title: 'Slack', variant: 'card' },
          interactions: [
            { type: 'props', props: { variant: 'cta' } },
            { type: 'props', props: { variant: 'card' } },
          ],
        },
        {
          name: 'className and dataMolId are removed',
          props: { title: 'Slack', className: 'parity-token', dataMolId: 'slack-card' },
          interactions: [{ type: 'props', props: { className: null, dataMolId: null } }],
        },
        {
          name: 'every status label follows a locale switch',
          props: { title: 'Slack', status: 'connected' },
          context: {
            translations: {
              'en-XA': {
                integrationCard: {
                  status: {
                    connected: 'Conectado',
                    pending: 'Conectando…',
                    error: 'Erro',
                    disconnected: 'Desconectado',
                  },
                },
              },
            },
          },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
      ],
    },
  ],
}
