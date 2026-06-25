import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CustomIconButton from './CustomIconButton';
import { color, space } from '../theme/tokens';

interface ScreenHeaderProps {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  right?: ReactNode;
}

/** Industrial dark command bar used across secondary screens. */
export default function ScreenHeader({ title, eyebrow, onBack, right }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {onBack && (
        <CustomIconButton iconType="back" onPress={onBack} color={color.onChrome} />
      )}
      <View style={styles.titleBlock}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.chrome,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    minHeight: 56,
  },
  titleBlock: {
    flex: 1,
    marginLeft: space.xs,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: color.onChromeMuted,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: color.onChrome,
    letterSpacing: 0.3,
  },
});
