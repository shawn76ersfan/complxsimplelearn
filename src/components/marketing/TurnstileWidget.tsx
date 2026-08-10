"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = "cloudflare-turnstile-script";
const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({
  siteKey,
  setToken,
}: {
  siteKey: string;
  setToken: Dispatch<SetStateAction<string>>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    function renderWidget() {
      if (
        !window.turnstile ||
        !containerRef.current ||
        widgetIdRef.current
      ) {
        return;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: "info_session_registration",
        theme: "auto",
        callback: (token) => setToken(token),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      });
    }

    const existingScript = document.getElementById(SCRIPT_ID);
    if (window.turnstile) {
      renderWidget();
    } else if (existingScript) {
      existingScript.addEventListener("load", renderWidget);
    } else {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderWidget);
      document.head.appendChild(script);
    }

    return () => {
      existingScript?.removeEventListener("load", renderWidget);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [setToken, siteKey]);

  return <div ref={containerRef} className="min-h-[65px]" />;
}
