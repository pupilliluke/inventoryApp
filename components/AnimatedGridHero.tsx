import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, View, ViewStyle } from 'react-native';

/**
 * Native adaptation of the web "DataGridHero": a dark panel with a grid of cells
 * that pulse their opacity in a wave radiating from the center. The original used
 * DOM nodes + CSS @keyframes; React Native has neither, so each cell is an
 * Animated.View driven by a looping timing animation with a per-cell delay
 * derived from its distance to the grid center (the "pulse" animation type).
 *
 * Children render on top of the grid, centered, so it can back a hero header.
 */
interface AnimatedGridHeroProps {
  /** Total hero height in px. */
  height?: number;
  /** Edge length of each square cell. */
  cellSize?: number;
  /** Gap between cells. */
  spacing?: number;
  /** Cell color (the lit color of the pulse). */
  color?: string;
  /** Panel background behind the grid. */
  background?: string;
  /** Seconds for one up/down pulse cycle. */
  duration?: number;
  opacityMin?: number;
  opacityMax?: number;
  /** Animation type, mirroring the source component. */
  animationType?: 'pulse' | 'wave';
  children?: React.ReactNode;
  style?: ViewStyle;
  /** Available width to lay cells across (defaults to full width via flexWrap). */
  width?: number;
}

// react-native-web doesn't support the native driver for opacity and logs a
// warning; only opt in on real native platforms.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function Cell({
  size,
  spacing,
  color,
  delay,
  duration,
  opacityMin,
  opacityMax,
}: {
  size: number;
  spacing: number;
  color: string;
  delay: number;
  duration: number;
  opacityMin: number;
  opacityMax: number;
}) {
  const opacity = useRef(new Animated.Value(opacityMin)).current;

  useEffect(() => {
    const half = (duration * 1000) / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: opacityMax,
          duration: half,
          delay,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(opacity, {
          toValue: opacityMin,
          duration: half,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, delay, duration, opacityMin, opacityMax]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        margin: spacing / 2,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

export default function AnimatedGridHero({
  height = 210,
  cellSize = 22,
  spacing = 8,
  color = '#7cb3e8',
  background = '#0f172a',
  duration = 4.5,
  opacityMin = 0.05,
  opacityMax = 0.55,
  animationType = 'pulse',
  width,
  children,
  style,
}: AnimatedGridHeroProps) {
  // Derive the grid dimensions from the hero box. Width falls back to a wide
  // estimate so the flex-wrapped row fills whatever space the parent gives us.
  const gridWidth = width ?? 1000;
  const step = cellSize + spacing;
  const cols = Math.max(1, Math.floor(gridWidth / step));
  const rows = Math.max(1, Math.ceil(height / step));

  const cells = useMemo(() => {
    const centerRow = (rows - 1) / 2;
    const centerCol = (cols - 1) / 2;
    const out: { key: string; delay: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let delay: number;
        if (animationType === 'wave') {
          delay = (r + c) * 90;
        } else {
          const dr = r - centerRow;
          const dc = c - centerCol;
          delay = Math.sqrt(dr * dr + dc * dc) * 130;
        }
        out.push({ key: `${r}-${c}`, delay });
      }
    }
    return out;
  }, [rows, cols, animationType]);

  return (
    <View style={[styles.hero, { height, backgroundColor: background }, style]}>
      <View style={styles.grid} pointerEvents="none">
        {cells.map((cell) => (
          <Cell
            key={cell.key}
            size={cellSize}
            spacing={spacing}
            color={color}
            delay={cell.delay}
            duration={duration}
            opacityMin={opacityMin}
            opacityMax={opacityMax}
          />
        ))}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
});
