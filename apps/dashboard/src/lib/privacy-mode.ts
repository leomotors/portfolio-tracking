"use client";

import { useSyncExternalStore } from "react";

/**
 * Cross-cutting privacy mode for the dashboard. Theme already uses a
 * document-attribute + localStorage store; this follows the same pattern so
 * every client surface can mask balances without prop drilling.
 */

export type PrivacyMode = "visible" | "hidden";

export const PRIVACY_MASK = "••••••";

const STORAGE_KEY = "privacy";
const PRIVACY_EVENT = "pt:privacy-change";

export function readPrivacyMode(): PrivacyMode {
  if (typeof document === "undefined") return "visible";
  return document.documentElement.getAttribute("data-privacy") === "hidden"
    ? "hidden"
    : "visible";
}

function subscribePrivacy(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PRIVACY_EVENT, cb);
  return () => window.removeEventListener(PRIVACY_EVENT, cb);
}

export function setPrivacyMode(next: PrivacyMode) {
  document.documentElement.setAttribute("data-privacy", next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore (private mode etc.)
  }
  window.dispatchEvent(new Event(PRIVACY_EVENT));
}

export function togglePrivacyMode() {
  setPrivacyMode(readPrivacyMode() === "hidden" ? "visible" : "hidden");
}

/** True when balances and absolute values should be masked. */
export function usePrivacyHidden() {
  const mode = useSyncExternalStore(
    subscribePrivacy,
    readPrivacyMode,
    () => "visible" as const,
  );
  return mode === "hidden";
}
