import { Settings as SettingsIcon, Palette, Check } from "lucide-react";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

/**
 * SETTINGS SCREEN
 * 
 * Features:
 * - Theme color selection (Green/Pink)
 * - User preferences
 * - UI customization options
 */

interface SettingsProps {
  currentTheme: "green" | "pink";
  onThemeChange: (theme: "green" | "pink") => void;
}

const themes = [
  {
    id: "green" as const,
    name: "Garden Green",
    description: "Calm, natural, and refreshing",
    preview: {
      primary: "#2E7D32",
      accent: "#8BC34A",
      background: "#F6FBF4",
    },
  },
  {
    id: "pink" as const,
    name: "Blossom Pink",
    description: "Vibrant, cheerful, and energetic",
    preview: {
      primary: "#D81B60",
      accent: "#F48FB1",
      background: "#FFF0F5",
    },
  },
];

export function Settings({ currentTheme, onThemeChange }: SettingsProps) {
  return (
    <div className="max-w-4xl mx-auto pb-20 lg:pb-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-8 h-8 text-primary" />
          <h1 className="text-text-900">Settings</h1>
        </div>
        <p className="text-text-600">
          Customize your LeafTasks experience
        </p>
      </div>

      {/* Theme Selection */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-text-900">Color Theme</h2>
            <p className="text-sm text-text-600">
              Choose your preferred color scheme
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onThemeChange(theme.id)}
              className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                currentTheme === theme.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface hover:border-primary/30"
              }`}
            >
              {/* Selected Indicator */}
              {currentTheme === theme.id && (
                <div className="absolute top-4 right-4 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}

              {/* Theme Info */}
              <h3 className="text-text-900 mb-2">{theme.name}</h3>
              <p className="text-sm text-text-600 mb-4">{theme.description}</p>

              {/* Color Preview */}
              <div className="flex gap-2">
                <div
                  className="w-12 h-12 rounded-lg border border-border"
                  style={{ backgroundColor: theme.preview.primary }}
                  title="Primary Color"
                />
                <div
                  className="w-12 h-12 rounded-lg border border-border"
                  style={{ backgroundColor: theme.preview.accent }}
                  title="Accent Color"
                />
                <div
                  className="w-12 h-12 rounded-lg border border-border"
                  style={{ backgroundColor: theme.preview.background }}
                  title="Background Color"
                />
              </div>
            </button>
          ))}
        </div>
      </Card>

      
    </div>
  );
}
