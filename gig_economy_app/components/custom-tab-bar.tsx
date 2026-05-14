import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors, authFonts } from '@/constants/auth-theme';

const TAB_ROUTES = {
  index: { label: 'Home', icon: 'home-outline', iconFilled: 'home' },
  schedule: { label: 'Schedule', icon: 'calendar-outline', iconFilled: 'calendar' },
  explore: { label: 'Search', icon: 'search-outline', iconFilled: 'search' },
  profile: { label: 'Profile', icon: 'person-circle-outline', iconFilled: 'person-circle' },
  messages: { label: 'Messages', icon: 'mail-outline', iconFilled: 'mail' },
} as const;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const handlePress = (route: any, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate(route.name);
    }
  };

  // Group tabs: [Home, Schedule] | [Search] | [Profile, Messages]
  const leftTabs = state.routes.slice(0, 2); // Home, Schedule
  const middleTab = state.routes[2]; // Search/Explore
  const rightTabs = state.routes.slice(3); // Profile, Messages

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.blurContainer}>
        {/* Left Container: Home + Schedule */}
        <BlurView intensity={80} tint="light" style={styles.groupContainer}>
          {leftTabs.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === state.routes.indexOf(route);
            const tabInfo = TAB_ROUTES[route.name as keyof typeof TAB_ROUTES];

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={() => handlePress(route, isFocused)}
                style={({ pressed }) => [
                  styles.tabButton,
                  isFocused && styles.tabButtonSelected,
                  pressed && styles.tabButtonPressed,
                ]}
              >
                <Ionicons
                  name={isFocused ? (tabInfo?.iconFilled as any) : (tabInfo?.icon as any)}
                  size={24}
                  color={isFocused ? authColors.accent : authColors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isFocused ? authColors.accent : authColors.textSecondary },
                  ]}
                >
                  {tabInfo?.label || route.name}
                </Text>
              </Pressable>
            );
          })}
        </BlurView>

        {/* Middle Container: Search */}
        <BlurView intensity={80} tint="light" style={styles.middleContainer}>
          {middleTab && (() => {
            const { options } = descriptors[middleTab.key];
            const isFocused = state.index === state.routes.indexOf(middleTab);
            const tabInfo = TAB_ROUTES[middleTab.name as keyof typeof TAB_ROUTES];

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={() => handlePress(middleTab, isFocused)}
                style={({ pressed }) => [
                  styles.middleTabButton,
                  isFocused && styles.tabButtonSelected,
                  pressed && styles.tabButtonPressed,
                ]}
              >
                <Ionicons
                  name={isFocused ? (tabInfo?.iconFilled as any) : (tabInfo?.icon as any)}
                  size={24}
                  color={isFocused ? authColors.accent : authColors.textSecondary}
                />
                <Text
                  style={[
                    styles.middleTabLabel,
                    { color: isFocused ? authColors.accent : authColors.textSecondary },
                  ]}
                >
                  {tabInfo?.label || middleTab.name}
                </Text>
              </Pressable>
            );
          })()}
        </BlurView>

        {/* Right Container: Profile + Messages */}
        <BlurView intensity={80} tint="light" style={styles.groupContainer}>
          {rightTabs.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === state.routes.indexOf(route);
            const tabInfo = TAB_ROUTES[route.name as keyof typeof TAB_ROUTES];

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={() => handlePress(route, isFocused)}
                style={({ pressed }) => [
                  styles.tabButton,
                  isFocused && styles.tabButtonSelected,
                  pressed && styles.tabButtonPressed,
                ]}
              >
                <Ionicons
                  name={isFocused ? (tabInfo?.iconFilled as any) : (tabInfo?.icon as any)}
                  size={24}
                  color={isFocused ? authColors.accent : authColors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isFocused ? authColors.accent : authColors.textSecondary },
                  ]}
                >
                  {tabInfo?.label || route.name}
                </Text>
              </Pressable>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F5F5F5',
  },
  blurContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
  },
  groupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 16,
    padding: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  middleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabButtonSelected: {
    backgroundColor: 'rgba(240, 240, 240, 0.9)',
  },
  middleTabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: authFonts.semiBold,
    marginTop: 4,
  },
  middleTabLabel: {
    fontSize: 10,
    fontFamily: authFonts.semiBold,
    marginTop: 4,
  },
});

