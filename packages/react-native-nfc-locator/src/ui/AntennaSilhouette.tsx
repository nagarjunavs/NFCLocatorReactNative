import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, type LayoutChangeEvent, View, type ViewStyle, type StyleProp } from 'react-native';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';
import type { NormalizedRect } from '../domain/model/NormalizedRect';
import { boxStyle } from './boxStyle';
import { useTranslator } from './context';
import {
  CAMERA_BUMP,
  RIPPLE_DURATION_MS,
  RIPPLE_MAX_SCALE,
  RIPPLE_MIN_SCALE,
  RIPPLE_PEAK_ALPHA,
  STATIC_GLOW_ALPHA,
  type Size,
  fitWithinBounds,
  markerRadiusFor,
  silhouetteSpecFor,
  zoneCenter,
} from './geometry';
import { type NfcLocatorThemeInput, useNfcLocatorTheme } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface AntennaSilhouetteProps {
  templateId: string;
  zone: NormalizedRect;
  /**
   * Marker style, the one rule this component must never violate: a solid ring + dot when
   * true (EXACT / non-stale APPROXIMATE), a dashed ring with no dot when false (GENERIC,
   * UNKNOWN, stale). Callers must not pass `true` for a low-confidence state.
   */
  isConfident: boolean;
  style?: StyleProp<ViewStyle>;
  /** Freezes the ripple at a static glow (host in-app setting; the OS setting is also honored). */
  reducedMotion?: boolean;
  /** Fit the silhouette to the device's real width/height ratio instead of the template's. */
  aspectRatioOverride?: number | null;
  /** Draws a top-left camera-module square (opt-in, for illustrating a back panel). */
  showCameraBump?: boolean;
  cameraBumpColor?: string;
  silhouetteColor?: string;
  silhouetteBorderColor?: string;
  theme?: NfcLocatorThemeInput;
  locale?: string | null;
  /** @internal set by GuidedSweepAnimation, which supplies its own screen-reader description. */
  suppressAccessibility?: boolean;
}

/**
 * Draws a device silhouette (vector shapes, not photographic art) with the antenna zone
 * overlaid. The caller sizes the box; the silhouette is fitted and centered inside it and the
 * zone's fractional coordinates resolve against that fitted content area, so the marker always
 * lines up regardless of the box's extra space.
 *
 * When `isConfident` is true this announces itself to screen readers; when false it stays
 * silent because every low-confidence caller layers it inside GuidedSweepAnimation, which
 * supplies its own (more accurate) description; describing both would double-announce.
 */
export function AntennaSilhouette({
  templateId,
  zone,
  isConfident,
  style,
  reducedMotion = false,
  aspectRatioOverride,
  showCameraBump = false,
  cameraBumpColor,
  silhouetteColor,
  silhouetteBorderColor,
  theme,
  locale,
  suppressAccessibility = false,
}: AntennaSilhouetteProps) {
  const t = useTranslator(locale);
  const colors = useNfcLocatorTheme(theme);
  const [box, setBox] = useState<Size>({ width: 0, height: 0 });
  const ripple = useRef(new Animated.Value(RIPPLE_MIN_SCALE)).current;

  useEffect(() => {
    if (reducedMotion) return;
    ripple.setValue(RIPPLE_MIN_SCALE);
    const loop = Animated.loop(
      Animated.timing(ripple, { toValue: RIPPLE_MAX_SCALE, duration: RIPPLE_DURATION_MS, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [reducedMotion, ripple]);

  const spec = silhouetteSpecFor(templateId);
  const markerColor = isConfident ? colors.markerConfident : colors.markerLowConfidence;
  const fill = silhouetteColor ?? colors.silhouette;
  const content = useMemo(() => fitWithinBounds(box, aspectRatioOverride ?? spec.aspectRatio), [box, aspectRatioOverride, spec.aspectRatio]);
  const offsetX = (box.width - content.width) / 2;
  const offsetY = (box.height - content.height) / 2;
  const center = zoneCenter(zone, content);
  const maxRadius = markerRadiusFor(content);
  const cornerRadius = content.width * spec.cornerRadiusFraction;

  const rippleRadius = ripple.interpolate({ inputRange: [RIPPLE_MIN_SCALE, RIPPLE_MAX_SCALE], outputRange: [maxRadius * RIPPLE_MIN_SCALE, maxRadius * RIPPLE_MAX_SCALE] });
  const rippleOpacity = ripple.interpolate({ inputRange: [RIPPLE_MIN_SCALE, RIPPLE_MAX_SCALE], outputRange: [RIPPLE_PEAK_ALPHA, 0] });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const a11y =
    isConfident && !suppressAccessibility
      ? ({ accessible: true, accessibilityRole: 'image', accessibilityLabel: t('nfc_locator_marker_content_description') } as const)
      : ({ accessible: false } as const);

  const ringRadius = maxRadius * 0.57;
  const ringStroke = maxRadius * 0.06;
  const ready = box.width > 0 && box.height > 0;

  return (
    <View style={[boxStyle(style), style]} onLayout={onLayout} testID="nfc-silhouette" {...a11y}>
      {ready && (
        <Svg width={box.width} height={box.height} pointerEvents="none">
          <G x={offsetX} y={offsetY}>
            <Rect width={content.width} height={content.height} rx={cornerRadius} ry={cornerRadius} fill={fill} />
            {silhouetteBorderColor ? (
              <Rect width={content.width} height={content.height} rx={cornerRadius} ry={cornerRadius} fill="none" stroke={silhouetteBorderColor} strokeWidth={1} />
            ) : null}
            {spec.kind === 'foldBookOpen' ? (
              <Line x1={content.width / 2} y1={content.height * 0.04} x2={content.width / 2} y2={content.height * 0.96} stroke="#000" strokeOpacity={0.18} strokeWidth={content.width * 0.012} />
            ) : null}
            {showCameraBump ? (
              <Rect
                x={content.width * CAMERA_BUMP.x}
                y={content.height * CAMERA_BUMP.y}
                width={content.width * CAMERA_BUMP.width}
                height={content.height * CAMERA_BUMP.height}
                rx={content.width * CAMERA_BUMP.width * CAMERA_BUMP.radiusOfWidth}
                fill={cameraBumpColor ?? fill}
              />
            ) : null}
            {reducedMotion ? (
              <Circle cx={center.x} cy={center.y} r={maxRadius} fill={markerColor} fillOpacity={STATIC_GLOW_ALPHA} testID="nfc-marker-glow-static" />
            ) : (
              <AnimatedCircle cx={center.x} cy={center.y} r={rippleRadius} fill={markerColor} fillOpacity={rippleOpacity} testID="nfc-marker-ripple" />
            )}
            {isConfident ? (
              <>
                <Circle cx={center.x} cy={center.y} r={ringRadius} fill="none" stroke={markerColor} strokeWidth={ringStroke} testID="nfc-marker-solid-ring" />
                <Circle cx={center.x} cy={center.y} r={maxRadius * 0.2} fill={markerColor} testID="nfc-marker-solid-dot" />
              </>
            ) : (
              <Circle cx={center.x} cy={center.y} r={ringRadius} fill="none" stroke={markerColor} strokeWidth={ringStroke} strokeDasharray="6,5" testID="nfc-marker-dashed-ring" />
            )}
          </G>
        </Svg>
      )}
    </View>
  );
}

