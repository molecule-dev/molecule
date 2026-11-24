# @molecule/app-ui-svelte

## 1.4.3

### Patch Changes

- ThemeToggle, LanguagePicker and LoadErrorBanner take `testId` and `automationId`, and SidebarUserCard takes `testId`, as in React.
- PageHeader breadcrumb links navigate through the app's router instead of reloading the page.
- `renderIcon` draws an icon set's prebuilt markup glyphs.

## 1.4.2

### Patch Changes

- A node prop that renders nothing, such as an empty string or an empty list, leaves out the element around it.

## 1.4.1

### Patch Changes

- Snippets render with `{@render x?.()}`, so a component whose node prop the consumer stops passing renders nothing instead of throwing.
- Add `PresentWhileContent`, an element in the page only while its content renders something, and `rendersContent`/`contentNodes` to read rendered content by React's `slot(node)` rule.
- ConfirmDialog and PromptDialog point the dialog at their heading only while the title renders something, and PromptDialog's input label follows a projected title as it changes.

## 1.4.0

### Minor Changes

- Dropdown's trigger snippet receives menu-button props to spread on its element; a snippet that does not use them is wrapped in the role="button" fallback.

### Patch Changes

- Portal content (Modal, Drawer, Dropdown menu, Tooltip, ToastContainer) now renders through `BodyPortal` and unmounts with its owner, so opening and closing one no longer removes other nodes in `document.body`, and a Dropdown between keyed siblings no longer leaves its trigger behind.
- Dropdown switches between the trigger's own element and the role="button" fallback whenever the trigger snippet starts or stops spreading the menu-button props, so an emptied and refilled trigger is wired again.

## 1.3.0

### Minor Changes

- `AuthGuard`, `SidebarLayout` and `TopNavLayout` without children render the binding's `RoutedView` (the matched child route).

### Patch Changes

- Fixes the code examples in the package docs so each one compiles as written.
- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 1.2.1

### Patch Changes

- `Grid` sets only the gap and template properties it is given, so `columnGap` and `rowGap` no longer clear the `gap` it set or erase the same property from the caller's `style`.

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
