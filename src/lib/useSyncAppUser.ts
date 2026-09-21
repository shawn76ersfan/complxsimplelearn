"use client";

import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback, useEffect, useState } from "react";

export type UserSyncState = "idle" | "syncing" | "ok" | "not_enrolled" | "error";

/**
 * Wait until Convex has the Clerk JWT, then upsert the users row.
 *
 * Clerk's `useUser()` can be ready a tick before Convex `setAuth` finishes.
 * Calling `users.store` in that gap throws "Not authenticated", and
 * `getMyProfile` can return null/undefined until the websocket re-auths —
 * which is why sign-in sometimes sat on the spinner until a refresh.
 */
export function useSyncAppUser() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const { isLoading: convexAuthLoading, isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const ensureSeeded = useMutation(api.init.ensureSeeded);
  const profile = useQuery(api.users.getMyProfile, isAuthenticated ? {} : "skip");
  const [syncState, setSyncState] = useState<UserSyncState>("idle");
  const [attempt, setAttempt] = useState(0);
  const [profileWaitTimedOut, setProfileWaitTimedOut] = useState(false);

  const retry = useCallback(() => {
    if (!isAuthenticated) {
      window.location.reload();
      return;
    }
    setSyncState("idle");
    setProfileWaitTimedOut(false);
    setAttempt((n) => n + 1);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!clerkLoaded || !user) {
      setSyncState("idle");
      return;
    }
    if (convexAuthLoading || !isAuthenticated) {
      return;
    }

    let cancelled = false;
    setSyncState("syncing");
    storeUser({
      name: user.fullName ?? user.firstName ?? "Student",
      imageUrl: user.imageUrl,
    })
      .then(() => {
        if (!cancelled) setSyncState("ok");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("NOT_ENROLLED")) {
          setSyncState("not_enrolled");
        } else {
          setSyncState("error");
          console.error("Failed to sync user profile:", err);
        }
      });
    void ensureSeeded().catch(() => {
      // Seed is best-effort; the next authenticated load will retry.
    });

    return () => {
      cancelled = true;
    };
    // user object identity changes often; the Clerk id is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkLoaded, user?.id, convexAuthLoading, isAuthenticated, attempt]);

  useEffect(() => {
    const waiting = isAuthenticated && syncState === "ok" && !profile;
    if (!waiting) {
      setProfileWaitTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setProfileWaitTimedOut(true), 5000);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, syncState, profile]);

  const handshakeFailed =
    clerkLoaded && Boolean(user) && !convexAuthLoading && !isAuthenticated;
  const waitingForProfile =
    isAuthenticated &&
    syncState === "ok" &&
    (profile === undefined || profile === null) &&
    !profileWaitTimedOut;

  const isBootstrapping =
    !clerkLoaded ||
    !user ||
    Boolean(user && convexAuthLoading) ||
    (Boolean(user) && isAuthenticated && (syncState === "idle" || syncState === "syncing")) ||
    waitingForProfile;

  return {
    user,
    profile,
    clerkLoaded,
    isAuthenticated,
    syncState: handshakeFailed || profileWaitTimedOut ? "error" : syncState,
    isBootstrapping: handshakeFailed || profileWaitTimedOut ? false : isBootstrapping,
    retry,
  };
}
