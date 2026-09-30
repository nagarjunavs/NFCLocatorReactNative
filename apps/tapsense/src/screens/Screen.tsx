import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';

/**
 * Every screen's root fills the available size before its background is applied. Otherwise a
 * short, centered screen reports only its content's size and the background stops short of the
 * screen edges.
 */
export function Screen({ children, style, top = true, bottom = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; top?: boolean; bottom?: boolean }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: top ? insets.top : 0, paddingBottom: bottom ? insets.bottom : 0 }, style]}>
      {children}
    </View>
  );
}

/** Scrolling screen body (whole-screen scroll: no nested independently-scrolling regions). */
export function ScrollScreen({ children, contentStyle, top = true, bottom = true }: { children: React.ReactNode; contentStyle?: StyleProp<ViewStyle>; top?: boolean; bottom?: boolean }) {
  return (
    <Screen top={top} bottom={bottom}>
      <ScrollView contentContainerStyle={[styles.scrollContent, contentStyle]} showsVerticalScrollIndicator={false}>{children}</ScrollView>
    </Screen>
  );
}

/** Scroll body for screens that already wrap themselves in a {@link Screen} (avoids double safe-area padding). */
export function ScrollBody({ children, contentStyle }: { children: React.ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.scrollContent, contentStyle]} showsVerticalScrollIndicator={false}>{children}</ScrollView>
  );
}

/** Top-right row that hosts a screen's close button. */
export function CloseRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.closeRow}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignSelf: 'stretch' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 },
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8, paddingRight: 16 },
});
