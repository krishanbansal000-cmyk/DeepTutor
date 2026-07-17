"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getStoredTheme,
  getSystemTheme,
  normalizeTheme,
  setTheme as applyThemePreference,
  subscribeToThemeChanges,
  type Theme,
} from "@/lib/theme";
import {
  ACTIVE_SESSION_EVENT,
  ACTIVE_SESSION_STORAGE_KEY,
  EXPERIENCE_MODE_EVENT,
  EXPERIENCE_MODE_STORAGE_KEY,
  LANGUAGE_EVENT,
  LANGUAGE_STORAGE_KEY,
  SIDEBAR_COLLAPSED_EVENT,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  normalizeLanguage,
  readStoredActiveSessionId,
  readStoredExperienceMode,
  readStoredLanguage,
  readStoredSidebarCollapsed,
  writeStoredActiveSessionId,
  writeStoredExperienceMode,
  writeStoredLanguage,
  writeStoredSidebarCollapsed,
  type AppLanguage,
} from "@/context/app-shell-storage";
import { apiFetch, apiUrl } from "@/lib/api";
import {
  normalizeExperienceMode,
  type ExperienceMode,
} from "@/lib/experience-mode";

interface AppShellContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  experienceMode: ExperienceMode;
  setExperienceMode: (mode: ExperienceMode) => void;
  activeSessionId: string | null;
  setActiveSessionId: (sessionId: string | null) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return getStoredTheme() ?? getSystemTheme();
  });
  // Always start with "en" to match SSR; hydrate from localStorage after mount
  const [language, setLanguageState] = useState<AppLanguage>("en");
  const [experienceMode, setExperienceModeState] =
    useState<ExperienceMode>("student");
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(
    () => readStoredActiveSessionId(),
  );
  // Always start expanded to match SSR; hydrate from localStorage after mount
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);

  useEffect(() => {
    // Hydrate client-only preferences after SSR-safe first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLanguageState(readStoredLanguage());
    setExperienceModeState(readStoredExperienceMode());
    setSidebarCollapsedState(readStoredSidebarCollapsed());

    // The JSON-backed preference is canonical. Local storage provides an
    // immediate paint; this refresh keeps new browsers and other devices in
    // sync with data/user/settings/interface.json.
    void apiFetch(apiUrl("/api/v1/settings"))
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          ui?: {
            theme?: unknown;
            language?: unknown;
            experience_mode?: unknown;
          };
        };
        const nextTheme = normalizeTheme(payload.ui?.theme);
        const nextLanguage = normalizeLanguage(
          payload.ui?.language == null ? undefined : String(payload.ui.language),
        );
        const mode = normalizeExperienceMode(payload.ui?.experience_mode);
        applyThemePreference(nextTheme);
        setThemeState(nextTheme);
        writeStoredLanguage(nextLanguage);
        setLanguageState(nextLanguage);
        writeStoredExperienceMode(mode);
        setExperienceModeState(mode);
      })
      .catch(() => {
        // Offline startup keeps the local/default Student experience.
      });
  }, []);

  useEffect(() => {
    return subscribeToThemeChanges((nextTheme) => {
      setThemeState(nextTheme);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY) {
        setLanguageState(normalizeLanguage(event.newValue));
      }
      if (event.key === EXPERIENCE_MODE_STORAGE_KEY) {
        setExperienceModeState(normalizeExperienceMode(event.newValue));
      }
      if (event.key === ACTIVE_SESSION_STORAGE_KEY) {
        setActiveSessionIdState(event.newValue);
      }
      if (event.key === SIDEBAR_COLLAPSED_STORAGE_KEY) {
        setSidebarCollapsedState(event.newValue === "1");
      }
    };

    const onLanguage = (event: Event) => {
      const detail = (event as CustomEvent<{ language?: AppLanguage }>).detail;
      setLanguageState(normalizeLanguage(detail?.language));
    };

    const onExperienceMode = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: ExperienceMode }>).detail;
      setExperienceModeState(normalizeExperienceMode(detail?.mode));
    };

    const onActiveSession = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionId?: string | null }>)
        .detail;
      setActiveSessionIdState(detail?.sessionId ?? null);
    };

    const onSidebarCollapsed = (event: Event) => {
      const detail = (event as CustomEvent<{ collapsed?: boolean }>).detail;
      setSidebarCollapsedState(Boolean(detail?.collapsed));
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(LANGUAGE_EVENT, onLanguage);
    window.addEventListener(EXPERIENCE_MODE_EVENT, onExperienceMode);
    window.addEventListener(ACTIVE_SESSION_EVENT, onActiveSession);
    window.addEventListener(SIDEBAR_COLLAPSED_EVENT, onSidebarCollapsed);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LANGUAGE_EVENT, onLanguage);
      window.removeEventListener(EXPERIENCE_MODE_EVENT, onExperienceMode);
      window.removeEventListener(ACTIVE_SESSION_EVENT, onActiveSession);
      window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, onSidebarCollapsed);
    };
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    applyThemePreference(nextTheme);
    setThemeState(nextTheme);
  }, []);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    writeStoredLanguage(nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  const setExperienceMode = useCallback((nextMode: ExperienceMode) => {
    writeStoredExperienceMode(nextMode);
    setExperienceModeState(nextMode);
  }, []);

  const setActiveSessionId = useCallback((sessionId: string | null) => {
    writeStoredActiveSessionId(sessionId);
    setActiveSessionIdState(sessionId);
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    writeStoredSidebarCollapsed(collapsed);
    setSidebarCollapsedState(collapsed);
  }, []);

  const value = useMemo<AppShellContextValue>(
    () => ({
      theme,
      setTheme,
      language,
      setLanguage,
      experienceMode,
      setExperienceMode,
      activeSessionId,
      setActiveSessionId,
      sidebarCollapsed,
      setSidebarCollapsed,
    }),
    [
      activeSessionId,
      experienceMode,
      language,
      setActiveSessionId,
      setLanguage,
      setExperienceMode,
      setSidebarCollapsed,
      setTheme,
      sidebarCollapsed,
      theme,
    ],
  );

  return (
    <AppShellContext.Provider value={value}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used inside AppShellProvider");
  }
  return context;
}
