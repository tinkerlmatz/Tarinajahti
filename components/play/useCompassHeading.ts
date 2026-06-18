"use client";

import { useCallback, useEffect, useState } from "react";

type OrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

/**
 * Laitteen kompassisuunta (asteina pohjoisesta myötäpäivään).
 * iOS vaatii DeviceOrientationEvent.requestPermission()-kutsun käyttäjäeleestä;
 * Android toimii suoraan.
 */
export function useCompassHeading() {
  const [heading, setHeading] = useState(0);
  const [needsPermission, setNeedsPermission] = useState(false);

  const handle = useCallback((e: Event) => {
    const ev = e as OrientationEvent;
    if (typeof ev.webkitCompassHeading === "number") {
      // iOS: heading suoraan pohjoisesta.
      setHeading(ev.webkitCompassHeading);
    } else if (ev.alpha != null) {
      // Android: absoluuttinen alpha → heading = 360 - alpha.
      setHeading(ev.absolute ? (360 - ev.alpha) % 360 : ev.alpha);
    }
  }, []);

  const startListening = useCallback(() => {
    window.addEventListener("deviceorientationabsolute", handle);
    window.addEventListener("deviceorientation", handle);
  }, [handle]);

  useEffect(() => {
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (DOE && typeof DOE.requestPermission === "function") {
      setNeedsPermission(true); // iOS — odotetaan käyttäjäelettä.
    } else {
      startListening();
    }
    return () => {
      window.removeEventListener("deviceorientationabsolute", handle);
      window.removeEventListener("deviceorientation", handle);
    };
  }, [handle, startListening]);

  const requestPermission = useCallback(async () => {
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (!DOE?.requestPermission) return;
    try {
      const res = await DOE.requestPermission();
      if (res === "granted") {
        setNeedsPermission(false);
        startListening();
      }
    } catch {
      // ohitetaan
    }
  }, [startListening]);

  return { heading, needsPermission, requestPermission };
}
