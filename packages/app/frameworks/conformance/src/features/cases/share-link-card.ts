/**
 * `@molecule/app-share-link-card-react` cases: the share URL field with its
 * copy button, the optional title/description header, the QR slot (rendered
 * only when BOTH `showQR` and a `qr` node are set), the optional
 * password-protect toggle row, and the `className`/`dataMolId` passthrough.
 *
 * `ShareLinkCard` is the package's only runtime export; the copy field it
 * renders is internal. `passwordProtect.onChange` receives the switch's new
 * boolean state, so it is a nested `{ $callback }` inside the data prop (its
 * recorded call is `[true]`/`[false]`). The QR node, the title, the
 * description and a custom password label are node-valued props, passed as
 * slots.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const qr = [{ tag: 'span', attrs: { 'data-qr': '' }, children: ['QR'] }]
const titleNode = [{ tag: 'strong', children: ['Share this'] }]
const descriptionNode = [{ tag: 'em', children: ['Anyone with the link'] }]
const customLabel = { $nodes: [{ tag: 'em', children: ['Require a password'] }] }
const passwordChange = { $callback: 'onPasswordChange' }

/** `@molecule/app-share-link-card-react`. */
export const shareLinkCardFeature: FeatureCases = {
  package: '@molecule/app-share-link-card-react',
  families: [
    {
      component: 'ShareLinkCard',
      cases: [
        { name: 'url only', props: { url: 'https://x.test/p/abc123' } },
        {
          name: 'title and description',
          props: { url: 'u' },
          slots: { title: ['Share this project'], description: ['Anyone with the link can view.'] },
        },
        { name: 'title only', props: { url: 'u' }, slots: { title: ['Share this project'] } },
        {
          name: 'description only',
          props: { url: 'u' },
          slots: { description: ['Anyone with the link can view.'] },
        },
        {
          name: 'node title and node description',
          props: { url: 'u' },
          slots: { title: titleNode, description: descriptionNode },
        },
        {
          name: 'qr present but showQR defaults to false',
          props: { url: 'u' },
          slots: { qr },
        },
        {
          name: 'qr present and showQR true',
          props: { url: 'u', showQR: true },
          slots: { qr },
        },
        { name: 'showQR true without a qr node', props: { url: 'u', showQR: true } },
        {
          name: 'password protect with the default label',
          props: {
            url: 'u',
            passwordProtect: { enabled: false, onChange: passwordChange },
          },
        },
        {
          name: 'password protect enabled',
          props: {
            url: 'u',
            passwordProtect: { enabled: true, onChange: passwordChange },
          },
        },
        {
          name: 'password protect with a custom text label',
          props: {
            url: 'u',
            passwordProtect: {
              enabled: false,
              onChange: passwordChange,
              label: 'Require a password',
            },
          },
        },
        {
          name: 'password protect with a node label',
          props: {
            url: 'u',
            passwordProtect: { enabled: false, onChange: passwordChange, label: customLabel },
          },
        },
        {
          name: 'clicking the copy button',
          props: { url: 'https://x.test/p/abc123' },
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'focus and key presses on the copy field',
          props: { url: 'https://x.test/p/abc123' },
          interactions: [
            { type: 'focus', selector: 'input' },
            { type: 'keydown', selector: 'input', key: 'Tab' },
            { type: 'blur', selector: 'input' },
          ],
        },
        {
          name: 'clicking the password switch turns it on',
          props: {
            url: 'u',
            passwordProtect: { enabled: false, onChange: passwordChange },
          },
          interactions: [{ type: 'click', selector: 'button[role="switch"]' }],
        },
        {
          name: 'clicking an enabled password switch turns it off',
          props: {
            url: 'u',
            passwordProtect: { enabled: true, onChange: passwordChange },
          },
          interactions: [{ type: 'click', selector: 'button[role="switch"]' }],
        },
        {
          name: 'the url changes',
          props: { url: 'https://x.test/one' },
          interactions: [{ type: 'props', props: { url: 'https://x.test/two' } }],
        },
        {
          name: 'showQR turns on',
          props: { url: 'u', showQR: false },
          slots: { qr },
          interactions: [{ type: 'props', props: { showQR: true } }],
        },
        {
          name: 'showQR turns off',
          props: { url: 'u', showQR: true },
          slots: { qr },
          interactions: [{ type: 'props', props: { showQR: false } }],
        },
        {
          name: 'password protect is added after mount',
          props: { url: 'u' },
          interactions: [
            {
              type: 'props',
              props: { passwordProtect: { enabled: false, onChange: passwordChange } },
            },
          ],
        },
        {
          name: 'password protect is removed after mount',
          props: {
            url: 'u',
            passwordProtect: { enabled: true, onChange: passwordChange },
          },
          interactions: [{ type: 'props', props: { passwordProtect: null } }],
        },
        {
          name: 'the password toggle changes state',
          props: {
            url: 'u',
            passwordProtect: { enabled: true, onChange: passwordChange },
          },
          interactions: [
            {
              type: 'props',
              props: { passwordProtect: { enabled: false, onChange: passwordChange } },
            },
          ],
        },
        {
          name: 'className and dataMolId passthrough',
          props: { url: 'u', className: 'parity-token', dataMolId: 'share-x' },
        },
        {
          name: 'everything at once',
          props: {
            url: 'https://x.test/p/abc123',
            showQR: true,
            className: 'parity-token',
            dataMolId: 'share-all',
            passwordProtect: {
              enabled: true,
              onChange: passwordChange,
              label: 'Require a password',
            },
          },
          slots: { title: ['Share this project'], description: ['Anyone with the link.'], qr },
        },
      ],
    },
  ],
}
