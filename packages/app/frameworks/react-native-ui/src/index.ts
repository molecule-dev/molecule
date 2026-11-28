/**
 * React Native UI components for molecule.dev.
 *
 * Provides React Native implementations (View/Pressable/Text-based) of the
 * core `@molecule/app-ui` component interfaces, including Accordion,
 * Alert, Avatar, Badge, Button, Card (+ CardHeader/CardTitle/CardDescription/
 * CardContent/CardFooter), Checkbox, Container, Dropdown, FileField, Flex, Form,
 * FormArea, FormField, Grid, Input, Label, Modal, Pagination, Progress, RadioGroup,
 * Select, Separator, Skeleton, Spacer, Spinner, Switch, Table, Tabs, TextField,
 * Textarea, Toast (+ ToastProvider / ToastContainer / useToast), Tooltip.
 * Prop types build on `@molecule/app-ui`. Web-only extras (Icon,
 * UserMenu, ThemeToggle, PageHeader, …) live in `@molecule/app-ui-react` and
 * are NOT available here.
 *
 * @example
 * ```tsx
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-nativewind'
 * import { Button, Card, CardContent, CardTitle } from '@molecule/app-ui-react-native'
 *
 * // Once at startup, before first render:
 * setClassMap(classMap)
 *
 * function Greeting() {
 *   return (
 *     <Card>
 *       <CardTitle>Hello</CardTitle>
 *       <CardContent>
 *         <Button color="primary" onClick={() => {}}>Tap me</Button>
 *       </CardContent>
 *     </Card>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Use `@molecule/app-ui-react-native/elements` for renderer-neutral device elements and
 *   `@molecule/app-ui-react-native/platform` for the device overlay host.
 * - **On React Native Web the browser's own elements appear in the DOM.** A web bundle (Vite with
 *   `react-native` aliased to React Native Web) loads this package's `browser` entry, where
 *   Accordion, Alert, Avatar, Checkbox, Pagination, RadioGroup, Select, Switch, Table, Tabs,
 *   Textarea and Toast share the React kit's component trees. On the web these render with DOM
 *   elements and participate in the surrounding FormArea. On devices they use native hosts.
 * - **Styling requires NativeWind, not just setClassMap.** Components apply ClassMap classes via
 *   `className` on React Native primitives — that prop only has an effect when the NativeWind
 *   babel preset + Tailwind config are wired into the app AND `setClassMap(classMap)` from
 *   `@molecule/app-ui-nativewind` has run. Missing either half renders the whole UI unstyled
 *   with NO error. `getClassMap()` itself throws until `setClassMap` is called.
 * - Fields report text and choices with `onValueChange` and checked state with
 *   `onCheckedChange`. Use eventless `onClick`, `onFocus`, `onBlur` and `onClear` callbacks
 *   to share handlers with the web kits.
 * - Toasts need `ToastProvider` mounted at the root; `useToast()` throws outside it.
 *
 * @module
 */

export * from './common.js'
export * from './components/index.js'
