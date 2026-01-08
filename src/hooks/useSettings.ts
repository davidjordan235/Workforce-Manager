import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type AppSettings = {
  inOfficeColor: string;
  inOfficeTextColor: string;
};

const STORAGE_KEY = "workforce-manager-settings";

const DEFAULT_SETTINGS: AppSettings = {
  inOfficeColor: "#9333ea", // Purple-600
  inOfficeTextColor: "#ffffff",
};

// Get settings from localStorage
function getStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Save settings to localStorage
function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// Fetch settings
async function fetchSettings(): Promise<AppSettings> {
  return getStoredSettings();
}

// Update settings
async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = getStoredSettings();
  const updated = { ...current, ...settings };
  saveSettings(updated);
  return updated;
}

// Hook to fetch settings
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: Infinity, // Settings don't change often
  });
}

// Hook to update settings
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
    },
  });
}

// Predefined color options for in-office days
export const IN_OFFICE_COLOR_OPTIONS = [
  { name: "Purple", color: "#9333ea", textColor: "#ffffff" },
  { name: "Blue", color: "#2563eb", textColor: "#ffffff" },
  { name: "Green", color: "#16a34a", textColor: "#ffffff" },
  { name: "Orange", color: "#ea580c", textColor: "#ffffff" },
  { name: "Pink", color: "#db2777", textColor: "#ffffff" },
  { name: "Teal", color: "#0d9488", textColor: "#ffffff" },
  { name: "Red", color: "#dc2626", textColor: "#ffffff" },
  { name: "Yellow", color: "#ca8a04", textColor: "#000000" },
];
