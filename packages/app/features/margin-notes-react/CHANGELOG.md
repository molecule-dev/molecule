# @molecule/app-margin-notes-react

## 1.0.6

### Patch Changes

- The README example detects heading levels with `text.match()`; behavior is unchanged. First release to carry the fixes listed under 1.0.2–1.0.5.

## 1.0.5

### Patch Changes

- A prompt that produced several paragraphs is shown once, and a prompt spanning two sections no longer carries a section's summary into the previous section.

## 1.0.4

### Patch Changes

- Republish at 1.0.4: carries the sticky-summary section-row fix and the tap-kind notes improvement that npm's registry could not accept as 1.0.2/1.0.3.

## 1.0.3

### Patch Changes

- cce2f84: A section's notes share one row for the whole section, so a sticky summary stays pinned until the section ends.

## 1.0.2

### Patch Changes

- A tapped paragraph now shows its tap-kind notes in the phone panel even while that kind's switch is off, and the README leads with a complete, tested post-body example.

## 1.0.1

### Patch Changes

- Require `@molecule/app-ui` ^1.2.0, which provides the `hiddenBelow` ClassMap member the layout uses.
