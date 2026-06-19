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
export type CompassDebug = {
  alpha: number | null;
  webkitCompassHeading: number | null;
  absolute: boolean | null;
  eventType: string | null;
  eventCount: number;
};

export function useCompassHeading() {
  const [heading, setHeading] = useState(0);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [debug, setDebug] = useState<CompassDebug>({
    alpha: null,
    webkitCompassHeading: null,
    absolute: null,
    eventType: null,
    eventCount: 0,
  });

  const handle = useCallback((e: Event) => {
    const ev = e as OrientationEvent;

    setDebug((d) => ({
      alpha: ev.alpha ?? null,
      webkitCompassHeading:
        typeof ev.webkitCompassHeading === "number"
          ? ev.webkitCompassHeading
          : null,
      absolute: ev.absolute ?? null,
      eventType: ev.type,
      eventCount: d.eventCount + 1,
    }));

    if (typeof ev.webkitCompassHeading === "number") {
      // iOS: webkitCompassHeading on jo suunta pohjoisesta myötäpäivään.
      setHeading(ev.webkitCompassHeading);
    } else if (ev.alpha != null) {
      // Android: alpha on suunta VASTApäivään pohjoisesta → heading = 360 - alpha.
      setHeading((360 - ev.alpha) % 360);
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

  return { heading, needsPermission, requestPermission, debug };
}
