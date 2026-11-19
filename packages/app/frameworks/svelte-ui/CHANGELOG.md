# @molecule/app-ui-svelte

## 1.2.0

### Minor Changes

- Export `ReactFormProps`, the name `@molecule/app-ui-react` gives the `Form` props.
- Matches `@molecule/app-ui-react`: a component's ref receives its main element, components forward every prop their types declare (`automationId` as `data-mol-id`, `id`, `title`, `aria-*` and DOM event handlers), Tabs, Accordion, Dropdown and Card honor `disabled`, and handlers are typed with the kit event types from `@molecule/app-ui`.

### Patch Changes

- Toast ids are unique across every `ToastProvider` on a page, and `useToast().addToast` types each toast prop.

## 1.1.7

### Patch Changes

- `Dropdown` no longer reports `openChange(false)` on mount, so a controlled menu mounted open stays open when its owner follows `openChange`.

## 1.1.6

### Patch Changes

- Importing the package before `setClassMap()` no longer throws: the class constants read at load are empty until a class map is bonded, and the class records (`cardPaddingMap`, `toastPositionClasses`, …) read the current class map on each access.

## 1.1.5

### Patch Changes

- ConfirmDialog and PromptDialog are named by their title and described by their description, the SidebarUserCard drawer is named "Account", and Tabs sets `aria-controls` only on the tab whose panel is rendered.
- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 1.1.4

### Patch Changes

- PageHeader's breadcrumb navigation label is translated (`ui.pageHeader.breadcrumbs`) and follows a locale switch.
- Interactive cards activate with Enter and Space, tabs take arrow keys on the focused tab, prompt dialogs focus their input on open, and Flex forwards every element prop.

## 1.1.3

### Patch Changes

- A controlled checkbox, switch or radio group now updates only the `checked` property after creation, as React does.

## 1.1.2

### Patch Changes

- The `svelte` peer range is `^5.0.0`: the components use Svelte 5 runes and do not run on Svelte 4.

## 1.1.1

### Patch Changes

- An open `Dropdown` no longer pulls focus back to its menu on a re-render after focus has left it, matching `@molecule/app-ui-react`.
- Lists keep each item's DOM node, and the focused item its focus, when items are replaced by equal ones or reordered, keyed the same way as `@molecule/app-ui-react`.
- Drop the unused `@molecule/app-auth` and `@molecule/app-routing` peer dependencies.

## 1.1.0

### Minor Changes

- `@molecule/app-ui-svelte` ships real Svelte components with the same names, props, markup and behavior as `@molecule/app-ui-react`, each with generated type declarations; the page shell's sidebar toggle label is translated.

### Patch Changes

- UI components re-render their translated text on a locale switch, as `@molecule/app-ui-react` does; `@molecule/app-angular`'s `useTranslation().t` and `useT()` make the view that calls them follow a locale switch.
- The Vue, Solid and Angular UI packages export every `@molecule/app-ui-react` component with the same names, props, markup and behavior, and each UI package declares its framework binding, and every package its types reference, as a peer.

## 1.0.5

### Patch Changes

- Align generated API documentation with source declarations and signatures.

## 1.0.4

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-i18n@1.0.1
  - @molecule/app-icons@1.0.1
  - @molecule/app-ui@1.0.1
