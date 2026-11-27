/**
 * React Native implementation of the renderer-neutral overlay platform.
 * @module
 */

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  AccessibilityInfo,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'

import { useRouterInstance } from '@molecule/app-react'
import type { OverlayLayer, OverlayPlatform, ToastMessageProps } from '@molecule/app-react/overlay'
import { type ElementHandle, getClassMap, type OverlayTarget } from '@molecule/app-ui'

import { Box } from '../elements/Box.js'
import { createLabelDirectory, FormLabels, labelText, useLabelText } from '../elements/labels.js'
import { OutsidePressScope, useOutsidePressRoot } from '../elements/outsidePress.js'
import { NativeFocus } from './focus.js'
import { layoutChanged } from './layout.js'
import { useNativePosition } from './position.js'
import { enclosingModal, NativeLayer, nativeLayers } from './stack.js'

export type * from '@molecule/app-react/overlay'
export type {
  OverlayAnchorGeometry,
  OverlayDismissReason,
  OverlayFocusOptions,
  OverlayLayerKind,
  OverlayLayerOptions,
  OverlayTarget,
} from '@molecule/app-ui'

const Owner = createContext<OverlayTarget | undefined>(undefined)
const Parent = createContext<NativeLayer | null>(null)
const registrations = new WeakMap<OverlayLayer, NativeLayer>()
const styles = StyleSheet.create({
  host: { flex: 1 },
  hidden: { opacity: 0 },
  list: { flexGrow: 0, maxHeight: '80%', width: '85%', alignSelf: 'center' },
  center: { justifyContent: 'center' },
})

/** Resolves the token issued by the native renderer. */
function registration(layer: OverlayLayer): NativeLayer {
  const entry = registrations.get(layer)
  if (!entry)
    throw new Error('OverlayPortal and OverlayBackdrop require a layer from useOverlayLayer')
  return entry
}

/** A native host is the accessibility boundary for the background of its presentation. */
export const OverlayHost: OverlayPlatform['OverlayHost'] = ({ children, owner }) => {
  const inherited = useContext(Owner)
  const parent = enclosingModal(useContext(Parent))
  const outside = useOutsidePressRoot((inside) => nativeLayers.outside(inside, parent))
  useSyncExternalStore(nativeLayers.subscribe, nativeLayers.snapshot, nativeLayers.snapshot)
  const modal = nativeLayers.foreground
  return (
    <Owner.Provider value={owner ?? inherited}>
      <OutsidePressScope.Provider value={outside.scope}>
        <View
          {...outside.handlers}
          style={styles.host}
          pointerEvents="box-none"
          onLayout={layoutChanged}
          onAccessibilityEscape={() => nativeLayers.dismissKey('escape', parent)}
          importantForAccessibility={
            Platform.OS === 'android' && modal && modal !== parent
              ? 'no-hide-descendants'
              : undefined
          }
        >
          {children}
        </View>
      </OutsidePressScope.Provider>
    </Owner.Provider>
  )
}

/** Registers an overlay once per open interval and applies updated callbacks in place. */
export const useOverlayLayer: OverlayPlatform['useOverlayLayer'] = (options) => {
  const parent = useContext(Parent)
  const owner = useContext(Owner)
  const [layer] = useState(() => {
    const token = { token: Symbol() }
    registrations.set(token, new NativeLayer(options, parent, owner))
    return token
  })
  const entry = registration(layer)
  useLayoutEffect(() => {
    if (!options.open) nativeLayers.remove(entry)
    entry.options = options
    entry.parent = parent
    entry.owner = owner
    nativeLayers.sync(entry)
  })
  useLayoutEffect(() => () => nativeLayers.remove(entry), [entry])
  return layer
}

/** Core Modal keeps children in their source tree, including all declaring providers. */
export const OverlayPortal: OverlayPlatform['OverlayPortal'] = ({
  layer,
  presentation,
  anchorPosition,
  children,
}) => {
  const entry = registration(layer)
  const [labels] = useState(createLabelDirectory)
  const outside = useOutsidePressRoot((inside) => nativeLayers.outside(inside, entry))
  const fallback = anchorPosition?.fallback ?? false
  useSyncExternalStore(nativeLayers.subscribe, nativeLayers.snapshot, nativeLayers.snapshot)
  useLayoutEffect(() => {
    nativeLayers.attach(entry, presentation === 'host', fallback)
    return () => nativeLayers.detach(entry)
  }, [entry, presentation, fallback])

  const content = <Parent.Provider value={entry}>{children}</Parent.Provider>
  if (presentation === 'inline') return content
  if (entry.options.kind !== 'modal' && !fallback) {
    const hidden = anchorPosition && !anchorPosition.ready
    // A nonmodal layer cannot add a window that consumes Back or background gestures.
    return (
      <View
        ref={entry.plane}
        collapsable={false}
        onLayout={layoutChanged}
        pointerEvents={hidden ? 'none' : 'box-none'}
        accessibilityElementsHidden={hidden}
        importantForAccessibility={hidden ? 'no-hide-descendants' : undefined}
        style={[StyleSheet.absoluteFill, hidden && styles.hidden]}
      >
        {content}
      </View>
    )
  }

  const mounted = nativeLayers.presentation(entry)
  if (!mounted) return null
  const covered = nativeLayers.foreground !== entry
  return (
    <Modal
      key={mounted.id}
      visible={mounted.phase !== 'closing'}
      transparent
      animationType="none"
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      onRequestClose={() => nativeLayers.dismissKey('back', entry)}
      onShow={() => nativeLayers.shown(mounted)}
      onDismiss={() => nativeLayers.dismissed(mounted)}
    >
      <NativeFocus.Provider value={entry.focus}>
        <FormLabels.Provider value={labels}>
          <OutsidePressScope.Provider value={outside.scope}>
            <View
              {...outside.handlers}
              style={[StyleSheet.absoluteFill, fallback && styles.center]}
              pointerEvents="box-none"
              accessibilityViewIsModal={Platform.OS === 'ios'}
              importantForAccessibility={
                Platform.OS === 'android' && covered ? 'no-hide-descendants' : undefined
              }
              onAccessibilityEscape={() => nativeLayers.dismissKey('escape', entry)}
              onLayout={() => nativeLayers.layout(mounted)}
            >
              {fallback ? (
                <>
                  <Pressable
                    style={StyleSheet.absoluteFill}
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                    onPress={() => nativeLayers.backdrop(entry)}
                  />
                  <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                    {content}
                  </ScrollView>
                </>
              ) : (
                content
              )}
            </View>
          </OutsidePressScope.Provider>
        </FormLabels.Provider>
      </NativeFocus.Provider>
    </Modal>
  )
}

/** A separate press target behind the panel keeps the panel's touches and scroll available. */
export const OverlayBackdrop: OverlayPlatform['OverlayBackdrop'] = ({
  layer,
  children,
  ...props
}) => (
  <Box as="div" {...props}>
    <Pressable
      style={StyleSheet.absoluteFill}
      accessible={false}
      focusable={false}
      importantForAccessibility="no-hide-descendants"
      onPress={() => nativeLayers.backdrop(registration(layer))}
    />
    {children}
  </Box>
)

const WIDTH_CONDITION = /^\((min|max)-width:\s*(\d+(?:\.\d+)?|\.\d+)px\)$/i

/** Matches minimum logical widths and conjunctions of CSS min/max-width pixel conditions. */
export const useViewportMatch: OverlayPlatform['useViewportMatch'] = (query) => {
  const { width } = useWindowDimensions()
  if (typeof query === 'number') return Number.isFinite(query) && query >= 0 && width >= query
  return query
    .trim()
    .split(/\s+and\s+/i)
    .every((condition) => {
      const match = WIDTH_CONDITION.exec(condition)
      if (!match) return false
      const pixels = Number(match[2])
      return match[1].toLowerCase() === 'min' ? width >= pixels : width <= pixels
    })
}

/** Dismisses on committed route traversal, including pops between instances of one screen. */
export const useHistoryPop: OverlayPlatform['useHistoryPop'] = (onPop) => {
  const router = useRouterInstance()
  useEffect(
    () =>
      router.subscribe((_location, action) => {
        if (action === 'pop') onPop()
      }),
    [router, onPop],
  )
}

/** Measures an anchored surface in its presenting window. */
export const useAnchoredPosition: OverlayPlatform['useAnchoredPosition'] = (options) =>
  useNativePosition(registration(options.layer), options)

/** Registers readable hints with the surrounding controls before the tip is opened. */
export const useTooltipDescription: OverlayPlatform['useTooltipDescription'] = (id, content) => {
  useLabelText(id, content)
  return true
}

/** Native focus events have no related target. */
export const focusStaysWithin: OverlayPlatform['focusStaysWithin'] = () => false

/** Announces one message via the stock platform API, using the effective live attributes. */
export const ToastMessage = forwardRef<ElementHandle, Omit<ToastMessageProps, 'ref'>>(
  function ToastMessage({ spokenContent, 'aria-live': live, ...props }, ref) {
    const [announcement] = useState(() => ({ text: '', announced: false }))
    const text = props['aria-label'] ?? labelText(spokenContent)
    const urgency =
      live ??
      (props.role === 'alert'
        ? 'assertive'
        : props.role === 'status' || props.role === 'log'
          ? 'polite'
          : 'off')
    const hidden = props.hidden || props['aria-hidden'] === true || props['aria-hidden'] === 'true'
    useEffect(() => {
      if (announcement.text !== text) {
        announcement.text = text
        announcement.announced = false
      }
      if (!text || hidden || urgency === 'off' || announcement.announced) return
      announcement.announced = true
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibilityWithOptions(text, { queue: urgency === 'polite' })
      } else {
        AccessibilityInfo.announceForAccessibility(text)
      }
    }, [announcement, text, urgency, hidden])
    return <Box as="div" {...props} ref={ref} />
  },
)

/** Draws the native arrow with the surface and border tokens of the active ClassMap. */
export const OverlayArrow: OverlayPlatform['OverlayArrow'] = ({ placement }) => {
  const cm = getClassMap()
  const edge = placement.startsWith('top')
    ? { bottom: -4 }
    : placement.startsWith('bottom')
      ? { top: -4 }
      : placement === 'left'
        ? { right: -4 }
        : { left: -4 }
  const align = placement.endsWith('-start')
    ? { left: 12 }
    : placement.endsWith('-end')
      ? { right: 12 }
      : placement === 'left' || placement === 'right'
        ? { top: '50%' as const, marginTop: -4 }
        : { left: '50%' as const, marginLeft: -4 }
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cm.cn(cm.surface, cm.borderAll)}
      style={{
        position: 'absolute',
        width: 8,
        height: 8,
        transform: [{ rotate: '45deg' }],
        ...edge,
        ...align,
      }}
    />
  )
}
