import {
  createBrowserSupabaseClient,
  type AppSupabaseClient,
} from "@/lib/supabase/client";

export type UserProfile = {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string;
  location: string;
  wechatId: string;
  bio: string;
};

export type UserProfileInput = Omit<UserProfile, "id" | "email">;

const profileAvatarBucket = "profile-avatars";
const maxAvatarBytes = 2 * 1024 * 1024;
const allowedAvatarMimeTypes = ["image/jpeg", "image/png", "image/webp"];

export function createProfileRepository(client = createBrowserSupabaseClient()) {
  if (!client) {
    throw new Error("supabase_not_configured");
  }

  return new ProfileRepository(client);
}

export class ProfileRepository {
  constructor(private readonly client: AppSupabaseClient) {}

  async readCurrent() {
    const user = await this.requireUser();
    await this.ensureProfile(user.id, user.email ?? null);

    const { data, error } = await this.client
      .from("profiles")
      .select("id, display_name, avatar_url, location, wechat_id, bio")
      .eq("id", user.id)
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      email: user.email ?? null,
      displayName: data.display_name ?? "",
      avatarUrl: data.avatar_url ?? "",
      location: data.location ?? "",
      wechatId: data.wechat_id ?? "",
      bio: data.bio ?? "",
    } satisfies UserProfile;
  }

  async updateCurrent(input: UserProfileInput) {
    const user = await this.requireUser();
    const payload = {
      id: user.id,
      display_name: normalize(input.displayName),
      avatar_url: normalize(input.avatarUrl),
      location: normalize(input.location),
      wechat_id: normalize(input.wechatId),
      bio: normalize(input.bio),
    };

    const { data, error } = await this.client
      .from("profiles")
      .upsert(payload)
      .select("id, display_name, avatar_url, location, wechat_id, bio")
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      email: user.email ?? null,
      displayName: data.display_name ?? "",
      avatarUrl: data.avatar_url ?? "",
      location: data.location ?? "",
      wechatId: data.wechat_id ?? "",
      bio: data.bio ?? "",
    } satisfies UserProfile;
  }

  async uploadAvatar(file: File) {
    if (!allowedAvatarMimeTypes.includes(file.type)) {
      throw new Error("avatar_invalid_type");
    }

    if (file.size > maxAvatarBytes) {
      throw new Error("avatar_too_large");
    }

    const user = await this.requireUser();
    const extension = extensionForMime(file.type);
    const storagePath = `${user.id}/avatar-${Date.now()}.${extension}`;
    const bucket = this.client.storage.from(profileAvatarBucket);
    const { error: uploadError } = await bucket.upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) {
      const message = uploadError.message.toLowerCase();

      if (message.includes("already exists")) {
        const { error: updateError } = await bucket.update(storagePath, file, {
          contentType: file.type,
          upsert: true,
        });

        if (updateError) {
          throw updateError;
        }
      } else {
        throw uploadError;
      }
    }

    const { data } = bucket.getPublicUrl(storagePath);

    if (!data.publicUrl) {
      throw new Error("avatar_public_url_failed");
    }

    return `${data.publicUrl}?v=${Date.now()}`;
  }

  private async ensureProfile(userId: string, email: string | null) {
    const { data: existing, error: readError } = await this.client
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (readError) {
      throw readError;
    }

    if (existing) {
      return;
    }

    const { error } = await this.client.from("profiles").insert({
      id: userId,
      display_name: email ? email.split("@")[0] : null,
    });

    if (error) {
      throw error;
    }
  }

  private async requireUser() {
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      throw new Error("auth_required");
    }

    return user;
  }
}

function normalize(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extensionForMime(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpeg":
    default:
      return "jpg";
  }
}
