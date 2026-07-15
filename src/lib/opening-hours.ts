import type { RouteStop } from "@/lib/route";
import { parseTime } from "@/lib/route-kernel";

type OpeningWindow = {
  start: number;
  end: number;
};

export function getOpeningHoursWarning(stop: RouteStop, arrivalTime?: string) {
  if (!stop.openingHours) {
    return "";
  }

  const windows = parseOpeningWindows(stop.openingHours);
  const arrival = parseTime(arrivalTime ?? stop.time);

  if (windows.length === 0 || arrival === null) {
    return "";
  }

  const isOpen = windows.some((window) => isTimeInsideWindow(arrival, window));

  return isOpen ? "" : `预计 ${arrivalTime ?? stop.time} 到达，可能不在开放时间内`;
}

function parseOpeningWindows(value: string): OpeningWindow[] {
  const normalized = value.replace(/[：]/g, ":");
  const matches = normalized.matchAll(
    /(\d{1,2}):(\d{2})\s*[-~至—–]\s*(\d{1,2}):(\d{2})/g,
  );

  return [...matches]
    .map((match) => ({
      start: Number(match[1]) * 60 + Number(match[2]),
      end: Number(match[3]) * 60 + Number(match[4]),
    }))
    .filter(
      (window) =>
        Number.isFinite(window.start) &&
        Number.isFinite(window.end) &&
        window.start >= 0 &&
        window.start < 24 * 60 &&
        window.end >= 0 &&
        window.end <= 24 * 60,
    );
}

function isTimeInsideWindow(time: number, window: OpeningWindow) {
  if (window.end >= window.start) {
    return time >= window.start && time <= window.end;
  }

  return time >= window.start || time <= window.end;
}
