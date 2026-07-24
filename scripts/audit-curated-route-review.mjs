#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = resolve(
  process.cwd(),
  "docs/review-drafts/nanjing-human-smoke-deep-reading-review.json",
);
const outputPath = inputPath.replace(/\.json$/, ".audit.md");
const draft = JSON.parse(await readFile(inputPath, "utf8"));
const editorApproved = draft.editorialReview?.status === "approved";
const confirmedSensitiveClaims = new Set(
  Array.isArray(draft.editorialReview?.confirmedSensitiveClaims)
    ? draft.editorialReview.confirmedSensitiveClaims
    : [],
);
const rows = Object.values(draft.stops).map((entry) =>
  auditEntry(entry, editorApproved, confirmedSensitiveClaims),
);
const summary = rows.reduce(
  (result, row) => {
    result[row.level] += 1;
    return result;
  },
  { pass: 0, review: 0, block: 0 },
);

await writeFile(outputPath, toMarkdown(rows, summary), "utf8");
console.log(`审核清单已写入：${outputPath}`);

function auditEntry(entry, editorApproved, confirmedSensitiveClaims) {
  const issues = [];
  const content = entry.content;

  if (entry.error || !content) {
    return { name: entry.name, level: "block", issues: [entry.error || "未生成内容"] };
  }

  const sourceById = new Map(
    (content.sourceReferences || []).map((source) => [source.id, source]),
  );
  const body = [
    content.shortIntro,
    ...(content.themeConnections || []).map((section) => section.text),
  ].join("");

  if (content.checkInTasks?.length !== 2) {
    issues.push(`现场任务为 ${content.checkInTasks?.length ?? 0} 项，不符合“恰好两项”要求。`);
  }

  if (content.contentDepth === "template") {
    issues.push("缺少可交叉核验的资料，保持模板状态，不进入正式稿。");
  } else if (content.sourceStatus !== "verified") {
    issues.push("资料以文化资料为主；由路线编辑决定是否采用，并保留来源链接。");
  }

  const minimumBodyLength = entry.minimumBodyLength ?? 800;
  if (!editorApproved && content.contentDepth === "full" && (body.length < minimumBodyLength || body.length > 1200)) {
    issues.push(`完整稿正文约 ${body.length} 字符，需人工补足或压缩到 ${minimumBodyLength}–1200 字范围。`);
  }

  for (const claim of content.sourceClaims || []) {
    const kinds = (claim.sourceIds || [])
      .map((sourceId) => sourceById.get(sourceId)?.kind)
      .filter(Boolean);

    if (kinds.length !== claim.sourceIds?.length) {
      issues.push(`知识点“${claim.text}”存在无法解析的来源编号。`);
    }

    if (
      isSensitiveClaim(claim.text) &&
      !confirmedSensitiveClaims.has(claim.text) &&
      !kinds.some((kind) => ["official", "academic", "authority"].includes(kind))
    ) {
      issues.push(`严重历史指控“${claim.text}”仅有普通文化资料；须由路线编辑明确确认或补充更严格来源。`);
    }
  }

  return {
    name: entry.name,
    level: issues.some((issue) => issue.includes("不进入正式稿") || issue.includes("严重历史指控"))
      ? "block"
      : issues.length > 0
        ? "review"
        : "pass",
    issues,
  };
}

function isSensitiveClaim(text) {
  return /慰安所|大屠杀|遇难|屠杀|伤亡|暴力|强占|日军/.test(text || "");
}

function toMarkdown(rows, summary) {
  const lines = [
    "# 人间烟火：一座城市的日常｜深读审核清单",
    "",
    `此清单由生成稿的结构化来源与长度自动检查得出。普通城市史与生活史以路线编辑审核为准；${editorApproved ? "本稿已获编辑批准，篇幅偏差不再作为阻止项。" : "篇幅与结构提示仍待编辑判断。"}严重历史指控、动态开放与安全信息仍需单独确认。${confirmedSensitiveClaims.size ? "本稿已记录路线编辑对个别严重历史说法的明确确认。" : ""}`,
    "",
    `汇总：可优先人工阅稿 ${summary.pass} 站；需修改 ${summary.review} 站；不得进入正式稿 ${summary.block} 站。`,
  ];

  for (const row of rows) {
    const label = row.level === "pass" ? "可阅稿" : row.level === "review" ? "需修改" : "阻止发布";
    lines.push("", `## ${row.name}｜${label}`);
    lines.push(...(row.issues.length ? row.issues.map((issue) => `- ${issue}`) : ["- 结构化检查未发现阻止项；仍需人工逐条核对正文与原始来源。"]));
  }

  return `${lines.join("\n")}\n`;
}
