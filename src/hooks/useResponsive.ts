import { useWindowDimensions } from 'react-native';

import { breakpoints } from '../theme';

/** Reactive breakpoint info, driven by the live window size (resizes on web). */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isTablet: width >= breakpoints.tablet && width < breakpoints.desktop,
    isDesktop: width >= breakpoints.desktop,
  };
}
