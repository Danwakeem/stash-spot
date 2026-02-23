export const colors = {
  background: "#F5F0E8", // aged paper / grip tape beige
  primary: "#E84B1E", // faded red — Independent trucks
  secondary: "#2B4D8C", // faded denim blue
  accent: "#F2C94C", // yellow warning tape
  dark: "#1A1A1A", // almost black — blackout grip
  text: "#2C2C2C",
  mutedText: "#8C7B6B",
  white: "#FFFFFF",
  cardBg: "#FAF6F0",
} as const;

export const fonts = {
  heading: "BebasNeue",
  body: "SpaceMono",
  accent: "PermanentMarker",
} as const;

// Visibility pin colors for the map
export const visibilityColors = {
  private: "#8C7B6B", // gray/muted
  group: "#2B4D8C", // blue
  public: "#E84B1E", // orange-red
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
} as const;
