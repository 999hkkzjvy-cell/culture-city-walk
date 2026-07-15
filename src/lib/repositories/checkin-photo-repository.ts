"use client";

import {
  readCheckInPhotos,
  removeCheckInPhoto,
  saveCheckInPhoto,
  type StoredCheckInPhoto,
} from "@/lib/storage";
import {
  createBrowserSupabaseClient,
  type AppSupabaseClient,
} from "@/lib/supabase/client";
import { mapCloudError } from "@/lib/repositories/cloud-error-messages";

const routeMediaBucket = "route-media";

export type ArchiveCheckInPhotoResult = {
  photo: StoredCheckInPhoto;
  synced: boolean;
  message: string;
};

export async function archiveCheckInPhoto(
  photo: StoredCheckInPhoto,
): Promise<ArchiveCheckInPhotoResult> {
  saveCheckInPhoto({
    ...photo,
    syncStatus: "local",
  });

  const client = createBrowserSupabaseClient();

  if (!client || !isCloudRouteId(photo.routeId)) {
    return {
      photo: { ...photo, syncStatus: "local" },
      synced: false,
      message: "打卡图已存入本地；路线保存到云端后可同步到云端相册。",
    };
  }

  const userId = await getUserId(client);

  if (!userId) {
    return {
      photo: { ...photo, syncStatus: "local" },
      synced: false,
      message: "打卡图已存入本地；登录后可同步到云端相册。",
    };
  }

  try {
    const blob = dataUrlToBlob(photo.dataUrl);
    const extension = extensionForMime(photo.mimeType);
    const storagePath = `${userId}/${photo.routeId}/${photo.stopId}/${photo.id}.${extension}`;
    const { error: uploadError } = await client.storage
      .from(routeMediaBucket)
      .upload(storagePath, blob, {
        contentType: photo.mimeType,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { error: insertError } = await client
      .from("route_checkin_photos")
      .upsert({
        id: photo.id,
        route_id: photo.routeId,
        stop_id: photo.stopId,
        storage_path: storagePath,
        file_name: photo.fileName,
        mime_type: photo.mimeType,
        byte_size: blob.size,
        created_by: userId,
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    const signedUrl = await createSignedUrl(client, storagePath);
    const syncedPhoto: StoredCheckInPhoto = {
      ...photo,
      dataUrl: signedUrl ?? photo.dataUrl,
      storagePath,
      syncStatus: "cloud",
    };

    saveCheckInPhoto(syncedPhoto);

    return {
      photo: syncedPhoto,
      synced: true,
      message: "打卡图已同步到云端相册。",
    };
  } catch (error) {
    return {
      photo: { ...photo, syncStatus: "local" },
      synced: false,
      message: `${mapCloudError(error, "photo_upload")} 打卡图已保留在本地设备。`,
    };
  }
}

export async function listCheckInPhotos(routeId: string) {
  const localPhotos = readCheckInPhotos(routeId);
  const client = createBrowserSupabaseClient();

  if (!client || !isCloudRouteId(routeId)) {
    return localPhotos;
  }

  const userId = await getUserId(client);

  if (!userId) {
    return localPhotos;
  }

  const { data, error } = await client
    .from("route_checkin_photos")
    .select("id,route_id,stop_id,storage_path,file_name,mime_type,created_at")
    .eq("route_id", routeId)
    .order("created_at", { ascending: false });

  if (error) {
    return localPhotos;
  }

  const cloudPhotos = await Promise.all(
    (data ?? []).map(async (photo) => ({
      id: photo.id,
      routeId: photo.route_id,
      stopId: photo.stop_id,
      fileName: photo.file_name,
      mimeType: photo.mime_type,
      dataUrl: (await createSignedUrl(client, photo.storage_path)) ?? "",
      storagePath: photo.storage_path,
      syncStatus: "cloud" as const,
      createdAt: photo.created_at,
    })),
  );
  const merged = new Map<string, StoredCheckInPhoto>();

  [...cloudPhotos, ...localPhotos].forEach((photo) => {
    if (!merged.has(photo.id)) {
      merged.set(photo.id, photo);
    }
  });

  return [...merged.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function deleteCheckInPhoto(photo: StoredCheckInPhoto) {
  removeCheckInPhoto(photo.id);

  const client = createBrowserSupabaseClient();

  if (!client || !photo.storagePath) {
    return;
  }

  await Promise.allSettled([
    client.from("route_checkin_photos").delete().eq("id", photo.id),
    client.storage.from(routeMediaBucket).remove([photo.storagePath]),
  ]);
}

async function getUserId(client: AppSupabaseClient) {
  const {
    data: { user },
  } = await client.auth.getUser();

  return user?.id ?? null;
}

async function createSignedUrl(client: AppSupabaseClient, storagePath: string) {
  const { data } = await client.storage
    .from(routeMediaBucket)
    .createSignedUrl(storagePath, 60 * 60);

  return data?.signedUrl ?? null;
}

function isCloudRouteId(routeId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    routeId,
  );
}

function dataUrlToBlob(dataUrl: string) {
  const [header, base64] = dataUrl.split(",");
  const mimeType = /data:(.*?);base64/.exec(header)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
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
