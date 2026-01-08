"use client";

import { useState, useCallback } from "react";
import { GeolocationData } from "@/types/time-clock";

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface UseGeolocationReturn {
  location: GeolocationData | null;
  isLoading: boolean;
  error: string | null;
  permissionState: "granted" | "denied" | "prompt" | null;
  getLocation: () => Promise<GeolocationData | null>;
  checkPermission: () => Promise<void>;
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
  } = options;

  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt" | null>(null);

  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) {
      setPermissionState("prompt");
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      setPermissionState(result.state);

      // Listen for permission changes
      result.addEventListener("change", () => {
        setPermissionState(result.state);
      });
    } catch {
      setPermissionState("prompt");
    }
  }, []);

  const getLocation = useCallback(async (): Promise<GeolocationData | null> => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const data: GeolocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(data);
          setPermissionState("granted");
          setIsLoading(false);
          resolve(data);
        },
        (err) => {
          let message = "Failed to get location";

          switch (err.code) {
            case err.PERMISSION_DENIED:
              message = "Location permission denied";
              setPermissionState("denied");
              break;
            case err.POSITION_UNAVAILABLE:
              message = "Location information unavailable";
              break;
            case err.TIMEOUT:
              message = "Location request timed out";
              break;
          }

          setError(message);
          setIsLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge]);

  return {
    location,
    isLoading,
    error,
    permissionState,
    getLocation,
    checkPermission,
  };
}
