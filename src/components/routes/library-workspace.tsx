"use client";

import { Bookmark, FileText, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RouteLibrary } from "@/components/routes/route-library";
import type { Theme } from "@/lib/route";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

const libraryTabs = [
  { id: "plans", label: "我的规划", icon: FileText },
  { id: "favorites", label: "我的收藏", icon: Bookmark },
] as const;

const themeFilters: Theme[] = ["历史", "文学", "建筑", "音乐", "书店", "美食"];

type LibraryTab = (typeof libraryTabs)[number]["id"];
type AuthState = "loading" | "signed-out" | "signed-in" | "not-configured";

export function LibraryWorkspace() {
  const [authState, setAuthState] = useState<AuthState>(() =>
    isSupabaseConfigured() ? "loading" : "not-configured",
  );
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LibraryTab>("plans");
  const [selectedThemes, setSelectedThemes] = useState<Theme[]>([]);

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
    });

    const { data: subscription } = client.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user;
        setUserEmail(user?.email ?? null);
        setAuthState(user ? "signed-in" : "signed-out");
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const client = createBrowserSupabaseClient();
    await client?.auth.signOut();
  }

  function toggleTheme(theme: Theme) {
    setSelectedThemes((current) =>
      current.includes(theme)
        ? current.filter((item) => item !== theme)
        : [...current, theme],
    );
  }

  if (authState === "loading") {
    return (
      <section className="account-layout single narrow">
        <p className="auth-note">正在检查登录状态...</p>
      </section>
    );
  }

  if (authState !== "signed-in") {
    return (
      <section className="account-layout single narrow">
        <LoginForm redirectTo="/library/" />
      </section>
    );
  }

  return (
    <section className="library-workspace">
      <aside className="library-sidebar" aria-label="路线库导航">
        <div>
          <p>路线库</p>
          <strong>{userEmail ?? "已登录"}</strong>
        </div>
        <nav>
          {libraryTabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                className={activeTab === tab.id ? "selected" : ""}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <button className="secondary-button" onClick={signOut} type="button">
          <LogOut size={17} />
          退出登录
        </button>
      </aside>

      <div className="library-content">
        <section className="library-filter-bar" aria-label="主题筛选">
          <div>
            <p>主题筛选</p>
            <span>可多选</span>
          </div>
          <div className="filter-chip-row">
            {themeFilters.map((theme) => (
              <button
                className={selectedThemes.includes(theme) ? "selected" : ""}
                key={theme}
                onClick={() => toggleTheme(theme)}
                type="button"
              >
                {theme}
              </button>
            ))}
          </div>
        </section>
        <RouteLibrary selectedThemes={selectedThemes} view={activeTab} />
      </div>
    </section>
  );
}
