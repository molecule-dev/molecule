/**
 * The markdown DOM and table of contents every `@molecule/app-markdown`
 * provider must produce, one case per decided behaviour.
 *
 * The cases come from the design review in
 * `.experiments/reviews/feature-parity/markdown-parity/fable-report.md`
 * (section A): the 16-row table of differences between the two providers, the
 * samples in its `probe.mjs` and `options.mjs`, and the extra inputs it ran.
 * `html` is the DOM the report decided is correct, not any provider's current
 * output, and `toc` is the exact table of contents — `[]` when the document
 * has no headings. Every case names where it comes from in `sources`.
 *
 * A provider's own options that are not part of `MarkdownOptions` (the
 * `components` override, and the old `toc: true` switch, which is now always
 * on because `RenderedMarkdown.toc` is required) are not carried here.
 *
 * @module
 */

import type { MarkdownOptions, TocEntry } from '@molecule/app-markdown'

/** One conformance case: markdown in, the correct DOM and table of contents out. */
export interface MarkdownCase {
  /** Unique test name. */
  name: string

  /** The markdown source rendered. */
  markdown: string

  /** Options passed to `render()`. */
  options?: MarkdownOptions

  /** The correct rendered HTML; compared as a DOM, not as text. Unused when {@link MarkdownCase.throws} is set. */
  html: string

  /**
   * The `i18nKey` of the `I18nError` `render()` must throw instead of rendering: options a provider refuses
   * (an `elementAttributes` entry the renderer owns) are refused by every provider the same way.
   */
  throws?: string

  /**
   * The exact table of contents. Given whenever the document has headings,
   * and `[]` for documents without any.
   */
  toc?: TocEntry[]

  /**
   * Where the case comes from: `row:<n>` for a row of the report's table
   * (row 11's `components` is provider-specific and stays in each bond's own
   * tests; its replacement, `elementAttributes`, is here), `probe:<name>` for
   * a sample in `probe.mjs`, `options:<name>` for an entry in `options.mjs`,
   * and `extra:<slug>` for one of the report's extra inputs.
   */
  sources: string[]
}

/**
 * The footnote DOM both providers produce, with no class names and no
 * `<h2>`: a labelled `data-footnotes` section, one back link (or several, for
 * repeated references) per note. Labels are English because no locale is
 * bonded in the harness.
 */
const footnoteSection = (): string =>
  '<section data-footnotes aria-label="Footnotes"><ol>' +
  '<li id="fn-1"><p>note ' +
  '<a href="#fnref-1" data-footnote-backref aria-label="Back to reference 1">↩</a>' +
  '</p></li></ol></section>'

/**
 * Every markdown conformance case.
 */
export const markdownCases: readonly MarkdownCase[] = [
  {
    name: 'heading and subheading',
    markdown: '# Title\n\n## Sub title',
    html: '<h1 id="title">Title</h1><h2 id="sub-title">Sub title</h2>',
    toc: [
      { id: 'title', text: 'Title', level: 1 },
      { id: 'sub-title', text: 'Sub title', level: 2 },
    ],
    sources: ['probe:heading'],
  },
  {
    name: 'emphasis, strong and inline code',
    markdown: 'Some *em* and **strong** and `code`.',
    html: '<p>Some <em>em</em> and <strong>strong</strong> and <code>code</code>.</p>',
    toc: [],
    sources: ['probe:emphasis', 'row:8'],
  },
  {
    name: 'link and autolink',
    markdown: '[site](https://example.com) and <https://auto.link>',
    html: '<p><a href="https://example.com">site</a> and <a href="https://auto.link">https://auto.link</a></p>',
    toc: [],
    sources: ['probe:link'],
  },
  {
    name: 'unsafe link renders its text and raw html is escaped',
    markdown: '[x](javascript:alert(1)) <script>alert(1)</script> <b>raw</b>',
    html: '<p>x &lt;script&gt;alert(1)&lt;/script&gt; &lt;b&gt;raw&lt;/b&gt;</p>',
    toc: [],
    sources: ['probe:unsafe', 'row:1'],
  },
  {
    name: 'unordered and ordered lists',
    markdown: '- a\n- b\n  - c\n\n1. one\n2. two',
    html: '<ul><li>a</li><li>b<ul><li>c</li></ul></li></ul><ol><li>one</li><li>two</li></ol>',
    toc: [],
    sources: ['probe:list'],
  },
  {
    name: 'fenced code block',
    markdown: '```js\nconst a = 1\n```',
    html: '<pre><code class="language-js">const a = 1\n</code></pre>',
    toc: [],
    sources: ['probe:code'],
  },
  {
    name: 'gfm table',
    markdown: '| a | b |\n|---|---|\n| 1 | 2 |',
    html: '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
    toc: [],
    sources: ['probe:table'],
  },
  {
    name: 'task list',
    markdown: '- [x] done\n- [ ] todo',
    html: '<ul><li><input type="checkbox" disabled checked> done</li><li><input type="checkbox" disabled> todo</li></ul>',
    toc: [],
    sources: ['probe:task', 'row:13'],
  },
  {
    name: 'blockquote and soft line breaks',
    markdown: '> quoted\n\nline one\nline two',
    html: '<blockquote><p>quoted</p></blockquote><p>line one line two</p>',
    toc: [],
    sources: ['probe:quote'],
  },
  {
    name: 'image with title',
    markdown: '![alt](https://example.com/i.png "t")',
    html: '<p><img src="https://example.com/i.png" alt="alt" title="t"></p>',
    toc: [],
    sources: ['probe:image'],
  },
  {
    name: 'strikethrough',
    markdown: '~~gone~~',
    html: '<p><del>gone</del></p>',
    toc: [],
    sources: ['probe:strike'],
  },
  {
    name: 'raw html passes through when sanitize is false',
    markdown: '<b>raw</b> <span style="color:red">x</span>',
    options: { sanitize: false },
    html: '<p><b>raw</b> <span style="color:red">x</span></p>',
    toc: [],
    sources: ['options:raw html, sanitize false', 'row:9'],
  },
  {
    name: 'raw html is escaped by default',
    markdown: '<b>raw</b>',
    html: '<p>&lt;b&gt;raw&lt;/b&gt;</p>',
    toc: [],
    sources: ['options:raw html, sanitize default'],
  },
  {
    name: 'soft breaks become br when breaks is on',
    markdown: 'a\nb',
    options: { breaks: true },
    html: '<p>a<br>b</p>',
    toc: [],
    sources: ['options:breaks'],
  },
  {
    name: 'soft breaks stay text when breaks is off',
    markdown: 'a\nb',
    html: '<p>a b</p>',
    toc: [],
    sources: ['options:no breaks'],
  },
  {
    name: 'gfm off renders a pipe table as text',
    markdown: '| a |\n|---|\n| 1 |',
    options: { gfm: false },
    html: '<p>| a | |---| | 1 |</p>',
    toc: [],
    sources: ['options:gfm off table'],
  },
  {
    name: 'gfm off renders strikethrough as text',
    markdown: '~~x~~',
    options: { gfm: false },
    html: '<p>~~x~~</p>',
    toc: [],
    sources: ['options:gfm off strike'],
  },
  {
    name: 'gfm off leaves a bare url as text',
    markdown: 'see https://x.com now',
    options: { gfm: false },
    html: '<p>see https://x.com now</p>',
    toc: [],
    sources: ['options:gfm off autolink'],
  },
  {
    name: 'gfm autolinks a bare url',
    markdown: 'see https://x.com now',
    html: '<p>see <a href="https://x.com">https://x.com</a> now</p>',
    toc: [],
    sources: ['options:gfm autolink'],
  },
  {
    name: 'link target blank adds target and rel',
    markdown: '[a](https://x.com)',
    options: { linkTarget: '_blank' },
    html: '<p><a href="https://x.com" target="_blank" rel="noopener noreferrer">a</a></p>',
    toc: [],
    sources: ['options:link target blank'],
  },
  {
    name: 'link target self emits no target',
    markdown: '[a](https://x.com)',
    options: { linkTarget: '_self' },
    html: '<p><a href="https://x.com">a</a></p>',
    toc: [],
    sources: ['options:link target self', 'row:14'],
  },
  {
    name: 'unsafe image renders its alt text',
    markdown: '![x](javascript:alert(1))',
    html: '<p>x</p>',
    toc: [],
    sources: ['options:unsafe img', 'row:1'],
  },
  {
    name: 'data url image renders its alt text',
    markdown: '![x](data:image/png;base64,AAAA)',
    html: '<p>x</p>',
    toc: [],
    sources: ['options:data url img', 'row:2'],
  },
  {
    name: 'mailto link',
    markdown: '[m](mailto:a@b.c)',
    html: '<p><a href="mailto:a@b.c">m</a></p>',
    toc: [],
    sources: ['options:mailto', 'row:2'],
  },
  {
    name: 'relative and fragment links',
    markdown: '[r](/docs/a) [h](#top)',
    html: '<p><a href="/docs/a">r</a> <a href="#top">h</a></p>',
    toc: [],
    sources: ['options:relative', 'row:2'],
  },
  {
    name: 'duplicate headings get unique ids',
    markdown: '# A\n# A',
    html: '<h1 id="a">A</h1><h1 id="a-2">A</h1>',
    toc: [
      { id: 'a', text: 'A', level: 1 },
      { id: 'a-2', text: 'A', level: 1 },
    ],
    sources: ['options:duplicate headings', 'row:3'],
  },
  {
    name: 'toc text is the heading rendered text',
    markdown: '# Use `x`',
    html: '<h1 id="use-x">Use <code>x</code></h1>',
    toc: [{ id: 'use-x', text: 'Use x', level: 1 }],
    sources: ['options:heading with code', 'row:6'],
  },
  {
    name: 'html entities',
    markdown: 'a &amp; b &copy;',
    html: '<p>a &amp; b ©</p>',
    toc: [],
    sources: ['options:html entity'],
  },
  {
    name: 'hard break from two trailing spaces',
    markdown: 'a  \nb',
    html: '<p>a<br>b</p>',
    toc: [],
    sources: ['options:hard break two spaces'],
  },
  {
    name: 'footnote',
    markdown: 'x[^1]\n\n[^1]: note',
    html:
      '<p>x<sup><a href="#fn-1" id="fnref-1" data-footnote-ref>1</a></sup></p>' + footnoteSection(),
    toc: [],
    sources: ['options:footnote', 'row:12'],
  },
  {
    name: 'a hash line inside a code fence is not a heading',
    markdown: '# Title\n\n```sh\n# line\n```\n\n## End',
    html:
      '<h1 id="title">Title</h1>' +
      '<pre><code class="language-sh"># line\n</code></pre>' +
      '<h2 id="end">End</h2>',
    toc: [
      { id: 'title', text: 'Title', level: 1 },
      { id: 'end', text: 'End', level: 2 },
    ],
    sources: ['extra:code-fence-hash', 'row:7'],
  },
  {
    name: 'setext heading',
    markdown: 'Title\n=====',
    html: '<h1 id="title">Title</h1>',
    toc: [{ id: 'title', text: 'Title', level: 1 }],
    sources: ['extra:setext', 'row:7'],
  },
  {
    name: 'link inside a heading',
    markdown: '## See [the docs](/docs)',
    html: '<h2 id="see-the-docs">See <a href="/docs">the docs</a></h2>',
    toc: [{ id: 'see-the-docs', text: 'See the docs', level: 2 }],
    sources: ['extra:link-heading', 'row:6', 'row:7'],
  },
  {
    name: 'non latin heading gets a real id',
    markdown: '# 日本語',
    html: '<h1 id="日本語">日本語</h1>',
    toc: [{ id: '日本語', text: '日本語', level: 1 }],
    sources: ['extra:non-latin-heading', 'row:5'],
  },
  {
    name: 'tel link',
    markdown: '[t](tel:+1)',
    html: '<p><a href="tel:+1">t</a></p>',
    toc: [],
    sources: ['extra:tel', 'row:2'],
  },
  {
    name: 'title and alt text are escaped once',
    markdown: '[a](https://x.com "Tom & \\"Jerry\\"") ![Tom & "Jerry"](https://x.com/i.png)',
    html:
      '<p><a href="https://x.com" title="Tom &amp; &quot;Jerry&quot;">a</a> ' +
      '<img src="https://x.com/i.png" alt="Tom &amp; &quot;Jerry&quot;"></p>',
    toc: [],
    sources: ['extra:title-quotes', 'row:15'],
  },
  {
    name: 'repeated footnote reference',
    markdown: 'one[^1] two[^1]\n\n[^1]: note',
    html:
      '<p>one<sup><a href="#fn-1" id="fnref-1" data-footnote-ref>1</a></sup>' +
      ' two<sup><a href="#fn-1" id="fnref-1-2" data-footnote-ref>1</a></sup></p>' +
      '<section data-footnotes aria-label="Footnotes"><ol>' +
      '<li id="fn-1"><p>note ' +
      '<a href="#fnref-1" data-footnote-backref aria-label="Back to reference 1">↩</a> ' +
      '<a href="#fnref-1-2" data-footnote-backref aria-label="Back to reference 1-2">↩<sup>2</sup></a>' +
      '</p></li></ol></section>',
    toc: [],
    sources: ['extra:repeated-footnote', 'row:12'],
  },
  {
    name: 'nested task list',
    markdown: '- [x] a\n  - [ ] b',
    html:
      '<ul><li><input type="checkbox" disabled checked> a' +
      '<ul><li><input type="checkbox" disabled> b</li></ul></li></ul>',
    toc: [],
    sources: ['extra:nested-task-list', 'row:13'],
  },
  {
    name: 'ordered task list',
    markdown: '1. [x] one\n2. [ ] two',
    html:
      '<ol><li><input type="checkbox" disabled checked> one</li>' +
      '<li><input type="checkbox" disabled> two</li></ol>',
    toc: [],
    sources: ['extra:ordered-task-list', 'row:13'],
  },
  {
    name: 'safe scheme list',
    markdown: '[i](irc://x.com) [s](ircs://x.com) [x](xmpp:a@b)',
    html:
      '<p><a href="irc://x.com">i</a> <a href="ircs://x.com">s</a> ' +
      '<a href="xmpp:a@b">x</a></p>',
    toc: [],
    sources: ['row:2'],
  },
  {
    name: 'slug rule keeps letters and collapses underscores and hyphens',
    markdown: '# snake_case - and more',
    html: '<h1 id="snake-case-and-more">snake_case - and more</h1>',
    toc: [{ id: 'snake-case-and-more', text: 'snake_case - and more', level: 1 }],
    sources: ['row:4'],
  },
  {
    name: 'script schemes are dropped even with sanitize false',
    markdown: '[a](javascript:alert(1)) [b](vbscript:msgbox(1))',
    options: { sanitize: false },
    html: '<p>a b</p>',
    toc: [],
    sources: ['row:10'],
  },
  {
    name: 'a url with a space is percent encoded',
    markdown: '[a](<https://x.com/a b>)',
    html: '<p><a href="https://x.com/a%20b">a</a></p>',
    toc: [],
    sources: ['row:16'],
  },
  {
    name: 'heading with only an emoji falls back to section',
    markdown: '# 🎉',
    html: '<h1 id="section">🎉</h1>',
    toc: [{ id: 'section', text: '🎉', level: 1 }],
    sources: ['row:5'],
  },
  {
    name: 'heading punctuation is removed from the slug',
    markdown: '## Hello, World!',
    html: '<h2 id="hello-world">Hello, World!</h2>',
    toc: [{ id: 'hello-world', text: 'Hello, World!', level: 2 }],
    sources: ['row:4'],
  },
  {
    name: 'an image in a heading gives the toc and the id its alt text',
    markdown: '## ![Logo](https://x.com/l.png) Brand',
    html: '<h2 id="logo-brand"><img src="https://x.com/l.png" alt="Logo"> Brand</h2>',
    toc: [{ id: 'logo-brand', text: 'Logo Brand', level: 2 }],
    sources: ['row:6'],
  },
  {
    name: 'toc text ignores heading emphasis',
    markdown: '## A *b* c',
    html: '<h2 id="a-b-c">A <em>b</em> c</h2>',
    toc: [{ id: 'a-b-c', text: 'A b c', level: 2 }],
    sources: ['row:6'],
  },
  {
    name: 'plain paragraph has an empty table of contents',
    markdown: 'Just text.',
    html: '<p>Just text.</p>',
    toc: [],
    sources: ['row:8'],
  },
  {
    name: 'a named footnote label is the id, lowercased, and its number is its order',
    markdown: 'a[^Note] b[^1]\n\n[^1]: one\n[^Note]: two',
    html:
      '<p>a<sup><a href="#fn-note" id="fnref-note" data-footnote-ref>1</a></sup>' +
      ' b<sup><a href="#fn-1" id="fnref-1" data-footnote-ref>2</a></sup></p>' +
      '<section data-footnotes aria-label="Footnotes"><ol>' +
      '<li id="fn-note"><p>two <a href="#fnref-note" data-footnote-backref aria-label="Back to reference 1">↩</a></p></li>' +
      '<li id="fn-1"><p>one <a href="#fnref-1" data-footnote-backref aria-label="Back to reference 2">↩</a></p></li>' +
      '</ol></section>',
    toc: [],
    sources: ['row:12'],
  },
  {
    name: 'an autolink with a script scheme renders as text',
    markdown: '<javascript:alert(1)> and <vbscript:msgbox(1)>',
    html: '<p>javascript:alert(1) and vbscript:msgbox(1)</p>',
    toc: [],
    sources: ['row:1', 'row:10'],
  },
  {
    name: 'a scheme outside the list stays a link with sanitize false, a script scheme does not',
    markdown: '[f](ftp://x.com/a) [j](javascript:alert(1))',
    options: { sanitize: false },
    html: '<p><a href="ftp://x.com/a">f</a> j</p>',
    toc: [],
    sources: ['row:9', 'row:10'],
  },
  {
    name: 'a scheme outside the list renders as text by default',
    markdown: '[f](ftp://x.com/a)',
    html: '<p>f</p>',
    toc: [],
    sources: ['row:1', 'row:2'],
  },
  {
    name: 'elementAttributes adds attributes to every element of a kind, values escaped',
    markdown: '[a](https://x.com) and [b](/b)\n\n- one',
    options: {
      elementAttributes: {
        a: { class: 'link', 'data-note': 'say "hi" <now> & go' },
        li: { class: 'item' },
      },
    },
    html:
      '<p><a href="https://x.com" class="link" data-note="say &quot;hi&quot; &lt;now&gt; &amp; go">a</a> and ' +
      '<a href="/b" class="link" data-note="say &quot;hi&quot; &lt;now&gt; &amp; go">b</a></p>' +
      '<ul><li class="item">one</li></ul>',
    toc: [],
    sources: ['row:11'],
  },
  {
    name: 'elementAttributes reaches headings, task-list boxes and the footnote section',
    markdown: '# T\n\n- [x] done\n\nx[^1]\n\n[^1]: note',
    options: {
      elementAttributes: {
        h1: { class: 'title' },
        input: { class: 'box' },
        footnotes: { class: 'notes' },
      },
    },
    html:
      '<h1 id="t" class="title">T</h1>' +
      '<ul><li><input type="checkbox" disabled checked class="box"> done</li></ul>' +
      '<p>x<sup><a href="#fn-1" id="fnref-1" data-footnote-ref>1</a></sup></p>' +
      '<section data-footnotes aria-label="Footnotes" class="notes"><ol>' +
      '<li id="fn-1"><p>note <a href="#fnref-1" data-footnote-backref aria-label="Back to reference 1">↩</a></p></li>' +
      '</ol></section>',
    toc: [{ id: 't', text: 'T', level: 1 }],
    sources: ['row:11', 'row:12', 'row:13'],
  },
  {
    name: 'elementAttributes reaches every table part and the other block and inline elements',
    markdown:
      '| h |\n|---|\n| *e* **s** ~~d~~ `c` |\n\n> q\n\n---\n\n1. one\n\n![alt](https://x.com/i.png)\n\n```js\nx\n```',
    options: {
      elementAttributes: {
        table: { class: 'table' },
        thead: { class: 'thead' },
        tbody: { class: 'tbody' },
        tr: { class: 'tr' },
        th: { class: 'th' },
        td: { class: 'td' },
        em: { class: 'em' },
        strong: { class: 'strong' },
        del: { class: 'del' },
        code: { class: 'code' },
        pre: { class: 'pre' },
        blockquote: { class: 'quote' },
        hr: { class: 'rule' },
        ol: { class: 'ol' },
        p: { 'data-p': '' },
        img: { loading: 'lazy' },
      },
    },
    html:
      '<table class="table"><thead class="thead"><tr class="tr"><th class="th">h</th></tr></thead>' +
      '<tbody class="tbody"><tr class="tr"><td class="td"><em class="em">e</em> <strong class="strong">s</strong> ' +
      '<del class="del">d</del> <code class="code">c</code></td></tr></tbody></table>' +
      '<blockquote class="quote"><p data-p="">q</p></blockquote>' +
      '<hr class="rule">' +
      '<ol class="ol"><li>one</li></ol>' +
      '<p data-p=""><img src="https://x.com/i.png" alt="alt" loading="lazy"></p>' +
      // A configured class on `code` joins the fenced block's language class.
      '<pre class="pre"><code class="language-js code">x\n</code></pre>',
    toc: [],
    sources: ['row:11'],
  },
  {
    name: 'elementAttributes cannot set an attribute the renderer owns',
    markdown: '[a](https://x.com)',
    options: { elementAttributes: { a: { href: 'https://evil.example' } } },
    html: '',
    throws: 'markdown.elementAttributes.refused',
    sources: ['row:11'],
  },
  {
    name: 'elementAttributes cannot add an event handler',
    markdown: 'text',
    options: { elementAttributes: { p: { OnClick: 'alert(1)' } } },
    html: '',
    throws: 'markdown.elementAttributes.refused',
    sources: ['row:11'],
  },
]
