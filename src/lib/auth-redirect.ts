"use client";

import type { AppSupabaseClient } from "@/lib/supabase/client";
import { basePath } from "@/lib/site";

export type AuthRedirectResult =
  | { handled: false }
  | { handled: true; ok: true; redirectTo: string }
  | { handled: true; ok: false; message: string };

export function buildAuthRedirectUrl(redirectTo: string) {
  const target = safeRedirectPath(redirectTo);
  const params = new URLSearchParams({ redirect: target });
  return `${window.location.origin}${basePath}/login/?${params.toString()}`;
}

export function readAuthRedirectTarget(fallback = "/profile/") {
  return safeRedirectPath(
    new URLSearchParams(window.location.search).get("redirect"),
    fallback,
  );
}

export async function completeAuthRedirect(
  client: AppSupabaseClient,
  fallbackRedirectTo = "/profile/",
): Promise<AuthRedirectResult> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const redirectTo = readAuthRedirectTarget(fallbackRedirectTo);

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    removeAuthParamsFromUrl(redirectTo);

    return error
      ? {
          handled: true,
          ok: false,
          message: "登录链接已失效或无法完成验证，请重新登录。",
        }
      : { handled: true, ok: true, redirectTo };
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return { handled: false };
  }

  const { error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  removeAuthParamsFromUrl(redirectTo);

  return error
    ? {
        handled: true,
        ok: false,
        message: "登录链接已失效或无法完成验证，请重新登录。",
      }
    : { handled: true, ok: true, redirectTo };
}

function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/profile/",
) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function removeAuthParamsFromUrl(redirectTo: string) {
  const cleanUrl = `${window.location.origin}${basePath}/login/?${new URLSearchParams({
    redirect: redirectTo,
  }).toString()}`;
  window.history.replaceState(null, "", cleanUrl);
}
