#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { humanSmokeRoute } from "../src/lib/published-curated-routes.ts";

const execute = process.argv.includes("--execute");
const replace = process.argv.includes("--replace");
const renderOnly = process.argv.includes("--render");
const outputPath = resolve(
  process.cwd(),
  "docs/review-drafts/nanjing-human-smoke-deep-reading-review.json",
);
const markdownPath = outputPath.replace(/\.json$/, ".md");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!execute && !renderOnly) {
  console.log(
    [
      "精选路线深读审核稿默认不执行。",
      "实际执行会逐站调用已部署的百度检索与 DeepSeek 服务，并把结果保存为仅供审核的 JSON/Markdown 文件。",
      "确认授权后运行：npm run generate:curated-review -- --execute",
      "只重新渲染已有审核稿的 Markdown（不调用服务）：npm run generate:curated-review -- --render",
    ].join("\n"),
  );
  process.exit(0);
}

if (execute && (!supabaseUrl || !anonKey)) {
  throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
}

const draft = await loadDraft(outputPath, replace);

if (renderOnly) {
  await persistDraft(draft);
  console.log(`审核稿 Markdown 已重新渲染：${markdownPath}`);
  process.exit(0);
}

for (const stop of humanSmokeRoute.stops) {
  if (draft.stops[stop.id]?.content) {
    console.log(`跳过已完成：${stop.name}`);
    continue;
  }

  console.log(`生成：${stop.name}`);

  try {
    const response = await invokeDeepReading(stop);
    draft.stops[stop.id] = {
      name: stop.name,
      minimumBodyLength: stop.journeyRole === "rest" ? 500 : 800,
      generatedAt: new Date().toISOString(),
      content: response.result,
      usage: response.usage,
      warnings: Array.isArray(response.warnings) ? response.warnings : [],
    };
    await persistDraft(draft);
    console.log(`完成：${stop.name}`);
  } catch (error) {
    draft.stops[stop.id] = {
      name: stop.name,
      generatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "unknown_error",
    };
    await persistDraft(draft);
    console.warn(`失败：${stop.name}`);
  }
}

await persistDraft(draft);
console.log(`审核稿已写入：${outputPath}`);

async function loadDraft(path, forceReplace) {
  if (forceReplace) {
    return createDraft();
  }

  try {
    const existing = JSON.parse(await readFile(path, "utf8"));

    return {
      ...createDraft(),
      ...existing,
      editorialSupplement:
        existing.editorialSupplement ||
        "docs/review-drafts/nanjing-human-smoke-editorial-supplement.md",
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT") {
      throw error;
    }

    return createDraft();
  }
}

function createDraft() {
  return {
    kind: "curated-route-deep-reading-review",
    routeId: humanSmokeRoute.id,
    routeTitle: humanSmokeRoute.title,
    generatedAt: new Date().toISOString(),
    publicationStatus: "review_only",
    editorialSupplement:
      "docs/review-drafts/nanjing-human-smoke-editorial-supplement.md",
    needsRegeneration: false,
    stops: {},
  };
}

async function invokeDeepReading(stop) {
  const body = {
    action: "stop-deep-reading",
    route: {
      city: humanSmokeRoute.city,
      title: humanSmokeRoute.title,
      themes: humanSmokeRoute.themes,
      stopNames: humanSmokeRoute.stops.map((item) => item.name),
    },
    stop: {
      id: stop.sourcePlaceId ?? stop.id,
      name: stop.name,
      area: stop.area,
      address: stop.address,
      themes: stop.themes,
      note: stop.note,
      stayMinutes: stop.stayMinutes,
      openingHours: stop.openingHours,
      providerCost: stop.providerCost,
      verificationStatus: stop.verificationStatus,
      contentBrief: stop.contentBrief,
    },
  };
  const first = await request(body);

  if (first.error?.includes("Failed to send a request")) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return await request(body);
  }

  return first;
}

async function request(body) {
  const response = await fetch(`${supabaseUrl}/functions/v1/deepseek-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || `deepseek_proxy_${response.status}`);
  }

  return data;
}

async function persistDraft(draft) {
  draft.needsRegeneration = Object.values(draft.stops).some(
    (entry) => entry?.error || entry?.content?.contentDepth === "template",
  );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, toMarkdown(draft), "utf8");
}

function toMarkdown(draft) {
  const lines = [
    `# ${draft.routeTitle}｜深读审核稿`,
    "",
    `状态：仅供审核，生成时间：${draft.generatedAt}`,
    "",
    "不要将本文件直接作为正式发布内容。逐条检查事实、来源、传说标注、开放信息与现场任务。",
  ];

  if (draft.editorialSupplement) {
    lines.push(
      "",
      `本稿已被编辑反馈部分更新：请先阅读[编辑补充材料](./${draft.editorialSupplement.split("/").at(-1)})。${draft.needsRegeneration ? "本文件中的旧说法不能继续沿用，须按补充材料重生成后再审。" : "请以补充材料与本稿一并审核。"}`,
    );
  }

  for (const stop of humanSmokeRoute.stops) {
    const entry = draft.stops[stop.id];
    lines.push("", `## ${stop.name}`);

    if (!entry) {
      lines.push("尚未生成。");
      continue;
    }

    if (entry.error) {
      lines.push(`生成失败：${entry.error}`);
      continue;
    }

    const content = entry.content;
    lines.push(`资料状态：${content.sourceStatus}；内容深度：${content.contentDepth}`);
    lines.push("", content.shortIntro || "");

    for (const section of content.themeConnections || []) {
      lines.push("", `### ${section.title || section.theme}`, "", section.text || "");
    }

    if (content.practicalTips?.length) {
      lines.push("", "### 实用提醒", "", ...content.practicalTips.map((tip) => `- ${tip}`));
    }

    if (content.checkInTasks?.length) {
      lines.push(
        "",
        "### 现场任务",
        "",
        ...content.checkInTasks.map((task) => `- ${formatTask(task)}`),
      );
    }

    if (content.sourceClaims?.length) {
      lines.push(
        "",
        "### 已声明的知识点",
        "",
        ...content.sourceClaims.map((claim) =>
          `- [${claim.kind}] ${claim.text}（${(claim.sourceIds || []).join("、")}）`,
        ),
      );
    }

    if (content.sourceReferences?.length) {
      lines.push(
        "",
        "### 采用来源",
        "",
        ...content.sourceReferences.map(
          (source) => `- [${source.kind}] [${source.label}](${source.href})`,
        ),
      );
    }

    if (content.researchMeta) {
      const meta = content.researchMeta;
      lines.push(
        "",
        `检索记录：${meta.provider}；查询 ${meta.successfulQueries}/${meta.attemptedQueries} 成功；返回 ${meta.returnedReferences} 条；采用 ${meta.acceptedSources} 条；检索于 ${meta.checkedAt}。`,
      );
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

function formatTask(task) {
  if (typeof task === "string") {
    return task;
  }

  if (task && typeof task === "object") {
    const title = typeof task.title === "string" ? task.title.trim() : "";
    const body = typeof task.text === "string"
      ? task.text.trim()
      : typeof task.task === "string"
        ? task.task.trim()
        : typeof task.detail === "string"
          ? task.detail.trim()
          : "";

    return [title, body].filter(Boolean).join("：") || "任务内容格式异常，请人工检查 JSON。";
  }

  return "任务内容格式异常，请人工检查 JSON。";
}
