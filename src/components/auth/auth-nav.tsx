"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type AuthNavState = {
  status: "loading" | "signed-out" | "signed-in" | "not-configured";
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export function AuthNav() {
  const [state, setState] = useState<AuthNavState>({
    status: isSupabaseConfigured() ? "loading" : "not-configured",
    email: null,
    displayName: null,
    avatarUrl: null,
  });

  useEffect(() => {
    const client = createBrowserSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      return;
    }

    const supabase = client;
    let isMounted = true;

    async function refresh(sessionUserId?: string, sessionEmail?: string | null) {
      if (!sessionUserId) {
        setState({
          status: "signed-out",
          email: null,
          displayName: null,
          avatarUrl: null,
        });
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", sessionUserId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      setState({
        status: "signed-in",
        email: sessionEmail ?? null,
        displayName: data?.display_name ?? null,
        avatarUrl: data?.avatar_url ?? null,
      });
    }

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      refresh(user?.id, user?.email ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user;
        refresh(user?.id, user?.email ?? null);
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (state.status === "loading") {
    return (
      <Link className="auth-nav-link muted" href="/login/">
        登录
      </Link>
    );
  }

  if (state.status !== "signed-in") {
    return (
      <Link className="auth-nav-link" href="/login/">
        登录
      </Link>
    );
  }

  const label = state.displayName || state.email || "个人中心";
  const initial = label.trim().slice(0, 1).toUpperCase() || "我";

  return (
    <Link aria-label="个人中心" className="avatar-link" href="/profile/">
      {state.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" src={state.avatarUrl} />
      ) : (
        <span>{initial}</span>
      )}
      <UserRound aria-hidden="true" size={15} />
    </Link>
  );
}
