import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Glass, platformShadow } from '@/src/theme/Colors';
import { LiquidGlass } from '@/src/components/LiquidGlass';

const TAB_ITEMS = [
  { name: 'index', label: 'Games', icon: 'gamecontroller.fill', accent: Colors.blue },
  { name: 'tools', label: 'Tools', icon: 'wrench.and.screwdriver.fill', accent: Colors.mint },
  { name: 'friends', label: 'Friends', icon: 'person.2.fill', accent: Colors.pink },
  { name: 'factory', label: 'Factory', icon: 'wand.and.stars', accent: Colors.purple },
] as const;

type TabItem = (typeof TAB_ITEMS)[number];

const BAR_HEIGHT = 64;
const ORB_SIZE = 54;

function TabIcon({
  item,
  focused,
  onPress,
  onLayout,
}: {
  item: TabItem;
  focused: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const scale = useSharedValue(1);
  const lift = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    lift.value = withSpring(focused ? 1 : 0, { damping: 16, stiffness: 220, mass: 0.7 });
  }, [focused, lift]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(lift.value, [0, 1], [0, -2]) },
      { scale: scale.value },
    ],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: lift.value,
    transform: [{ scale: interpolate(lift.value, [0, 1], [0.4, 1]) }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: lift.value,
    transform: [{ translateY: interpolate(lift.value, [0, 1], [4, 0]) }],
  }));

  const tint = focused ? '#FFFFFF' : 'rgba(255,255,255,0.5)';

  return (
    <Pressable
      onPress={() => {
        scale.value = withTiming(0.86, { duration: 90, easing: Easing.out(Easing.quad) }, () => {
          scale.value = withSpring(1, { damping: 10, stiffness: 320 });
        });
        onPress();
      }}
      onLayout={onLayout}
      android_ripple={{ color: 'rgba(255,255,255,0.10)', borderless: true, radius: 30 }}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <IconSymbol size={focused ? 24 : 22} name={item.icon as any} color={tint} />
      </Animated.View>
      <Animated.View style={[styles.dotWrap, dotStyle]} pointerEvents="none">
        <View style={[styles.dot, { backgroundColor: item.accent }]} />
      </Animated.View>
      <Animated.Text
        numberOfLines={1}
        style={[styles.label, labelStyle, { color: '#fff' }]}
      >
        {item.label}
      </Animated.Text>
    </Pressable>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'ios' ? Math.max(insets.bottom, 14) : 16;

  const [layouts, setLayouts] = useState<Record<number, { x: number; width: number }>>({});

  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  const visibleRoutes = state.routes.filter((r: any) =>
    TAB_ITEMS.some((t) => t.name === r.name)
  );
  const activeIndex = Math.max(
    0,
    visibleRoutes.findIndex((r: any) => state.index === state.routes.findIndex((sr: any) => sr.key === r.key))
  );

  useEffect(() => {
    const l = layouts[activeIndex];
    if (!l) return;
    const cx = l.x + l.width / 2;
    const w = ORB_SIZE;
    if (indicatorOpacity.value === 0) {
      indicatorX.value = cx - w / 2;
      indicatorW.value = w;
      indicatorOpacity.value = withTiming(1, { duration: 220 });
    } else {
      indicatorX.value = withSpring(cx - w / 2, { damping: 18, stiffness: 220, mass: 0.8 });
      indicatorW.value = withSpring(w, { damping: 18, stiffness: 220 });
    }
  }, [activeIndex, layouts, indicatorOpacity, indicatorW, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
    opacity: indicatorOpacity.value,
  }));

  const activeAccent = TAB_ITEMS[activeIndex]?.accent ?? Colors.blue;

  return (
    <View style={[styles.tabBarContainer, { bottom }]} pointerEvents="box-none">
      <LiquidGlass variant="chrome" radius={32} specular shadow style={styles.tabBarShell}>
        <View style={styles.innerStroke} pointerEvents="none" />

        {/* Animated accent orb behind active tab */}
        <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none">
          <LinearGradient
            colors={[`${activeAccent}55`, `${activeAccent}10`]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderRadius: ORB_SIZE / 2,
                borderWidth: 1,
                borderColor: `${activeAccent}66`,
              },
            ]}
          />
        </Animated.View>

        <View style={styles.tabBarContent}>
          {visibleRoutes.map((route: any, idx: number) => {
            const item = TAB_ITEMS.find((t) => t.name === route.name)!;
            const realIndex = state.routes.findIndex((r: any) => r.key === route.key);
            const isFocused = state.index === realIndex;
            const { options } = descriptors[route.key];

            const onPress = () => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(
                  isFocused
                    ? Haptics.ImpactFeedbackStyle.Light
                    : Haptics.ImpactFeedbackStyle.Medium
                );
              }
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TabIcon
                key={route.key}
                item={item}
                focused={isFocused}
                onPress={onPress}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  setLayouts((prev) => {
                    if (prev[idx]?.x === x && prev[idx]?.width === width) return prev;
                    return { ...prev, [idx]: { x, width } };
                  });
                  void options;
                }}
              />
            );
          })}
        </View>
      </LiquidGlass>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Games' }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
      <Tabs.Screen name="factory" options={{ title: 'Factory' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: BAR_HEIGHT,
    ...platformShadow(20, '#000', 0.55, 30),
  },
  tabBarShell: {
    flex: 1,
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  indicator: {
    position: 'absolute',
    top: (BAR_HEIGHT - ORB_SIZE) / 2,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  iconWrap: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: 'Viral-Black',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dotWrap: {
    position: 'absolute',
    bottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0,
  },
});

void Glass;
