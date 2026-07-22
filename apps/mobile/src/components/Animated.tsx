/**
 * XEARN — Animated Base Components
 * Reanimated-powered animations for fintech premium feel
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  DimensionValue,
} from 'react-native';
import { colors, borderRadius, shadows, spacing } from '../theme';
import { scale, moderateScale } from '../utils/responsive';

// ─────────────────────────────────────────────────────────────────────────────
// Animated Counter — number rolls up on mount
// ─────────────────────────────────────────────────────────────────────────────

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  style?: TextStyle;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

export function AnimatedNumber({
  value,
  duration = 800,
  style,
  suffix = '',
  prefix = '',
  decimals = 0,
}: AnimatedNumberProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      useNativeDriver: true,
    }).start();
  }, [value, duration]);

  const displayValue = animatedValue.interpolate({
    inputRange: [0, Math.max(value, 1)],
    outputRange: [0, Math.max(value, 1)],
    extrapolate: 'clamp',
  });

  return (
    <Animated.Text style={style}>
      {prefix}
      {displayValue.interpolate({
        inputRange: [0, Math.max(value, 1)],
        outputRange: ['0', value.toFixed(decimals)],
        extrapolate: 'clamp',
      })}
      {suffix}
    </Animated.Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Balance — large money display with shimmer
// ─────────────────────────────────────────────────────────────────────────────

export function AnimatedBalance({
  amount,
  currency = 'FCFA',
  style,
}: {
  amount: number;
  currency?: string;
  style?: TextStyle;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [amount]);

  const formatted = amount.toLocaleString();

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <AnimatedNumber value={amount} duration={1000} suffix={` ${currency}`} style={style} />
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Card — fade + slide entrance
// ─────────────────────────────────────────────────────────────────────────────

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
  gradient?: boolean;
  onPress?: () => void;
}

export function AnimatedCard({ children, delay = 0, style, gradient, onPress }: AnimatedCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const baseStyle: ViewStyle = {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: scale(16),
  };

  const Wrapper = onPress ? Pressable : View;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Wrapper
        onPress={onPress}
        style={[
          baseStyle,
          shadows.md,
          gradient && {
            background: undefined,
            borderColor: colors.borderActive,
          },
          style,
        ]}
      >
        {children}
      </Wrapper>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shimmer Loading — skeleton loader
// ─────────────────────────────────────────────────────────────────────────────

interface ShimmerProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Shimmer({
  width = '100%',
  height = 16,
  borderRadius: br = 6,
  style,
}: ShimmerProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        {
          width,
          height: scale(height),
          borderRadius: scale(br),
          backgroundColor: colors.bgCardAlt,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform: [{ translateX }],
          backgroundColor: 'transparent',
          opacity: 0.3,
        }}
      >
        <View
          style={{
            width: '60%',
            height: '100%',
            backgroundColor: colors.border,
            borderRadius: scale(br),
          }}
        />
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading Skeleton — full dashboard skeleton
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <View style={{ padding: scale(16), gap: scale(16) }}>
      <Shimmer height={20} width="40%" />
      <Shimmer height={120} borderRadius={16} />
      <View style={{ flexDirection: 'row', gap: scale(10) }}>
        <Shimmer height={80} style={{ flex: 1 }} />
        <Shimmer height={80} style={{ flex: 1 }} />
        <Shimmer height={80} style={{ flex: 1 }} />
      </View>
      <Shimmer height={20} width="50%" />
      <Shimmer height={60} />
      <Shimmer height={60} />
      <Shimmer height={60} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pulsing dot (for notifications, live indicators)
// ─────────────────────────────────────────────────────────────────────────────

export function PulsingDot({ color = colors.primary }: { color?: string }) {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        opacity: anim,
      }}
    />
  );
}

const styles = StyleSheet.create({
  // Reserved for potential static styles
});
