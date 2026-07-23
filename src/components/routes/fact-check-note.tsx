import { AlertTriangle, Clock, ExternalLink, FileText } from "lucide-react";
import type { StopThemeContent } from "@/lib/ai/route-collaboration";
import {
  buildPlaceVerificationProfile,
  type PlaceVerificationProfile,
} from "@/lib/place-verification";
import type { RouteStop } from "@/lib/route";

export function FactCheckNote({
  city,
  content,
  dateLabel,
  stop,
  time,
}: {
  city?: string;
  content: StopThemeContent;
  dateLabel?: string;
  stop?: RouteStop;
  time?: string;
}) {
  const claims = content.sourceClaims
    .map((claim) => claim.trim())
    .filter(Boolean)
    .slice(0, 3);
  const profile =
    city && dateLabel && stop && time
      ? buildPlaceVerificationProfile({ city, dateLabel, stop, time })
      : null;
  const sources = content.sourceReferences.slice(0, 6);
  const hasVerifiedResearch =
    content.sourceStatus === "verified" || content.sourceStatus === "partial";

  return (
    <div
      className={
        profile?.status === "ready"
          ? "fact-check-note ready"
          : "fact-check-note"
      }
    >
      <p>
        <AlertTriangle size={14} />
        {content.sourceStatus === "verified"
          ? "文案仅据已检索的可靠资料和站点信息写成；出发前仍请以官方公告、预约页面或现场信息为准。"
          : content.sourceStatus === "partial"
            ? "文案只接入了部分地点资料；历史与人物信息仍需以官方或学术来源复核。"
            : "内容未接入可靠资料核验，仅作为现场观察线索，不应当作事实来源。"}
      </p>
      {hasVerifiedResearch && content.verifiedAt ? (
        <p>
          <Clock size={14} />
          资料检索时间：{formatCheckedAt(content.verifiedAt)}
        </p>
      ) : null}
      {claims.length > 0 ? (
        claims.map((claim) => (
          <p key={claim}>
            <FileText size={14} />
            {content.sourceStatus === "unverified"
              ? "待核验线索："
              : "本次使用的事实线索："}
            {claim}
          </p>
        ))
      ) : (
        <p>
          <FileText size={14} />
          暂无官方来源引用；开放时间、门票、预约和闭馆信息需要再次确认。
        </p>
      )}
      {sources.length > 0 ? (
        <div className="verification-links" aria-label="本次深读使用的资料来源">
          {sources.map((source) => (
            <a
              href={source.href}
              key={source.id}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={13} />
              {source.label}
            </a>
          ))}
        </div>
      ) : null}
      {profile ? <VerificationProfileView profile={profile} /> : null}
    </div>
  );
}

function VerificationProfileView({
  profile,
}: {
  profile: PlaceVerificationProfile;
}) {
  return (
    <div className="verification-profile">
      <p>
        <FileText size={14} />
        官方开放公告：{profile.openingNotice}
      </p>
      <p>
        <FileText size={14} />
        门票状态：{profile.ticketNotice}
      </p>
      <p>
        <FileText size={14} />
        预约状态：{profile.reservationNotice}
      </p>
      <p>
        <AlertTriangle size={14} />
        闭馆提醒：{profile.closureNotice}
      </p>
      <div className="verification-links" aria-label="核验来源入口">
        {profile.sourceReferences.map((reference) => (
          <a
            href={reference.href}
            key={reference.label}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink size={13} />
            {reference.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function formatCheckedAt(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
