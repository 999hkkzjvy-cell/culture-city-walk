import { amapPlaceSearchUrl } from "@/lib/maps/amap";
import { getOpeningHoursWarning } from "@/lib/opening-hours";
import type { RouteStop } from "@/lib/route";

export type PlaceVerificationProfile = {
  checkedAt: string;
  status: "ready" | "warning" | "missing";
  openingNotice: string;
  ticketNotice: string;
  reservationNotice: string;
  closureNotice: string;
  sourceReferences: PlaceVerificationReference[];
};

export type PlaceVerificationReference = {
  label: string;
  href: string;
  kind: "official" | "ticket" | "map" | "phone";
};

export function buildPlaceVerificationProfile({
  city,
  dateLabel,
  stop,
  time,
}: {
  city: string;
  dateLabel: string;
  stop: RouteStop;
  time: string;
}): PlaceVerificationProfile {
  const openingWarning = getOpeningHoursWarning(stop, time, dateLabel);
  const hasOpeningHours = Boolean(stop.openingHours?.trim());
  const needsTicket = maybeNeedsTicket(stop);
  const needsReservation = maybeNeedsReservation(stop);
  const sourceReferences = buildSourceReferences(stop, city);
  const status =
    openingWarning || needsReservation || needsTicket
      ? "warning"
      : hasOpeningHours && sourceReferences.length > 1
        ? "ready"
        : "missing";

  return {
    checkedAt: new Date().toISOString(),
    status,
    openingNotice: hasOpeningHours
      ? `高德开放时间：${stop.openingHours}`
      : "缺少可读取开放时间，需查看官方公告或现场信息。",
    ticketNotice: needsTicket
      ? "该类型站点可能涉及门票、展陈票或入场规则，请以官方预约/购票页为准。"
      : "暂未发现明确门票线索；免费开放仍需以现场公告为准。",
    reservationNotice: needsReservation
      ? "开放信息或站点类型提示可能需要预约，请出发前再次确认。"
      : "暂未发现明确预约线索。",
    closureNotice:
      openingWarning ??
      "暂未识别闭馆、节假日例外或临时管控提示；仍建议出发当天复核。",
    sourceReferences,
  };
}

function buildSourceReferences(stop: RouteStop, city: string) {
  const keyword = [city, stop.name, stop.address].filter(Boolean).join(" ");
  const encodedKeyword = encodeURIComponent(keyword);
  const references: PlaceVerificationReference[] = [
    {
      label: "官方公告搜索",
      href: `https://www.baidu.com/s?wd=${encodedKeyword}%20%E5%AE%98%E7%BD%91%20%E5%85%AC%E5%91%8A%20%E5%BC%80%E6%94%BE%E6%97%B6%E9%97%B4`,
      kind: "official",
    },
    {
      label: "门票/预约搜索",
      href: `https://www.baidu.com/s?wd=${encodedKeyword}%20%E9%97%A8%E7%A5%A8%20%E9%A2%84%E7%BA%A6%20%E9%97%AD%E9%A6%86`,
      kind: "ticket",
    },
    {
      label: "高德地点页",
      href: amapPlaceSearchUrl({
        name: stop.name,
        city,
        address: stop.address,
      }),
      kind: "map",
    },
  ];

  if (stop.telephone) {
    references.push({
      label: `电话核验 ${stop.telephone}`,
      href: `tel:${stop.telephone}`,
      kind: "phone",
    });
  }

  return references;
}

function maybeNeedsTicket(stop: RouteStop) {
  const text = `${stop.name} ${stop.area} ${stop.address} ${stop.openingHours ?? ""} ${stop.providerCost ?? ""}`;

  return /博物馆|纪念馆|美术馆|展览|展馆|景区|故居|总统府|门票|票|收费|预约/.test(
    text,
  );
}

function maybeNeedsReservation(stop: RouteStop) {
  const text = `${stop.name} ${stop.area} ${stop.address} ${stop.openingHours ?? ""}`;

  return /预约|实名|限流|闭馆|公告|节假日|博物馆|纪念馆|美术馆|展览|展馆/.test(
    text,
  );
}
