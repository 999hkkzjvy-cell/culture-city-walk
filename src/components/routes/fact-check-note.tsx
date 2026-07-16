import { AlertTriangle, FileText } from "lucide-react";
import type { StopThemeContent } from "@/lib/ai/route-collaboration";

export function FactCheckNote({ content }: { content: StopThemeContent }) {
  const claims = content.sourceClaims
    .map((claim) => claim.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="fact-check-note">
      <p>
        <AlertTriangle size={14} />
        {content.sourceStatus === "verified"
          ? "内容带有核验标记；出发前仍请以官方公告、预约页面或现场信息为准。"
          : "内容未接入官方核验，仅作为现场观察线索，不应当作事实来源。"}
      </p>
      {claims.length > 0 ? (
        claims.map((claim) => (
          <p key={claim}>
            <FileText size={14} />
            待核验线索：{claim}
          </p>
        ))
      ) : (
        <p>
          <FileText size={14} />
          暂无官方来源引用；开放时间、门票、预约和闭馆信息需要再次确认。
        </p>
      )}
    </div>
  );
}
