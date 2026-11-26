export type ThemeId = "serika" | "jade" | "paper" | "slate";

export type ThemeDefinition = {
  readonly id: ThemeId;
  readonly name: string;
  readonly subtitle: string;
  readonly scheme: "dark" | "light";
  readonly themeColor: string;
  readonly swatches: readonly [bg: string, surface: string, accent: string, text: string];
};

export const THEMES: readonly ThemeDefinition[] = [
  {
    id: "serika",
    name: "墨金",
    subtitle: "经典暗炭与暖金光标",
    scheme: "dark",
    themeColor: "#323437",
    swatches: ["#323437", "#2c2e31", "#e2b714", "#d1d0c5"],
  },
  {
    id: "jade",
    name: "松墨",
    subtitle: "深林墨绿与青玉微光",
    scheme: "dark",
    themeColor: "#181f1c",
    swatches: ["#181f1c", "#121815", "#52d6a0", "#e4ece7"],
  },
  {
    id: "paper",
    name: "宣纸",
    subtitle: "素纸柔光与松烟墨绿",
    scheme: "light",
    themeColor: "#f4f3ee",
    swatches: ["#f4f3ee", "#e8e6de", "#285d48", "#232925"],
  },
  {
    id: "slate",
    name: "松烟",
    subtitle: "冷调暗灰与清蓝光标",
    scheme: "dark",
    themeColor: "#1e242d",
    swatches: ["#1e242d", "#181d25", "#6ec6f5", "#e2e8f0"],
  },
];

export const themePreference = "hexi-theme-v1";
const DEFAULT_THEME: ThemeId = "serika";

export function isThemeId(value: unknown): value is ThemeId {
  return value === "serika" || value === "jade" || value === "paper" || value === "slate";
}

export function getTheme(id: ThemeId): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

export function readTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(themePreference);
    return isThemeId(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(id: ThemeId) {
  const theme = getTheme(id);
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.classList.toggle("dark", theme.scheme === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme.themeColor);
  try {
    localStorage.setItem(themePreference, theme.id);
  } catch {
    // Theme selection still applies in memory when storage is unavailable.
  }
}
