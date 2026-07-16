import type { RoutePlan } from "@/lib/route";
import { calculateRouteKernel } from "@/lib/route-kernel";

export type RoutePosterOptions = {
  subtitle?: string;
  footer?: string;
};

const posterWidth = 1080;
const posterHeight = 1440;

export function buildRoutePosterSvg(
  route: RoutePlan,
  { footer = "Cultural Citywalk", subtitle }: RoutePosterOptions = {},
) {
  const kernel = calculateRouteKernel(route);
  const title = escapeXml(route.title);
  const city = escapeXml(route.city);
  const routeSubtitle = escapeXml(
    subtitle ??
      `${route.themes.slice(0, 3).join(" · ")} · ${route.stops.length} 站 · ${(
        kernel.totalWalkingMeters / 1000
      ).toFixed(1)} km`,
  );
  const stops = route.stops.slice(0, 7);
  const stopRows = stops
    .map((stop, index) => {
      const y = 610 + index * 86;
      return `
        <circle cx="144" cy="${y - 8}" r="19" fill="#173e32" />
        <text x="144" y="${y - 2}" text-anchor="middle" font-size="20" font-weight="700" fill="#fbf7ef">${String(
          index + 1,
        ).padStart(2, "0")}</text>
        <text x="186" y="${y - 20}" font-size="35" font-weight="700" fill="#20231f">${escapeXml(
          stop.name,
        )}</text>
        <text x="186" y="${y + 20}" font-size="24" fill="#6a7069">${escapeXml(
          [stop.area, stop.address].filter(Boolean).join(" · ") || "现场核验开放信息",
        )}</text>
      `;
    })
    .join("");
  const moreText =
    route.stops.length > stops.length
      ? `<text x="144" y="${610 + stops.length * 86 - 8}" font-size="24" fill="#8e7657">另有 ${
          route.stops.length - stops.length
        } 站，打开路线查看完整时间轴</text>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${posterWidth}" height="${posterHeight}" viewBox="0 0 ${posterWidth} ${posterHeight}" role="img" aria-label="${title}">
  <rect width="1080" height="1440" fill="#f4f0e7" />
  <rect x="64" y="64" width="952" height="1312" rx="22" fill="#fbf7ef" stroke="#d8d0c3" stroke-width="3" />
  <rect x="94" y="94" width="892" height="131" rx="16" fill="#173e32" />
  <text x="124" y="154" font-size="29" font-weight="700" fill="#fbf7ef" letter-spacing="5">CITYWALK ROUTE</text>
  <text x="124" y="195" font-size="24" fill="#d8d0c3">${city}</text>
  <circle cx="872" cy="160" r="58" fill="none" stroke="#fbf7ef" stroke-width="4" />
  <text x="872" y="154" text-anchor="middle" font-size="24" font-weight="700" fill="#fbf7ef">${escapeXml(
    route.stops.length.toString(),
  )}</text>
  <text x="872" y="184" text-anchor="middle" font-size="19" fill="#d8d0c3">STOPS</text>
  <text x="104" y="330" font-size="74" font-weight="800" fill="#20231f">${title}</text>
  <text x="108" y="392" font-size="29" fill="#536057">${routeSubtitle}</text>
  <path d="M108 468 C246 420, 366 516, 504 468 S760 432, 936 486" fill="none" stroke="#8e7657" stroke-width="5" stroke-dasharray="16 14" />
  <text x="108" y="538" font-size="27" font-weight="700" fill="#173e32">路线站点</text>
  ${stopRows}
  ${moreText}
  <rect x="104" y="1218" width="872" height="98" rx="14" fill="#eae2d4" />
  <text x="136" y="1275" font-size="26" fill="#37433b">出发前请再次核验开放时间、预约、门票和现场管控。</text>
  <text x="104" y="1352" font-size="24" font-weight="700" fill="#8e7657">${escapeXml(
    footer,
  )}</text>
</svg>`;
}

export function routePosterFileName(route: RoutePlan) {
  const normalized = route.title
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `${normalized || "citywalk-route"}-poster.svg`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}
