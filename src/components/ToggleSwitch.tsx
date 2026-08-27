import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  disabled?: boolean;
  activeTrackColor?: string;
  inactiveTrackColor?: string;
  thumbColor?: string;
  style?: ViewStyle;
}

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 22;
const THUMB_OFFSET = 3;
const TRANSLATE_X_MAX = TRACK_WIDTH - THUMB_SIZE - THUMB_OFFSET; // 48 - 22 - 3 = 23

export default function ToggleSwitch({
  value,
  onValueChange,
  disabled = false,
  activeTrackColor = '#1B54A4',
  inactiveTrackColor = '#B0B7C3',
  thumbColor = '#FFFFFF',
  style,
}: ToggleSwitchProps) {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [THUMB_OFFSET, TRANSLATE_X_MAX],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveTrackColor, activeTrackColor],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[styles.touchArea, style]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={[styles.track, { backgroundColor }]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: thumbColor,
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
