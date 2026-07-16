#!/usr/bin/env node

const execute = process.argv.includes("--execute");
const keepData = process.argv.includes("--keep-data");
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!execute) {
  console.log(
    [
      "DeepSeek 用量限制生产烟测为 dry-run。",
      "实际执行会创建临时生产用户，并写入 route_ai_runs 记录触发用户日限额。",
      "确认授权后运行：npm run smoke:deepseek-limit -- --execute",
      "如需保留排查数据可追加 --keep-data。",
    ].join("\n"),
  );
  process.exit(0);
}

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    "缺少 SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL、SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY 或 SUPABASE_SERVICE_ROLE_KEY。",
  );
}

const timestamp = Date.now();
const email = `codex-ai-smoke-${timestamp}@example.invalid`;
const password = `Smoke-${timestamp}-Aa1!`;
let userId = null;

try {
  const createdUser = await request("/auth/v1/admin/users", {
    method: "POST",
    serviceRole: true,
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: "Codex AI 用量烟测",
      },
    },
  });
  userId = createdUser.id;

  if (!userId) {
    throw new Error("临时用户创建失败：响应缺少 id。");
  }

  await request("/rest/v1/profiles", {
    method: "POST",
    serviceRole: true,
    body: {
      id: userId,
      display_name: "Codex AI 用量烟测",
    },
    prefer: "resolution=merge-duplicates",
  });

  const session = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    anon: true,
    body: { email, password },
  });
  const accessToken = session.access_token;

  if (!accessToken) {
    throw new Error("临时用户登录失败：响应缺少 access_token。");
  }

  const allowedDiagnostic = await callDeepSeekDiagnostic(accessToken);
  console.log("正常登录诊断：", allowedDiagnostic);

  if (allowedDiagnostic.limitStatus !== "allowed") {
    throw new Error(
      `正常登录分支未通过：limitStatus=${allowedDiagnostic.limitStatus}`,
    );
  }

  const dailyLimit = Number(allowedDiagnostic.dailyUserLimit);

  if (!Number.isFinite(dailyLimit) || dailyLimit <= 0) {
    throw new Error("未读取到有效 AI_DAILY_USER_LIMIT，无法验证用户日限额。");
  }

  await request("/rest/v1/route_ai_runs", {
    method: "POST",
    serviceRole: true,
    body: Array.from({ length: dailyLimit }, (_, index) => ({
      user_id: userId,
      route_id: null,
      action: "diagnostic-smoke",
      provider: "deepseek",
      model: "smoke",
      prompt_version: "smoke",
      schema_version: "smoke",
      status: "success",
      input_payload: { smoke: true, index },
      output_payload: null,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_cny: 0,
      elapsed_ms: 0,
      idempotency_key: `codex-ai-smoke-${timestamp}-${index}`,
    })),
  });

  const exceededDiagnostic = await callDeepSeekDiagnostic(accessToken);
  console.log("用户日限额诊断：", exceededDiagnostic);

  if (exceededDiagnostic.limitStatus !== "deepseek_daily_user_limit_exceeded") {
    throw new Error(
      `超额拒绝分支未通过：limitStatus=${exceededDiagnostic.limitStatus}`,
    );
  }

  console.log("DeepSeek 用量限制生产烟测通过。");
} finally {
  if (userId && !keepData) {
    await cleanup(userId).catch((error) => {
      console.warn("清理临时烟测数据失败：", error.message);
    });
  } else if (userId) {
    console.log(`已保留临时用户和记录：${userId}`);
  }
}

async function callDeepSeekDiagnostic(accessToken) {
  return await request("/functions/v1/deepseek-proxy", {
    method: "POST",
    anon: true,
    accessToken,
    body: { action: "diagnostic" },
  });
}

async function cleanup(id) {
  await request(`/rest/v1/route_ai_runs?user_id=eq.${id}`, {
    method: "DELETE",
    serviceRole: true,
  });
  await request(`/rest/v1/profiles?id=eq.${id}`, {
    method: "DELETE",
    serviceRole: true,
  });
  await request(`/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    serviceRole: true,
  });
}

async function request(path, options) {
  const headers = {
    "Content-Type": "application/json",
    apikey: options.serviceRole ? serviceRoleKey : anonKey,
    Authorization: `Bearer ${
      options.accessToken || (options.serviceRole ? serviceRoleKey : anonKey)
    }`,
  };

  if (options.prefer) {
    headers.Prefer = options.prefer;
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    method: options.method,
    headers,
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new Error(`${options.method} ${path} failed: ${await response.text()}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
