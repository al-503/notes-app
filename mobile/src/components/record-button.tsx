import { Feather } from '@expo/vector-icons';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

type RecordButtonProps = {
  onPress: () => void;
  active?: boolean;
  size?: number;
};

export function RecordButton({ onPress, active, size = 96 }: RecordButtonProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    pulse.setValue(0);
    Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    onPress();
  };

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const color = active ? Colors.danger : Colors.accent;

  return (
    <Pressable onPress={handlePress} style={[styles.wrapper, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <View
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
        {active ? (
          <View style={styles.stopIcon} />
        ) : (
          <Feather name="mic" size={size * 0.31} color="#FFFFFF" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
});
