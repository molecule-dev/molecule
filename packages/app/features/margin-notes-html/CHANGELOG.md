# @molecule/app-margin-notes-html

## 1.0.8

### Patch Changes

- On a phone the notes panel takes at most 30% of the screen height, and a tapped paragraph that the opening panel would cover scrolls clear of it, so a second tap on the same paragraph always reaches it.

## 1.0.7

### Patch Changes

- A note of a `tap` kind (about one paragraph) no longer carries a layout row into the next section, so that section's summary sits beside its own heading instead of under the previous section's.

## 1.0.6

### Patch Changes

- Docs: the stylesheet goes before the site's own CSS so the site's overrides win, and a table of the `data-mol-id` selector for every part of the layout, for tests.

## 1.0.5

### Patch Changes

- The phone bar reserves its height at the end of the page, not just the article, so a footer or anything else below the notes is no longer covered by the open panel; the reserved height follows the bar as it resizes.

## 1.0.4

### Patch Changes

- Notes carry their accent as an inset rounded bar inside the note instead of a border-left.

## 1.0.3

### Patch Changes

- A prompt that produced several paragraphs is shown once, and a prompt spanning two sections no longer carries a section's summary into the previous section.

## 1.0.2

### Patch Changes

- 3c2cc98: A tap-kind note (e.g. prompts) now follows the section being read in the phone panel once its switch is on, instead of waiting for a tap.

## 1.0.1

### Patch Changes

- cce2f84: A section's notes share one row for the whole section, so a sticky summary stays pinned until the section ends.
