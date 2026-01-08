"use client";

import { GeolocationData } from "@/types/time-clock";

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

const defaultOptions: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000, // 10 seconds
  maximumAge: 0, // Don't use cached position
};

/**
 * Get current geolocation coordinates
 */
export async function getCurrentLocation(
  options: GeolocationOptions = {}
): Promise<GeolocationData | null> {
  if (!navigator.geolocation) {
    console.warn("Geolocation is not supported by this browser");
    return null;
  }

  const mergedOptions = { ...defaultOptions, ...options };

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
        resolve(null);
      },
      mergedOptions
    );
  });
}

/**
 * Check if geolocation permission is granted
 */
export async function checkGeolocationPermission(): Promise<
  "granted" | "denied" | "prompt"
> {
  if (!navigator.permissions) {
    // Fallback for browsers that don't support Permissions API
    return "prompt";
  }

  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    return result.state;
  } catch {
    return "prompt";
  }
}

/**
 * Request geolocation permission by triggering a location request
 */
export async function requestGeolocationPermission(): Promise<boolean> {
  const location = await getCurrentLocation({ timeout: 5000 });
  return location !== null;
}

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
}

/**
 * Generate a Google Maps link for coordinates
 */
export function getGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
