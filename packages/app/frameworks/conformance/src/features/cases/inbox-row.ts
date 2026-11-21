/**
 * `@molecule/app-inbox-row-react` cases: one inbox / message-list row —
 * selection slot, star toggle, avatar, sender + labels, subject + preview,
 * attachment indicator, unread dot, timestamp, and the click / star
 * callbacks.
 *
 * `InboxRow` is the package's only runtime export. While `onClick` is set the
 * whole row is clickable through a transparent native button laid over it:
 * clicking anywhere that is not a raised control (the star toggle, the
 * selection slot, the labels slot) clicks that button, and `onClick` is called
 * with no arguments in every framework; `onToggleStar` takes no arguments too.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The row's open action: the transparent button React lays over the row while `onClick` is set. */
const openSelector = 'button[data-mol-id="inbox-row-open"]'
/** The star toggle button, selected by the id React gives it. */
const starSelector = 'button[data-mol-id="inbox-row-star"]'

const labels = [{ tag: 'span', attrs: { 'data-label': '' }, children: ['Work'] }]
const labelsProp = { $nodes: labels }
const selectionSlot = [{ tag: 'span', attrs: { 'data-select': '' }, children: ['◻'] }]
const selectionProp = { $nodes: selectionSlot }
const senderNode = [{ tag: 'strong', children: ['Alice'] }]
const subjectNode = [{ tag: 'em', children: ['Lunch?'] }]
const previewNode = [{ tag: 'b', children: ['see you then'] }]
const timestampNode = [{ tag: 'time', children: ['10:42'] }]
const toggleStar = { $callback: 'onToggleStar' }

/** `@molecule/app-inbox-row-react`. */
export const inboxRowFeature: FeatureCases = {
  package: '@molecule/app-inbox-row-react',
  families: [
    {
      component: 'InboxRow',
      cases: [
        // The first case also runs again with a pseudo-locale switch
        // ("…, then a locale switch"): the star's aria-label must follow it.
        {
          name: 'sender and subject with a star toggle',
          props: { sender: 'Alice Johnson', subject: 'Q3 report is ready' },
          callbacks: ['onToggleStar'],
        },
        {
          name: 'sender and subject only',
          props: { sender: 'Alice Johnson', subject: 'Lunch?' },
        },
        {
          name: 'preview text',
          props: {
            sender: 'Alice',
            subject: 'Lunch?',
            preview: 'Hi, attached the final numbers for review',
          },
        },
        {
          name: 'timestamp',
          props: { sender: 'Alice', subject: 'Lunch?', timestamp: '10:42 AM' },
        },
        { name: 'labels slot', props: { sender: 'Alice', subject: 'Lunch?' }, slots: { labels } },
        {
          name: 'labels node prop',
          props: { sender: 'Alice', subject: 'Lunch?', labels: labelsProp },
        },
        {
          name: 'selection slot',
          props: { sender: 'Alice', subject: 'Lunch?' },
          slots: { selectionSlot },
        },
        {
          name: 'selection node prop',
          props: { sender: 'Alice', subject: 'Lunch?', selectionSlot: selectionProp },
        },
        {
          name: 'attachment indicator',
          props: { sender: 'Alice', subject: 'Lunch?', hasAttachment: true },
        },
        {
          name: 'unread row',
          props: { sender: 'Alice', subject: 'Lunch?', unread: true },
        },
        {
          name: 'explicitly read row',
          props: { sender: 'Alice', subject: 'Lunch?', unread: false },
        },
        {
          name: 'starred with a star toggle',
          props: { sender: 'Alice', subject: 'Lunch?', starred: true },
          callbacks: ['onToggleStar'],
        },
        {
          name: 'unstarred with a star toggle',
          props: { sender: 'Alice', subject: 'Lunch?', starred: false },
          callbacks: ['onToggleStar'],
        },
        {
          name: 'avatar image for a string sender',
          props: {
            sender: 'Alice',
            subject: 'Lunch?',
            senderAvatarSrc: 'https://example.com/alice.jpg',
          },
        },
        {
          name: 'avatar image and a node sender',
          props: { subject: 'Lunch?', senderAvatarSrc: 'https://example.com/alice.jpg' },
          slots: { sender: senderNode },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
        {
          name: 'node sender falls back to the translated name',
          props: { subject: 'Lunch?' },
          slots: { sender: senderNode },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
        {
          name: 'node subject, preview and timestamp',
          props: { sender: 'Alice' },
          slots: { subject: subjectNode, preview: previewNode, timestamp: timestampNode },
        },
        {
          name: 'attachment and star labels after a locale switch',
          props: { sender: 'Alice', subject: 'Lunch?', hasAttachment: true },
          callbacks: ['onToggleStar'],
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
        {
          name: 'className passthrough',
          props: { sender: 'Alice', subject: 'Lunch?', className: 'parity-token' },
        },
        {
          name: 'clicking the row calls onClick',
          props: { sender: 'Alice', subject: 'Lunch?' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: openSelector }],
        },
        {
          name: 'clicking the star calls onToggleStar alone',
          props: { sender: 'Alice', subject: 'Lunch?' },
          callbacks: ['onClick', 'onToggleStar'],
          interactions: [{ type: 'click', selector: starSelector }],
        },
        {
          name: 'clicking the star twice',
          props: { sender: 'Alice', subject: 'Lunch?', starred: true },
          callbacks: ['onToggleStar'],
          interactions: [
            { type: 'click', selector: starSelector },
            { type: 'click', selector: starSelector },
          ],
        },
        {
          name: 'the row is not clickable without onClick',
          props: { sender: 'Alice', subject: 'Lunch?' },
          interactions: [{ type: 'click', selector: 'span' }],
        },
        {
          name: 'preview, timestamp, attachment and labels appear',
          props: { sender: 'Alice', subject: 'Lunch?' },
          interactions: [
            {
              type: 'props',
              props: {
                preview: 'later',
                timestamp: '9:41',
                hasAttachment: true,
                labels: labelsProp,
              },
            },
          ],
        },
        {
          name: 'optional props removed again',
          props: {
            sender: 'Alice',
            subject: 'Lunch?',
            preview: 'later',
            timestamp: '9:41',
            hasAttachment: true,
            labels: labelsProp,
            selectionSlot: selectionProp,
          },
          interactions: [
            {
              type: 'props',
              props: {
                preview: null,
                timestamp: null,
                hasAttachment: false,
                labels: null,
                selectionSlot: null,
              },
            },
          ],
        },
        {
          name: 'the row becomes unread',
          props: { sender: 'Alice', subject: 'Lunch?', unread: false },
          interactions: [{ type: 'props', props: { unread: true } }],
        },
        {
          name: 'the star becomes selected',
          props: { sender: 'Alice', subject: 'Lunch?', starred: false },
          callbacks: ['onToggleStar'],
          interactions: [{ type: 'props', props: { starred: true } }],
        },
        {
          name: 'a star toggle appears after mount',
          props: { sender: 'Alice', subject: 'Lunch?', starred: true },
          callbacks: ['onToggleStar'],
          interactions: [{ type: 'props', props: { onToggleStar: toggleStar } }],
        },
        {
          name: 'sender text and className change',
          props: { sender: 'Alice', subject: 'Lunch?' },
          interactions: [
            {
              type: 'props',
              props: { sender: 'Bob', subject: 'New subject', className: 'parity-other' },
            },
          ],
        },
        {
          name: 'everything at once',
          props: {
            sender: 'Alice',
            senderAvatarSrc: 'https://example.com/alice.jpg',
            subject: 'Q3 report is ready',
            preview: 'Hi, attached the final numbers for review',
            timestamp: '10:42 AM',
            unread: true,
            starred: true,
            hasAttachment: true,
            className: 'parity-token',
          },
          slots: { labels, selectionSlot },
          callbacks: ['onClick', 'onToggleStar'],
          interactions: [{ type: 'click', selector: starSelector }],
        },
      ],
    },
  ],
}
