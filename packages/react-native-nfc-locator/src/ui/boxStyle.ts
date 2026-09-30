import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Default box for the silhouette components: fill the parent (`flex: 1`, stretched). When the
 * caller gives an explicit width or alignSelf, that wins; otherwise `alignSelf: 'stretch'`
 * would override a centered fixed-size marker and pin it to the start edge.
 */
export function boxStyle(style: StyleProp<ViewStyle>): ViewStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  return {
    ...(flat.flex === undefined ? { flex: 1 } : {}),
    ...(flat.width === undefined && flat.alignSelf === undefined ? { alignSelf: 'stretch' } : {}),
  };
}
