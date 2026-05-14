/**
 * Settings screen background – grid and gradient.
 */
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { AppThemeColors } from '@/contexts/AppThemeContext';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;

interface Props {
  colors: AppThemeColors;
}

export function SettingsBackground({ colors }: Props) {
  void colors;
  return null;
}
