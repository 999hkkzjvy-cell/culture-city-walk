"use client";

import Link from "next/link";
import { ImageUp, LogOut, Save, UserRound } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import {
  createProfileRepository,
  type UserProfileInput,
} from "@/lib/repositories/profile-repository";
import { mapCloudError } from "@/lib/repositories/cloud-error-messages";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type ProfileState = "loading" | "signed-out" | "ready" | "not-configured";

const emptyProfile: UserProfileInput = {
  displayName: "",
  avatarUrl: "",
  location: "",
  wechatId: "",
  bio: "",
};

export function ProfileCenter() {
  const [state, setState] = useState<ProfileState>(() =>
    isSupabaseConfigured() ? "loading" : "not-configured",
  );
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfileInput>(emptyProfile);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    const client = createBrowserSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      return;
    }

    const supabase = client;
    let isMounted = true;

    async function loadProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session?.user) {
        setState("signed-out");
        return;
      }

      try {
        const repository = createProfileRepository(supabase);
        const loaded = await repository.readCurrent();

        if (!isMounted) {
          return;
        }

        setEmail(loaded.email);
        setProfile({
          displayName: loaded.displayName,
          avatarUrl: loaded.avatarUrl,
          location: loaded.location,
          wechatId: loaded.wechatId,
          bio: loaded.bio,
        });
        setState("ready");
      } catch {
        setMessage("个人资料读取失败，请稍后重试。");
        setState("ready");
      }
    }

    loadProfile();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setState("signed-out");
        }
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  function updateField<Key extends keyof UserProfileInput>(
    key: Key,
    value: UserProfileInput[Key],
  ) {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    try {
      const repository = createProfileRepository();
      const saved = await repository.updateCurrent(profile);
      setProfile({
        displayName: saved.displayName,
        avatarUrl: saved.avatarUrl,
        location: saved.location,
        wechatId: saved.wechatId,
        bio: saved.bio,
      });
      setMessage("个人资料已保存。");
    } catch {
      setMessage("保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  async function signOut() {
    const client = createBrowserSupabaseClient();
    await client?.auth.signOut();
    setState("signed-out");
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");
    setIsUploadingAvatar(true);

    try {
      const repository = createProfileRepository();
      const avatarUrl = await repository.uploadAvatar(file);
      const optimisticProfile = {
        ...profile,
        avatarUrl,
      };

      setProfile(optimisticProfile);

      try {
        const saved = await repository.updateCurrent(optimisticProfile);
        setProfile({
          displayName: saved.displayName,
          avatarUrl: saved.avatarUrl,
          location: saved.location,
          wechatId: saved.wechatId,
          bio: saved.bio,
        });
        setMessage("头像已上传并保存。");
      } catch (profileError) {
        setMessage(
          `头像已上传，但资料保存失败。头像地址已填入表单，可稍后点击“保存资料”重试。${mapCloudError(
            profileError,
            "avatar_upload",
          )}`,
        );
      }
    } catch (error) {
      const reason =
        error instanceof Error && error.message === "avatar_too_large"
          ? "图片不能超过 2MB。"
          : error instanceof Error && error.message === "avatar_invalid_type"
            ? "请上传 JPG、PNG 或 WebP 图片。"
            : mapCloudError(error, "avatar_upload");
      setMessage(reason);
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  }

  if (state === "loading") {
    return <p className="auth-note">正在读取个人中心...</p>;
  }

  if (state === "not-configured") {
    return (
      <section className="auth-panel">
        <h2>个人中心待连接</h2>
        <p>配置 Supabase 后即可登录并编辑个人资料。</p>
      </section>
    );
  }

  if (state === "signed-out") {
    return (
      <section className="auth-panel">
        <h2>请先登录</h2>
        <p>登录后可以编辑头像、所在地、微信号和个人签名。</p>
        <Link className="primary-inline-link" href="/login/">
          去登录
        </Link>
      </section>
    );
  }

  const initial = (profile.displayName || email || "我").slice(0, 1).toUpperCase();

  return (
    <section className="profile-shell">
      <aside className="profile-card">
        <div className="profile-avatar-preview">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={profile.avatarUrl} />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <h2>{profile.displayName || "未命名用户"}</h2>
        <p>{email}</p>
        <button className="secondary-button" onClick={signOut} type="button">
          <LogOut size={17} />
          退出登录
        </button>
      </aside>

      <form className="profile-form" onSubmit={saveProfile}>
        <div className="profile-form-heading">
          <div>
            <p>个人资料</p>
            <h2>编辑基本信息</h2>
          </div>
          <UserRound aria-hidden="true" size={22} />
        </div>

        <label>
          昵称
          <input
            onChange={(event) => updateField("displayName", event.target.value)}
            placeholder="显示在个人中心的名字"
            value={profile.displayName}
          />
        </label>
        <label>
          所在地
          <input
            onChange={(event) => updateField("location", event.target.value)}
            placeholder="例如：上海 / 南京 / 广州"
            value={profile.location}
          />
        </label>
        <label>
          微信号
          <input
            onChange={(event) => updateField("wechatId", event.target.value)}
            placeholder="仅保存在你的个人资料中"
            value={profile.wechatId}
          />
        </label>
        <label>
          头像
          <span className="profile-upload-row">
            <input
              accept="image/jpeg,image/png,image/webp"
              aria-label="上传头像图片"
              disabled={isUploadingAvatar}
              onChange={uploadAvatar}
              type="file"
            />
            <span>
              <ImageUp size={16} />
              {isUploadingAvatar ? "上传中..." : "上传图片"}
            </span>
          </span>
        </label>
        <label>
          头像图片 URL
          <input
            onChange={(event) => updateField("avatarUrl", event.target.value)}
            placeholder="可手动粘贴图片地址，或使用上方上传"
            type="url"
            value={profile.avatarUrl}
          />
        </label>
        <label>
          个人签名
          <textarea
            onChange={(event) => updateField("bio", event.target.value)}
            placeholder="写一句你认识城市的方式"
            rows={4}
            value={profile.bio}
          />
        </label>
        <button className="primary-action compact" disabled={isSaving} type="submit">
          <Save size={17} />
          {isSaving ? "保存中..." : "保存资料"}
        </button>
        {message ? <p className="auth-message">{message}</p> : null}
      </form>
    </section>
  );
}
