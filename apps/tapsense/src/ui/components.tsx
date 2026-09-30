import React, { useEffect, useRef } from 'react';
import {
  Animated, Easing, Pressable, StyleSheet, Text, View,
  type PressableProps, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import {
  AntennaSilhouette, GuidedSweepAnimation, type AntennaLocatorUiState, type Confidence, type NfcLocatorThemeInput,
  RIPPLE_DURATION_MS, RIPPLE_MAX_SCALE, RIPPLE_MIN_SCALE, RIPPLE_PEAK_ALPHA, CAMERA_BUMP,
} from 'react-native-nfc-locator';
import { useT } from '../i18n';
import { Palette } from '../theme/palette';
import { type Theme, type, useTheme } from '../theme/theme';
import { CloseIcon, WarningIcon } from './Icons';

/** Minimum touch target (48dp Android / well above iOS's 44pt). */
export const MIN_TOUCH = 48;

export function AppText({ style, variant = 'bodyMedium', color, ...props }: React.ComponentProps<typeof Text> & { variant?: keyof typeof type; color?: string }) {
  const theme = useTheme();
  return <Text {...props} style={[type[variant] as TextStyle, { color: color ?? theme.colors.onSurface }, style]} />;
}

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** The design's primary filled button (graphite-on-white / cream-on-black), not the aqua accent. */
export function FilledButton({ label, onPress, style, ...rest }: ButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable {...rest} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [styles.button, { backgroundColor: colors.inverseSurface, opacity: pressed ? 0.85 : 1 }, style]}>
      <Text style={[type.labelLarge, { color: colors.inverseOnSurface }]}>{label}</Text>
    </Pressable>
  );
}

/** Neutral outlined button. `emphasis` = the design's stronger 1.5dp outline (Tap Test's Cancel). */
export function OutlinedButton({ label, onPress, style, emphasis, ...rest }: ButtonProps & { emphasis?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable {...rest} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [styles.button, { borderWidth: emphasis ? 1.5 : 1, borderColor: colors.outline, opacity: pressed ? 0.7 : 1 }, style]}>
      <Text style={[type.labelLarge, { color: colors.onSurface }]}>{label}</Text>
    </Pressable>
  );
}

export function TextButton({ label, onPress, style, ...rest }: ButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable {...rest} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.6 : 1 }, style]}>
      <Text style={[type.labelLarge, { color: colors.onSurface }]}>{label}</Text>
    </Pressable>
  );
}

/** The top-right close (X): a 32dp visible circle inside a >=48dp touch target. */
export function CloseButton({ onPress, accessibilityLabel, testID }: { onPress: () => void; accessibilityLabel: string; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} testID={testID} hitSlop={4} style={styles.closeTarget}>
      <View style={[styles.closeCircle, { backgroundColor: colors.surfaceVariant }]}>
        <CloseIcon size={16} color={colors.onSurfaceVariant} />
      </View>
    </Pressable>
  );
}

/** The terse EXACT / APPROXIMATE / ESTIMATED / UNKNOWN pill from the style guide. */
export function ConfidenceChip({ confidence, onDarkCard = false }: { confidence: Confidence; onDarkCard?: boolean }) {
  const t = useT();
  const s = chipStyle(confidence);
  return (
    <View
      accessible accessibilityLabel={t(s.label)} testID="confidence-chip"
      style={[styles.chip, { backgroundColor: onDarkCard ? 'rgba(255,255,255,0.1)' : s.container }]}>
      <View style={[styles.chipDot, { backgroundColor: s.dot }]} />
      <Text style={[type.labelMedium, { color: onDarkCard ? s.dot : s.text }]}>{t(s.label)}</Text>
    </View>
  );
}

function chipStyle(c: Confidence) {
  switch (c) {
    case 'EXACT': return { dot: Palette.Success, container: Palette.SuccessContainer, text: Palette.SuccessOn, label: 'confidence_chip_exact' } as const;
    case 'APPROXIMATE': return { dot: Palette.ApproxOn, container: Palette.ApproxContainer, text: Palette.ApproxOn, label: 'confidence_chip_approximate' } as const;
    case 'GENERIC': return { dot: Palette.Amber, container: Palette.AmberContainer, text: Palette.AmberOnStrong, label: 'confidence_chip_estimated' } as const;
    case 'UNKNOWN': return { dot: Palette.Ink2, container: Palette.LightSurfaceAlt, text: Palette.Ink2, label: 'confidence_chip_unknown' } as const;
  }
}

export const confidenceOf = (s: AntennaLocatorUiState | null | undefined): Confidence | null =>
  s && (s.kind === 'resolvedMarker' || s.kind === 'fallbackGuidance') ? s.confidence : null;

interface MarkerProps {
  state: AntennaLocatorUiState;
  reducedMotion: boolean;
  style?: StyleProp<ViewStyle>;
  silhouetteColor?: string;
  showCameraBump?: boolean;
  cameraBumpColor?: string;
  silhouetteBorderColor?: string;
  theme?: NfcLocatorThemeInput;
  locale?: string;
}

/**
 * Renders the antenna marker for a resolved state, mirroring the library screen's branching so
 * every screen treats confidence the same way: a solid marker only for a non-stale
 * `resolvedMarker`, the guided sweep for everything else. Never a static marker for a guess.
 */
export function AntennaMarker({ state, reducedMotion, style, theme, locale, ...silhouette }: MarkerProps) {
  const app = useTheme();
  const themeInput = theme ?? app.locatorTheme;
  if (state.kind === 'resolvedMarker') {
    return state.isStale ? (
      <GuidedSweepAnimation templateId={state.silhouetteTemplateId} zone={state.antennaZone} reducedMotion={reducedMotion} style={style} aspectRatioOverride={state.aspectRatio} theme={themeInput} locale={locale} {...silhouette} />
    ) : (
      <AntennaSilhouette templateId={state.silhouetteTemplateId} zone={state.antennaZone} isConfident reducedMotion={reducedMotion} style={style} aspectRatioOverride={state.aspectRatio} theme={themeInput} locale={locale} {...silhouette} />
    );
  }
  if (state.kind === 'fallbackGuidance') {
    return <GuidedSweepAnimation templateId={state.silhouetteTemplateId} zone={state.approximateZone} reducedMotion={reducedMotion} style={style} aspectRatioOverride={state.aspectRatio} theme={themeInput} locale={locale} {...silhouette} />;
  }
  return null;
}

/** Solid phone silhouette for decorative (non-data-driven) contexts, e.g. My Phone's Front tab. */
export function PhoneSilhouette({ color, width, height, cameraBump, bumpColor, screenInset, insetColor, notchColor, borderColor }: {
  color: string; width: number; height: number; cameraBump?: boolean; bumpColor?: string;
  screenInset?: boolean; insetColor?: string; notchColor?: string; borderColor?: string;
}) {
  const r = width * 0.22;
  return (
    <Svg width={width} height={height} accessible={false}>
      <Rect width={width} height={height} rx={r} ry={r} fill={color} />
      {borderColor ? <Rect width={width} height={height} rx={r} ry={r} fill="none" stroke={borderColor} strokeWidth={1} /> : null}
      {cameraBump ? (
        <Rect x={width * CAMERA_BUMP.x} y={height * CAMERA_BUMP.y} width={width * CAMERA_BUMP.width} height={height * CAMERA_BUMP.height}
          rx={width * CAMERA_BUMP.width * CAMERA_BUMP.radiusOfWidth} fill={bumpColor ?? color} />
      ) : null}
      {screenInset ? (
        <>
          <Rect x={width * 0.0641} y={height * 0.0296} width={width - width * 0.0641 * 2} height={height - height * 0.0296 * 2} rx={width * 0.2179} fill={insetColor ?? color} />
          <Rect x={(width - width * 0.2821) / 2} y={height * 0.0473} width={width * 0.2821} height={height * 0.0355} rx={(height * 0.0355) / 2} fill={notchColor ?? color} />
        </>
      ) : null}
    </Svg>
  );
}

/** A generic circular reader/terminal: the hardware the phone taps against (never the aqua accent). */
export function ReaderDeviceIllustration({ outerColor, innerColor, size }: { outerColor: string; innerColor: string; size: number }) {
  return (
    <Svg width={size} height={size} accessible={false}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={outerColor} />
      <Circle cx={size / 2} cy={size / 2} r={size * 0.31} fill={innerColor} />
    </Svg>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The TapSense mark: concentric rings around a solid dot (the same shape language as the marker). */
export function TapSenseLogo({ color, size = 96, pulsing = false, reducedMotion = false, singleRing = false }: {
  color: string; size?: number; pulsing?: boolean; reducedMotion?: boolean; singleRing?: boolean;
}) {
  const pulse = useRef(new Animated.Value(RIPPLE_MIN_SCALE)).current;
  const animate = pulsing && !reducedMotion;
  useEffect(() => {
    if (!animate) return;
    pulse.setValue(RIPPLE_MIN_SCALE);
    const loop = Animated.loop(Animated.timing(pulse, { toValue: RIPPLE_MAX_SCALE, duration: RIPPLE_DURATION_MS, easing: Easing.linear, useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [animate, pulse]);
  const max = size / 2;
  const rippleR = pulse.interpolate({ inputRange: [RIPPLE_MIN_SCALE, RIPPLE_MAX_SCALE], outputRange: [max * RIPPLE_MIN_SCALE, max * RIPPLE_MAX_SCALE] });
  const rippleO = pulse.interpolate({ inputRange: [RIPPLE_MIN_SCALE, RIPPLE_MAX_SCALE], outputRange: [RIPPLE_PEAK_ALPHA, 0] });
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessible={false} style={{ overflow: 'visible' }}>
      {animate ? <AnimatedCircle cx={max} cy={max} r={rippleR} fill={color} fillOpacity={rippleO} /> : null}
      {!singleRing ? <Circle cx={max} cy={max} r={max * 0.92} stroke={color} strokeWidth={max * 0.06} fill="none" /> : null}
      <Circle cx={max} cy={max} r={max * 0.56} stroke={color} strokeWidth={max * 0.06} fill="none" />
      <Circle cx={max} cy={max} r={max * 0.21} fill={color} />
    </Svg>
  );
}

/** "This device can't do that": shown instead of a marker on hardware with no NFC at all. */
export function NfcUnsupportedNotice({ heading, body, iconBackground, iconTint, headingColor, bodyColor }: {
  heading: string; body: string; iconBackground?: string; iconTint?: string; headingColor?: string; bodyColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.notice} testID="nfc-unsupported-notice">
      <View style={[styles.statusIcon, { backgroundColor: iconBackground ?? colors.surfaceVariant }]}>
        <WarningIcon size={40} color={iconTint ?? colors.onSurfaceVariant} />
      </View>
      <AppText variant="titleSmall" color={headingColor} style={{ marginTop: 20, textAlign: 'center' }}>{heading}</AppText>
      <AppText variant="bodySmall" color={bodyColor ?? colors.onSurfaceVariant} style={{ marginTop: 8, textAlign: 'center' }}>{body}</AppText>
    </View>
  );
}

export function StatusIcon({ children, background }: { children: React.ReactNode; background: string }) {
  return <View style={[styles.statusIcon, { backgroundColor: background }]}>{children}</View>;
}

/** Card-like container used across screens. */
export function Card({ children, style, theme }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; theme?: Theme }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: (theme ?? t).colors.surface, borderRadius: 16 }, style]}>{children}</View>;
}

/** Segmented two-option toggle (Back/Front, Android/Apple). */
export function SegmentedToggle<T extends string>({ options, selected, onSelect, fill, trackColor, selectedColor }: {
  options: Array<{ value: T; label: string }>; selected: T; onSelect: (v: T) => void; fill?: boolean; trackColor: string; selectedColor: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.toggleTrack, { backgroundColor: trackColor }, !fill && { alignSelf: 'flex-start' }]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === selected;
        return (
          <Pressable key={o.value} onPress={() => onSelect(o.value)} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={o.label}
            style={[styles.toggleTab, fill && { flex: 1 }, active && { backgroundColor: selectedColor }]}>
            <Text style={[type.titleSmall, { color: active ? colors.onSurface : colors.onSurfaceVariant, textAlign: 'center' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: MIN_TOUCH, paddingHorizontal: 24, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  textButton: { minHeight: MIN_TOUCH, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  closeTarget: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  closeCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  notice: { alignItems: 'center', alignSelf: 'stretch' },
  statusIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  toggleTrack: { flexDirection: 'row', borderRadius: 14, padding: 4 },
  toggleTab: { borderRadius: 11, paddingHorizontal: 20, paddingVertical: 10, margin: 2, minHeight: 40, justifyContent: 'center' },
});
