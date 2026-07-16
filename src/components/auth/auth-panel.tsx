"use client";

import { LogIn, LogOut, Mail } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { buildAuthRedirectUrl } from "@/lib/auth-redirect";
import { saveLocalRouteToCloud } from "@/lib/repositories/route-cloud-sync";
import { hasSyncedRoutePlan } from "@/lib/storage";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type AuthState = "loading" | "signed-out" | "signed-in" | "not-configured";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [authState, setAuthState] = useState<AuthState>(() =>
    isSupabaseConfigured() ? "loading" : "not-configured",
  );
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasPendingLocalPreview, setHasPendingLocalPreview] = useState(false);

  useEffect(() => {
    const client = createBrowserSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      return;
    }

    let isMounted = true;

    client.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }
      const user = data.session?.user;
      setUserEmail(user?.email ?? null);
      setAuthState(user ? "signed-in" : "signed-out");
      setHasPendingLocalPreview(Boolean(user) && !hasSyncedRoutePlan());
    });

    const { data: subscription } = client.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user;
        setUserEmail(user?.email ?? null);
        setAuthState(user ? "signed-in" : "signed-out");
        setHasPendingLocalPreview(Boolean(user) && !hasSyncedRoutePlan());
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const client = createBrowserSupabaseClient();

    if (!client) {
      setAuthState("not-configured");
      return;
    }

    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildAuthRedirectUrl("/library/"),
      },
    });

    setMessage(
      error ? "登录邮件发送失败，请稍后重试。" : "登录链接已发送，请检查邮箱。",
    );
  }

  async function signOut() {
    const client = createBrowserSupabaseClient();
    await client?.auth.signOut();
  }

  async function syncLocalPreview() {
    setMessage("");

    try {
      const { saved } = await saveLocalRouteToCloud();
      setHasPendingLocalPreview(false);
      setMessage(`已同步：${saved.title}`);
    } catch {
      setMessage("同步失败，请稍后重试。");
    }
  }

  if (authState === "loading") {
    return <p className="auth-note">正在检查登录状态...</p>;
  }

  if (authState === "not-configured") {
    return (
      <section className="auth-panel">
        <h2>云端保存待连接</h2>
        <p>
          配置 Supabase 环境变量后，就可以使用邮箱登录、跨设备保存和分享路线。
        </p>
      </section>
    );
  }

  if (authState === "signed-in") {
    return (
      <section className="auth-panel">
        <h2>已登录</h2>
        <p>{userEmail}</p>
        {hasPendingLocalPreview ? (
          <div className="auth-sync-prompt">
            <strong>发现本地预案</strong>
            <span>同步后可以在“我的路线”中跨设备查看。</span>
          </div>
        ) : null}
        <div className="auth-action-row">
          <button
            className="secondary-button"
            onClick={syncLocalPreview}
            type="button"
          >
            <LogIn size={17} />
            同步本地预案
          </button>
          <button className="secondary-button" onClick={signOut} type="button">
            <LogOut size={17} />
            退出登录
          </button>
        </div>
        {message ? <p className="auth-message">{message}</p> : null}
      </section>
    );
  }

  return (
    <section className="auth-panel">
      <h2>登录后保存到云端</h2>
      <p>未登录时仍会保留本地草稿；登录后可以迁移草稿、生成分享链接。</p>
      <form className="auth-form" onSubmit={sendMagicLink}>
        <label htmlFor="auth-email">
          <Mail size={16} />
          邮箱
        </label>
        <div>
          <input
            id="auth-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
          <button type="submit">
            <LogIn size={17} />
            发送登录链接
          </button>
        </div>
      </form>
      {message ? <p className="auth-message">{message}</p> : null}
    </section>
  );
}
