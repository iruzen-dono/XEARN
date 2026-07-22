/**
 * XEARN — Responsive Utilities
 * Scale sizes proportionally across devices (360px → 480+px base width)
 */

import { Dimensions, Platform, PixelRatio, ScaledSize } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Design base width (iPhone 14 Pro / standard phone)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Scale factor
const widthScale = SCREEN_WIDTH / BASE_WIDTH;
const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;

/**
 * Scale horizontally (for widths, padding horizontal, font sizes)
 * Use for most UI elements
 */
export function scale(size: number): number {
  const newSize = size * widthScale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/**
 * Scale vertically (for heights, padding vertical, margins)
 * Use sparingly — prefer scale() for consistency
 */
export function verticalScale(size: number): number {
  const newSize = size * heightScale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/**
 * Moderate scale — grows slower on large screens
 * Best for font sizes, icons, border radii
 */
export function moderateScale(size: number, factor = 0.5): number {
  const newSize = size + (scale(size) - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/**
 * Get current window dimensions (reactive — use with Dimensions listener)
 */
export function getWindow(): ScaledSize {
  return Dimensions.get('window');
}

/**
 * Screen size breakpoints for conditional rendering
 */
export function isSmallDevice(): boolean {
  return SCREEN_WIDTH < 375;
}

export function isTablet(): boolean {
  return SCREEN_WIDTH >= 768;
}

export function isLargeDevice(): boolean {
  return SCREEN_WIDTH >= 414;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Safe area padding for notches, status bars, home indicators
 */
export const safeArea = {
  top: Platform.OS === 'ios' ? 54 : 48,
  bottom: Platform.OS === 'ios' ? 34 : 16,
  horizontal: 20,
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
