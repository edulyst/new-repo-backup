import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { authColors } from '@/constants/auth-theme';

type AuthScreenLayoutProps = {
  children: React.ReactNode;
  /** Ref to scroll into view when keyboard opens (keeps focused input visible). */
  scrollTargetRef?: RefObject<View | null>;
};

/**
 * Full-height layout: edge-to-edge, no extra space.
 * - KeyboardAvoidingView: keeps focused input visible on iOS & Android
 * - ScrollView: enables scroll when keyboard opens; scrolls to scrollTargetRef so input stays visible
 * - Pressable: tap outside to dismiss keyboard
 */
export function AuthScreenLayout({ children, scrollTargetRef }: AuthScreenLayoutProps) {
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);

  useEffect(() => {
    if (!scrollTargetRef) return;
    const sub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        const target = scrollTargetRef.current;
        const content = contentRef.current;
        const scroll = scrollRef.current;
        if (target && content && scroll && typeof (target as View).measureLayout === 'function') {
          (target as View).measureLayout(
            content,
            (_x, y) => {
              scrollRef.current?.scrollTo({
                y: Math.max(0, y - 80),
                animated: true,
              });
            },
            () => {}
          );
        }
      }
    );
    return () => sub.remove();
  }, [scrollTargetRef]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.pressable} onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View ref={contentRef} style={styles.content} collapsable={false}>
              {children}
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  keyboard: { flex: 1 },
  pressable: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
  },
});

