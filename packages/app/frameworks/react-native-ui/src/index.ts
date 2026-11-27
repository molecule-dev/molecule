/**
 * React Native UI components for molecule.dev.
 *
 * Provides React Native implementations (View/Pressable/Text-based) of the
 * core `@molecule/app-ui` component interfaces — 30 components: Accordion,
 * Alert, Avatar, Badge, Button, Card (+ CardHeader/CardTitle/CardDescription/
 * CardContent/CardFooter), Checkbox, Container, Dropdown, Flex, Form,
 * FormField, Grid, Input, Label, Modal, Pagination, Progress, RadioGroup,
 * Select, Separator, Skeleton, Spacer, Spinner, Switch, Table, Tabs,
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

export {
  Accordion,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Container,
  Dropdown,
  DropdownLabel,
  DropdownSeparator,
  Flex,
  Form,
  FormField,
  Grid,
  Input,
  Label,
  Modal,
  Pagination,
  Progress,
  RadioGroup,
  Select,
  Separator,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Spacer,
  Spinner,
  Switch,
  Table,
  Tabs,
  Textarea,
  Toast,
  ToastContainer,
  ToastProvider,
  Tooltip,
  useToast,
} from './components/index.js'
export type * from './types.js'
export type {
  AccordionProps,
  AlertProps,
  AvatarProps,
  BadgeProps,
  BaseProps,
  DropdownProps,
  FormFieldProps,
  FormProps,
  ModalProps,
  PaginationProps,
  RadioGroupProps,
  SkeletonProps,
  SpinnerProps,
  TableProps,
  TabsProps,
  ToastProps,
  TooltipProps,
} from '@molecule/app-ui'
