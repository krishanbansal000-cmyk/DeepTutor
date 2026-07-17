"use client";

import { useTranslation } from "react-i18next";

import { useSettings } from "@/components/settings/SettingsContext";
import { ThemePreviewCard } from "@/components/settings/ThemePreviewCard";
import { LanguageButtons } from "@/components/settings/UserLanguageSelector";
import {
  SettingRow,
  SettingSection,
  SettingsPageHeader,
} from "@/components/settings/shared";

export default function AppearanceSettingsPage() {
  const { t } = useTranslation();
  const { theme, updateTheme } = useSettings();

  return (
    <div data-tour="tour-appearance">
      <SettingsPageHeader
        title={t("Appearance")}
        description={t(
          "Tune the visual theme and interface language. Changes apply immediately and are stored in your account.",
        )}
      />

      <SettingSection
        title={t("Language")}
        description={t("Choose the interface language.")}
      >
        <SettingRow
          title={t("Interface language")}
          description={t(
            "Sets the interface and tutor response language. Regional modes keep code and technical terms in English.",
          )}
          control={<LanguageButtons />}
        />
      </SettingSection>

      <SettingSection
        title={t("Theme")}
        description={t(
          "Pick the colour palette and interface style. Each tile previews the theme it applies.",
        )}
      >
        <div className="py-4">
          {/* Order is intentional: Default (beige paper, the default
              selection; theme id "snow" kept for stored preferences) →
              warm-light Cream → warm-dark Dark → cool-dark Glass. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                { id: "snow", label: t("Default") },
                { id: "light", label: t("Light Beige") },
                { id: "dark", label: t("Dark") },
                { id: "glass", label: t("Glass") },
              ] as const
            ).map(({ id, label }) => (
              <ThemePreviewCard
                key={id}
                theme={id}
                label={label}
                selected={theme === id}
                onSelect={updateTheme}
              />
            ))}
          </div>
          <p className="mt-4 text-[11.5px] leading-relaxed text-[var(--muted-foreground)]/80">
            {t(
              "Default and Light Beige use a warm paper-like background. Dark keeps the same warmth on near-black. Glass adds translucent purple panels on a deep gradient.",
            )}
          </p>
        </div>
      </SettingSection>
    </div>
  );
}
