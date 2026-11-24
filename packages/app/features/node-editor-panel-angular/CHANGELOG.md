# @molecule/app-node-editor-panel-angular

## 1.2.2

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it, as the React component does.

## 1.2.1

### Patch Changes

- Projected content that the consumer stops passing and passes again renders again, and a default shows only while nothing is projected.

## 1.2.0

### Minor Changes

- The close button's default label is translated through the `nodeEditorPanel.close` key, with translations in the new `@molecule/app-locales-node-editor-panel`.

## 1.1.0

### Minor Changes

- Add the Vue, Solid, Svelte and Angular counterparts of `@molecule/app-node-editor-panel-react`: the same exports and props, rendering the same DOM.
