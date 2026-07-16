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
        <Clock size={14} />
        最近核验：{formatCheckedAt(profile.checkedAt)}
      </p>
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
          <a href={reference.href} key={reference.label} rel="noreferrer" target="_blank">
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
