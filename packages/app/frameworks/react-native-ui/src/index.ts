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
 * Prop types are re-exported from `@molecule/app-ui`. Web-only extras (Icon,
 * UserMenu, ThemeToggle, PageHeader, …) live in `@molecule/app-ui-react` and
 * are NOT available here.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { registerLocaleModule, t } from '@molecule/app-i18n'
 * import * as commonLocales from '@molecule/app-locales-common'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-nativewind'
 * import { Button, Card, CardContent, CardTitle } from '@molecule/app-ui-react-native'
 *
 * // Once at startup, before the first render (NativeWind must also be set up — see @remarks).
 * setClassMap(classMap)
 * registerLocaleModule(commonLocales) // translations for the `common.*` keys below
 *
 * export function InboxCard() {
 *   const [unread, setUnread] = useState(3)
 *   return (
 *     <Card>
 *       <CardTitle>{t('common.countUnread', { count: unread }, { defaultValue: '{{count}} unread' })}</CardTitle>
 *       <CardContent>
 *         <Button color="primary" onClick={() => setUnread(0)}>
 *           {t('common.markAllRead', undefined, { defaultValue: 'Mark all read' })}
 *         </Button>
 *       </CardContent>
 *     </Card>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Styling requires NativeWind, not just setClassMap.** Components apply ClassMap classes via
 *   `className` on React Native primitives — that prop only has an effect when the NativeWind
 *   babel preset + Tailwind config are wired into the app AND `setClassMap(classMap)` from
 *   `@molecule/app-ui-nativewind` has run. Missing either half renders the whole UI unstyled
 *   with NO error. `getClassMap()` itself throws until `setClassMap` is called.
 * - Event props follow the shared `@molecule/app-ui` interfaces (`onClick`, not `onPress`) so
 *   components stay swappable with the web implementations.
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

// Re-export all UI prop types from @molecule/app-ui
export type {
  AccordionProps,
  AlertProps,
  AvatarProps,
  BadgeProps,
  BaseProps,
  ButtonProps,
  CardProps,
  CheckboxProps,
  DropdownProps,
  FormFieldProps,
  FormProps,
  InputProps,
  ModalProps,
  PaginationProps,
  RadioGroupProps,
  SelectProps,
  SkeletonProps,
  SpinnerProps,
  SwitchProps,
  TableProps,
  TabsProps,
  TextareaProps,
  ToastProps,
  TooltipProps,
} from '@molecule/app-ui'
