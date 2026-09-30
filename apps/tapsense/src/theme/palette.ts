/**
 * Raw TapSense palette. Brand tokens the color roles don't name directly live here: e.g.
 * "graphite" for primary buttons is distinct from the "aqua" accent reserved for the tap-zone
 * marker.
 */
export const Palette = {
  // Light
  LightBg: '#F6F5F1',
  LightSurface: '#FFFFFF',
  LightSurfaceAlt: '#F1F0EC',
  Ink: '#211F1C',
  Ink2: '#6B675F',
  Ink3: '#8B8779',
  LightOutline: '#E4E1DA',
  LightDivider: '#EFEDE7',
  // Dark
  DarkBg: '#171613',
  DarkSurface: '#1F1D19',
  DarkSurfaceAlt: '#262420',
  DarkSurfaceDeep: '#100F0D',
  DarkOutline: '#34322C',
  DarkDivider: '#2A2823',
  TextLight: '#F3F1EB',
  TextLightSecondary: '#A6A199',
  // Brand / accents
  Graphite: '#33312C',
  Aqua: '#35C6D9',
  AquaDark: '#4FE0F0',
  AquaLink: '#0E4B54',
  Amber: '#E0A63C',
  AmberOn: '#7A5A1E',
  AmberOnStrong: '#8C6317',
  AmberContainer: '#FBF2E2',
  AmberContainerDark: '#262420',
  Success: '#3FA66B',
  SuccessOn: '#245C3E',
  SuccessContainer: '#EAF6EF',
  Error: '#D1483C',
  ApproxOn: '#1B818E',
  ApproxContainer: '#E9FAFB',
  // Generic reader/terminal illustration: hardware the phone taps against, not guidance.
  ReaderOuter: '#413E37',
  ReaderInner: '#514E46',
  ReaderOuterLight: '#DAD6CC',
  ReaderInnerLight: '#C9C6BD',
  // Back/Front and Android/Apple segmented toggles.
  ToggleTrackLight: '#EAE7E0',
  ToggleTrackDark: '#2E2C27',
  ToggleTabSelectedDark: '#454239',
  // Settings switches, off state.
  SwitchOffTrackLight: '#C9C6BD',
  SwitchOffTrackDark: '#4C4A44',
  SwitchOffThumbDark: '#D8D5CC',
  // My Phone Front hardware cutouts.
  ScreenInsetLight: '#0D0C0B',
  HardwareCutoutDark: '#000000',
  // Back-of-phone silhouette body/border: same fill in light and dark mode on purpose.
  PhoneBody: '#57544C',
  PhoneBodyBorder: '#6B675F',
  PhoneBodyDark: '#68655C',
  PhoneBodyBorderDark: '#7A766C',
} as const;
