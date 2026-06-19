"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type OrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

export type CompassDebug = {
  alpha: number | null;
  webkitCompassHeading: number | null;
  absolute: boolean | null;
  eventType: string | null;
  eventCount: number;
};

/**
 * Laitteen kompassisuunta (asteina pohjoisesta myötäpäivään).
 *
 * Androidilla luotettava data tulee `deviceorientationabsolute`-eventistä
 * (alpha sidottu pohjoiseen). Tavallinen `deviceorientation` antaa usein
 * alpha: null, joten siihen siirrytään vain fallbackina jos absolute ei
 * tuota dataa. iOS käyttää webkitCompassHeadingia (requestPermission).
 */
export function useCompassHeading() {
  const [heading, setHeading] = useState(0);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [debug, setDebug] = useState<CompassDebug>({
    alpha: null,
    webkitCompassHeading: null,
    absolute: null,
    eventType: null,
    eventCount: 0,
  });

  const gotData = useRef(false);
  const eventCounter = useRef(0);

  const handle = useCallback((e: Event) => {
    const ev = e as OrientationEvent;

    setDebug({
      alpha: ev.alpha ?? null,
      webkitCompassHeading:
        typeof ev.webkitCompassHeading === "number"
          ? ev.webkitCompassHeading
          : null,
      absolute: ev.absolute ?? null,
      eventType: ev.type,
      eventCount: ++eventCounter.current,
    });

    if (typeof ev.webkitCompassHeading === "number") {
      // iOS: suunta suoraan pohjoisesta myötäpäivään.
      gotData.current = true;
      setUnavailable(false);
      setHeading(ev.webkitCompassHeading);
    } else if (ev.alpha != null) {
      // Android (absolute): alpha 0° = pohjoinen, vastapäivään → 360 - alpha.
      gotData.current = true;
      setUnavailable(false);
      setHeading((360 - ev.alpha) % 360);
    }
  }, []);

  const startListening = useCallback(() => {
    gotData.current = false;
    // 1) Kuuntele ensisijaisesti absoluuttista orientaatiota.
    window.addEventListener("deviceorientationabsolute", handle);

    // 2) Fallback tavalliseen deviceorientation-eventtiin jos absolute ei
    //    tuota dataa ~1,2 s kuluessa.
    const fallbackTimer = window.setTimeout(() => {
      if (!gotData.current) {
        window.addEventListener("deviceorientation", handle);
      }
    }, 1200);

    // 3) Jos kumpikaan ei anna dataa ~4 s kuluessa → ei saatavilla.
    const unavailableTimer = window.setTimeout(() => {
      if (!gotData.current) setUnavailable(true);
    }, 4000);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(unavailableTimer);
      window.removeEventListener("deviceorientationabsolute", handle);
      window.removeEventListener("deviceorientation", handle);
    };
  }, [handle]);

  useEffect(() => {
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (DOE && typeof DOE.requestPermission === "function") {
      setNeedsPermission(true); // iOS — odotetaan käyttäjäelettä.
      return;
    }
    const cleanup = startListening();
    return cleanup;
  }, [startListening]);

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

  return { heading, needsPermission, requestPermission, unavailable, debug };
}
