/**
 * AppThemeContext – global theme state (dark/light mode).
 * Fixed gold accent color (#D4A84B) for consistency across the app.
 * Persists to AsyncStorage so the choice survives app restarts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ── Fixed accent color (gold) ────────────────────────────────────────────────
const ACCENT_COLOR = '#D4A84B';
const ACCENT_MUTED = '#C9A227';

// ── Dark / Light palette ─────────────────────────────────────────────────────
const DARK = {
    background: '#0D0D0D',
    surface: '#2A2520',
    surfaceElevated: '#3D3630',
    text: '#FAF7F2',
    textSecondary: '#D4B896',
    border: '#5C5248',
    inputBg: '#1E1B18',
    placeholder: '#8B7355',
    overlay: 'rgba(13,13,13,0.58)',
    socialButtonBg: '#FFFFFF',
};

const LIGHT = {
    background: '#F5F1EB',
    surface: '#FFFFFF',
    surfaceElevated: '#EDE8E0',
    text: '#1A1410',
    textSecondary: '#6B5F4E',
    border: '#C8BCA8',
    inputBg: '#FFFFFF',
    placeholder: '#A89880',
    overlay: 'rgba(245,241,235,0.58)',
    socialButtonBg: '#1A1410',
};

// ── Context type ─────────────────────────────────────────────────────────────
export type AppThemeColors = typeof DARK & { accent: string; accentMuted: string };

interface AppThemeContextValue {
    isDark: boolean;
    colors: AppThemeColors;
    toggleDark: () => void;
}

const STORAGE_KEY_DARK = '@appTheme_isDark';

function buildColors(isDark: boolean): AppThemeColors {
    const base = isDark ? DARK : LIGHT;
    return {
        ...base,
        accent: ACCENT_COLOR,
        accentMuted: ACCENT_MUTED,
    };
}

// ── Context + Provider ────────────────────────────────────────────────────────
const AppThemeContext = createContext<AppThemeContextValue>({
    isDark: true,
    colors: buildColors(true),
    toggleDark: () => { },
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(true);

    // Load persisted preference once
    useEffect(() => {
        (async () => {
            try {
                const dark = await AsyncStorage.getItem(STORAGE_KEY_DARK);
                if (dark !== null) setIsDark(dark === 'true');
            } catch { /* ignore */ }
        })();
    }, []);

    const toggleDark = useCallback(() => {
        setIsDark(prev => {
            const next = !prev;
            AsyncStorage.setItem(STORAGE_KEY_DARK, String(next)).catch(() => { });
            return next;
        });
    }, []);

    const colors = buildColors(isDark);

    return (
        <AppThemeContext.Provider value={{ isDark, colors, toggleDark }}>
            {children}
        </AppThemeContext.Provider>
    );
}

export function useAppTheme() {
    return useContext(AppThemeContext);
}

