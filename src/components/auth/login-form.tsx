"use client";

import Link from "next/link";
import { LogIn, Mail, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import {
  buildAuthRedirectUrl,
  completeAuthRedirect,
  readAuthRedirectTarget,
} from "@/lib/auth-redirect";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type AuthMode = "login" | "register";

export function LoginForm({
  redirectTo = "/profile/",
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const [resolvedRedirectTo] = useState(() =>
    typeof window === "undefined"
      ? redirectTo
      : readAuthRedirectTarget(redirectTo),
  );
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const client = createBrowserSupabaseClient();

    if (!client) {
      return;
    }

    completeAuthRedirect(client, redirectTo).then((result) => {
      if (result.handled) {
        if (result.ok) {
          router.replace(result.redirectTo);
          return;
        }

        setMessage(result.message);
        return;
      }

      client.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          router.replace(resolvedRedirectTo);
        }
      });
    });
  }, [redirectTo, resolvedRedirectTo, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const client = createBrowserSupabaseClient();

    if (!client) {
      setMessage("Supabase 尚未配置，暂时不能登录。");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage("登录失败，请检查邮箱和密码。");
          return;
        }

        router.push(resolvedRedirectTo);
        return;
      }

      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim() || email.split("@")[0],
          },
          emailRedirectTo: buildAuthRedirectUrl(resolvedRedirectTo),
        },
      });

      if (error) {
        setMessage("注册失败，请检查邮箱、密码或稍后重试。");
        return;
      }

      if (data.user) {
        await client.from("profiles").upsert({
          id: data.user.id,
          display_name: displayName.trim() || email.split("@")[0],
        });
      }

      if (data.session) {
        router.push(resolvedRedirectTo);
        return;
      }

      setMessage("注册邮件已发送，请从邮件链接回到登录页完成确认。");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!configured) {
    return (
      <section className="auth-panel login-card">
        <h2>登录功能待连接</h2>
        <p>配置 Supabase 环境变量后，就可以使用登录、注册和个人中心。</p>
      </section>
    );
  }

  return (
    <section className="auth-panel login-card">
      <div className="auth-mode-tabs" aria-label="账号操作">
        <button
          className={mode === "login" ? "selected" : ""}
          onClick={() => setMode("login")}
          type="button"
        >
          登录
        </button>
        <button
          className={mode === "register" ? "selected" : ""}
          onClick={() => setMode("register")}
          type="button"
        >
          注册
        </button>
      </div>

      <h2>{mode === "login" ? "登录账号" : "注册账号"}</h2>
      <p>
        {mode === "login"
          ? "登录后可以同步路线、管理个人资料和继续编辑你的城市漫游。"
          : "创建账号后，可以保存个人中心资料并跨设备管理路线。"}
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <label>
            <UserPlus size={16} />
            昵称
            <input
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="例如：林间散步者"
              value={displayName}
            />
          </label>
        ) : null}
        <label>
          <Mail size={16} />
          邮箱
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          <LogIn size={16} />
          密码
          <input
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 6 位"
            required
            type="password"
            value={password}
          />
        </label>
        <button disabled={isSubmitting} type="submit">
          {mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />}
          {isSubmitting ? "处理中..." : mode === "login" ? "登录" : "注册"}
        </button>
      </form>

      <button
        className="auth-switch-button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        type="button"
      >
        {mode === "login" ? "还没有账号？去注册" : "已有账号？去登录"}
      </button>
      {message ? <p className="auth-message">{message}</p> : null}
      <Link className="auth-back-home" href="/">
        返回首页
      </Link>
    </section>
  );
}
