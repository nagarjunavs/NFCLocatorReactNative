import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, type LayoutChangeEvent, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, RadialGradient, Stop } from 'react-native-svg';
import type { NormalizedRect } from '../domain/model/NormalizedRect';
import { AntennaSilhouette, type AntennaSilhouetteProps } from './AntennaSilhouette';
import { boxStyle } from './boxStyle';
import { useTranslator } from './context';
import { type Size, SWEEP_DURATION_MS, fitWithinBounds, markerRadiusFor, silhouetteSpecFor } from './geometry';
import { useNfcLocatorTheme } from './theme';
import { useReducedMotion } from './motion';

const AnimatedG = Animated.createAnimatedComponent(G);

export interface GuidedSweepAnimationProps
  extends Pick<
    AntennaSilhouetteProps,
    'templateId' | 'zone' | 'reducedMotion' | 'aspectRatioOverride' | 'showCameraBump' | 'cameraBumpColor' | 'silhouetteColor' | 'silhouetteBorderColor' | 'theme' | 'locale'
  > {
  style?: StyleProp<ViewStyle>;
}

/**
 * A moving highlight sweeping across the zone, prompting the user to physically move their
 * phone across the reader rather than trust a fixed point. Stands in for a marker whenever
 * confidence is too low to show one. Layered on top of AntennaSilhouette (dashed low-confidence
 * ring + moving highlight both visible). Reduced motion freezes the sweep mid-zone.
 */
export function GuidedSweepAnimation({ style, ...props }: GuidedSweepAnimationProps) {
  const t = useTranslator(props.locale);
  const reduced = useReducedMotion(props.reducedMotion);
  return (
    <View
      style={[boxStyle(style), style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('nfc_locator_sweep_content_description')}
      testID="nfc-guided-sweep"
    >
      <AntennaSilhouette {...props} isConfident={false} reducedMotion={reduced} style={StyleSheet.absoluteFill} suppressAccessibility />
      <SweepHighlight {...props} reducedMotion={reduced} />
    </View>
  );
}

function SweepHighlight({
  templateId,
  zone,
  reducedMotion,
  aspectRatioOverride,
  theme,
}: {
  templateId: string;
  zone: NormalizedRect;
  reducedMotion: boolean;
  aspectRatioOverride?: number | null;
  theme?: GuidedSweepAnimationProps['theme'];
}) {
  const colors = useNfcLocatorTheme(theme);
  const [box, setBox] = useState<Size>({ width: 0, height: 0 });
  const progress = useRef(new Animated.Value(reducedMotion ? 0.5 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(0.5);
      return;
    }
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: SWEEP_DURATION_MS, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(progress, { toValue: 0, duration: SWEEP_DURATION_MS, easing: Easing.linear, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reducedMotion, progress]);

  const spec = silhouetteSpecFor(templateId);
  // Same fit-and-center as AntennaSilhouette so the highlight stays aligned with the marker.
  const content = fitWithinBounds(box, aspectRatioOverride ?? spec.aspectRatio);
  const offsetX = (box.width - content.width) / 2;
  const offsetY = (box.height - content.height) / 2;
  const left = zone.x * content.width;
  const right = (zone.x + zone.width) * content.width;
  const centerY = (zone.y + zone.height / 2) * content.height;
  const radius = markerRadiusFor(content);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [left, right] });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {box.width > 0 && box.height > 0 && (
        <Svg width={box.width} height={box.height}>
          <Defs>
            <RadialGradient id="nfcSweep" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.markerLowConfidence} stopOpacity={0.55} />
              <Stop offset="1" stopColor={colors.markerLowConfidence} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <G x={offsetX} y={offsetY}>
            <AnimatedG x={translateX}>
              <Circle cx={0} cy={centerY} r={radius} fill="url(#nfcSweep)" testID="nfc-sweep-highlight" />
            </AnimatedG>
          </G>
        </Svg>
      )}
    </View>
  );
}

