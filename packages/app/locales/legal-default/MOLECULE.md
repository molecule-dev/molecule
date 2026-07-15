# @molecule/app-locales-legal-default

`@molecule/app-locales-legal-default` — shared privacy/terms HTML in 74 languages.

Provides default privacy policy + terms of service content for the
footer modals. Identical across all 133 fleet apps prior to extraction,
with `{{appName}}` placeholders interpolated by the i18n provider.

## Quick Start

```ts
import * as legal from '@molecule/app-locales-legal-default'

// legal.en === { 'content.privacyPolicy': '...', 'content.termsOfService': '...' }
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-locales-legal-default @molecule/app-i18n
```

## API

### Interfaces

#### `LegalContent`

Default legal content shipped by the molecule fleet — privacy policy
and terms of service.

Values are raw HTML strings that get rendered via `dangerouslySetInnerHTML`
inside the Footer's Privacy and Terms modals. `{{appName}}` placeholders
are interpolated at render time by the i18n provider.

```typescript
interface LegalContent {
  /** Privacy policy HTML (interpolates `{{appName}}`). */
  'content.privacyPolicy': string
  /** Terms of service HTML (interpolates `{{appName}}`). */
  'content.termsOfService': string
}
```

### Functions

#### `loadContent(module)`

Register a legal-content module (privacyPolicy or termsOfService)
and sync the current locale's content into the i18n provider.
Content comes from this package's per-locale exports; future
locale changes re-fetch automatically via `registerContent`.

```typescript
function loadContent(module: string): Promise<void>
```

### Constants

#### `af`

Legal content for af.

```typescript
const af: LegalContent
```

#### `am`

Legal content for am.

```typescript
const am: LegalContent
```

#### `ar`

Legal content for ar.

```typescript
const ar: LegalContent
```

#### `az`

Legal content for az.

```typescript
const az: LegalContent
```

#### `bg`

Legal content for bg.

```typescript
const bg: LegalContent
```

#### `bn`

Legal content for bn.

```typescript
const bn: LegalContent
```

#### `bs`

Legal content for bs.

```typescript
const bs: LegalContent
```

#### `ca`

Legal content for ca.

```typescript
const ca: LegalContent
```

#### `cs`

Legal content for cs.

```typescript
const cs: LegalContent
```

#### `cy`

Legal content for cy.

```typescript
const cy: LegalContent
```

#### `da`

Legal content for da.

```typescript
const da: LegalContent
```

#### `de`

Legal content for de.

```typescript
const de: LegalContent
```

#### `el`

Legal content for el.

```typescript
const el: LegalContent
```

#### `en`

Legal content for en.

```typescript
const en: LegalContent
```

#### `es`

Legal content for es.

```typescript
const es: LegalContent
```

#### `et`

Legal content for et.

```typescript
const et: LegalContent
```

#### `eu`

Legal content for eu.

```typescript
const eu: LegalContent
```

#### `fa`

Legal content for fa.

```typescript
const fa: LegalContent
```

#### `fi`

Legal content for fi.

```typescript
const fi: LegalContent
```

#### `fil`

Legal content for fil.

```typescript
const fil: LegalContent
```

#### `fr`

Legal content for fr.

```typescript
const fr: LegalContent
```

#### `ga`

Legal content for ga.

```typescript
const ga: LegalContent
```

#### `gl`

Legal content for gl.

```typescript
const gl: LegalContent
```

#### `gu`

Legal content for gu.

```typescript
const gu: LegalContent
```

#### `he`

Legal content for he.

```typescript
const he: LegalContent
```

#### `hi`

Legal content for hi.

```typescript
const hi: LegalContent
```

#### `hr`

Legal content for hr.

```typescript
const hr: LegalContent
```

#### `hu`

Legal content for hu.

```typescript
const hu: LegalContent
```

#### `hy`

Legal content for hy.

```typescript
const hy: LegalContent
```

#### `id`

Legal content for id.

```typescript
const id: LegalContent
```

#### `is`

Legal content for is.

```typescript
const is: LegalContent
```

#### `it`

Legal content for it.

```typescript
const it: LegalContent
```

#### `ja`

Legal content for ja.

```typescript
const ja: LegalContent
```

#### `ka`

Legal content for ka.

```typescript
const ka: LegalContent
```

#### `kk`

Legal content for kk.

```typescript
const kk: LegalContent
```

#### `km`

Legal content for km.

```typescript
const km: LegalContent
```

#### `kn`

Legal content for kn.

```typescript
const kn: LegalContent
```

#### `ko`

Legal content for ko.

```typescript
const ko: LegalContent
```

#### `lo`

Legal content for lo.

```typescript
const lo: LegalContent
```

#### `lt`

Legal content for lt.

```typescript
const lt: LegalContent
```

#### `lv`

Legal content for lv.

```typescript
const lv: LegalContent
```

#### `mk`

Legal content for mk.

```typescript
const mk: LegalContent
```

#### `ml`

Legal content for ml.

```typescript
const ml: LegalContent
```

#### `mn`

Legal content for mn.

```typescript
const mn: LegalContent
```

#### `mr`

Legal content for mr.

```typescript
const mr: LegalContent
```

#### `ms`

Legal content for ms.

```typescript
const ms: LegalContent
```

#### `mt`

Legal content for mt.

```typescript
const mt: LegalContent
```

#### `my`

Legal content for my.

```typescript
const my: LegalContent
```

#### `nb`

Legal content for nb.

```typescript
const nb: LegalContent
```

#### `ne`

Legal content for ne.

```typescript
const ne: LegalContent
```

#### `nl`

Legal content for nl.

```typescript
const nl: LegalContent
```

#### `pa`

Legal content for pa.

```typescript
const pa: LegalContent
```

#### `pl`

Legal content for pl.

```typescript
const pl: LegalContent
```

#### `pt`

Legal content for pt.

```typescript
const pt: LegalContent
```

#### `ro`

Legal content for ro.

```typescript
const ro: LegalContent
```

#### `ru`

Legal content for ru.

```typescript
const ru: LegalContent
```

#### `si`

Legal content for si.

```typescript
const si: LegalContent
```

#### `sk`

Legal content for sk.

```typescript
const sk: LegalContent
```

#### `sl`

Legal content for sl.

```typescript
const sl: LegalContent
```

#### `sq`

Legal content for sq.

```typescript
const sq: LegalContent
```

#### `sr`

Legal content for sr.

```typescript
const sr: LegalContent
```

#### `sv`

Legal content for sv.

```typescript
const sv: LegalContent
```

#### `sw`

Legal content for sw.

```typescript
const sw: LegalContent
```

#### `ta`

Legal content for ta.

```typescript
const ta: LegalContent
```

#### `te`

Legal content for te.

```typescript
const te: LegalContent
```

#### `th`

Legal content for th.

```typescript
const th: LegalContent
```

#### `tr`

Legal content for tr.

```typescript
const tr: LegalContent
```

#### `uk`

Legal content for uk.

```typescript
const uk: LegalContent
```

#### `ur`

Legal content for ur.

```typescript
const ur: LegalContent
```

#### `uz`

Legal content for uz.

```typescript
const uz: LegalContent
```

#### `vi`

Legal content for vi.

```typescript
const vi: LegalContent
```

#### `zh`

Legal content for zh.

```typescript
const zh: LegalContent
```

#### `zhTW`

Legal content for zh-TW.

```typescript
const zhTW: LegalContent
```

#### `zu`

Legal content for zu.

```typescript
const zu: LegalContent
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
