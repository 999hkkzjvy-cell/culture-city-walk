import type { RouteStop } from "@/lib/route";
import { parseTime } from "@/lib/route-kernel";

type OpeningWindow = {
  start: number;
  end: number;
};

type OpeningSchedule = {
  windows: OpeningWindow[];
  alwaysOpen: boolean;
  explicitlyClosed: boolean;
  needsVerification: boolean;
  openWeekdays: number[] | null;
  closedWeekdays: number[];
};

export type OpeningHoursStatus = {
  status: "open" | "closed" | "unknown";
  reason: string;
};

export function getOpeningHoursWarning(
  stop: RouteStop,
  arrivalTime?: string,
  dateLabel?: string,
) {
  if (!stop.openingHours) {
    return "";
  }

  const status = getOpeningHoursStatus(
    stop.openingHours,
    arrivalTime ?? stop.time,
    dateLabel,
  );

  return status.reason;
}

export function getOpeningHoursStatus(
  openingHours: string | null | undefined,
  arrivalTime?: string,
  dateLabel?: string,
): OpeningHoursStatus {
  if (!openingHours) {
    return { status: "unknown", reason: "" };
  }

  const schedule = parseOpeningSchedule(openingHours);
  const arrival = parseTime(arrivalTime);
  const arrivalLabel = arrivalTime ?? "预计时间";
  const weekday = getWeekdayFromDateLabel(dateLabel);

  if (schedule.alwaysOpen) {
    return { status: "open", reason: "" };
  }

  if (weekday !== null && schedule.closedWeekdays.includes(weekday)) {
    return {
      status: "closed",
      reason: `预计 ${arrivalLabel} 到达，当天可能闭馆`,
    };
  }

  if (
    weekday !== null &&
    schedule.openWeekdays &&
    !schedule.openWeekdays.includes(weekday)
  ) {
    return {
      status: "closed",
      reason: `预计 ${arrivalLabel} 到达，当天可能不开放`,
    };
  }

  if (schedule.explicitlyClosed && schedule.windows.length === 0) {
    return {
      status: "closed",
      reason: "当前开放时间显示可能不开放，请出发前再次核验",
    };
  }

  if (schedule.needsVerification) {
    return {
      status: "unknown",
      reason: "开放时间含预约、节假日或公告说明，请出发前再次核验",
    };
  }

  if (schedule.windows.length === 0 || arrival === null) {
    return { status: "unknown", reason: "" };
  }

  const isOpen = schedule.windows.some((window) =>
    isTimeInsideWindow(arrival, window),
  );

  return isOpen
    ? { status: "open", reason: "" }
    : {
        status: "closed",
        reason: `预计 ${arrivalLabel} 到达，可能不在开放时间内`,
      };
}

function parseOpeningSchedule(value: string): OpeningSchedule {
  const normalized = normalizeOpeningHours(value);

  return {
    windows: parseOpeningWindows(normalized),
    alwaysOpen: /全天开放|24小时|24h|24H/.test(normalized),
    explicitlyClosed: /暂停开放|暂不开放|临时闭馆|停止开放/.test(normalized),
    needsVerification:
      /预约|需提前|节假日|法定假日|特殊开放|特殊闭馆|以公告为准|以景区公告|另行通知|闭馆日/.test(
        normalized,
      ),
    openWeekdays: parseOpenWeekdays(normalized),
    closedWeekdays: parseClosedWeekdays(normalized),
  };
}

function normalizeOpeningHours(value: string) {
  return value.replace(/[：]/g, ":").replace(/\s+/g, " ").trim();
}

function parseOpeningWindows(value: string): OpeningWindow[] {
  const matches = value.matchAll(
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

function parseOpenWeekdays(value: string) {
  const weekdays = collectWeekdays(
    value,
    /((?:周|星期|礼拜)[一二三四五六日天末](?:\s*(?:至|到|-|—|–|~)\s*(?:周|星期|礼拜)?[一二三四五六日天末])?|工作日|平日|周末)\s*(?:开放|营业)?\s*\d{1,2}:/g,
  );

  return weekdays.length > 0 ? weekdays : null;
}

function parseClosedWeekdays(value: string) {
  return collectWeekdays(
    value,
    /((?:周|星期|礼拜)[一二三四五六日天末](?:\s*(?:至|到|-|—|–|~)\s*(?:周|星期|礼拜)?[一二三四五六日天末])?|工作日|平日|周末)\s*(?:闭馆|休息|不开放)/g,
  );
}

function collectWeekdays(value: string, pattern: RegExp) {
  return [
    ...new Set(
      [...value.matchAll(pattern)].flatMap((match) =>
        parseWeekdayExpression(match[1]),
      ),
    ),
  ];
}

function parseWeekdayExpression(value: string) {
  if (value === "工作日" || value === "平日") {
    return [1, 2, 3, 4, 5];
  }

  if (value === "周末") {
    return [6, 7];
  }

  const range = value.match(
    /(?:周|星期|礼拜)([一二三四五六日天末])\s*(?:至|到|-|—|–|~)\s*(?:(?:周|星期|礼拜)?([一二三四五六日天末]))/,
  );

  if (range) {
    return expandWeekdayRange(
      weekdayCharToNumber(range[1]),
      weekdayCharToNumber(range[2]),
    );
  }

  const single = value.match(/(?:周|星期|礼拜)([一二三四五六日天末])/);
  const weekday = single ? weekdayCharToNumber(single[1]) : null;

  return weekday ? [weekday] : [];
}

function expandWeekdayRange(start: number | null, end: number | null) {
  if (!start || !end) {
    return [];
  }

  const weekdays: number[] = [];
  let current = start;

  while (true) {
    weekdays.push(current);

    if (current === end) {
      return weekdays;
    }

    current = current === 7 ? 1 : current + 1;
  }
}

function weekdayCharToNumber(value: string) {
  const weekdayMap: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    日: 7,
    天: 7,
  };

  if (value === "末") {
    return null;
  }

  return weekdayMap[value] ?? null;
}

function getWeekdayFromDateLabel(dateLabel?: string) {
  if (!dateLabel) {
    return null;
  }

  const weekdayText = dateLabel.match(/(?:周|星期|礼拜)([一二三四五六日天])/);
  const weekday = weekdayText ? weekdayCharToNumber(weekdayText[1]) : null;

  if (weekday) {
    return weekday;
  }

  const absoluteDate = dateLabel.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);

  if (absoluteDate) {
    const date = new Date(
      Number(absoluteDate[1]),
      Number(absoluteDate[2]) - 1,
      Number(absoluteDate[3]),
      12,
    );

    return jsDayToWeekday(date.getDay());
  }

  const relativeOffset = getRelativeDayOffset(dateLabel);

  if (relativeOffset !== null) {
    const date = new Date();
    date.setDate(date.getDate() + relativeOffset);

    return jsDayToWeekday(date.getDay());
  }

  return null;
}

function getRelativeDayOffset(dateLabel: string) {
  if (dateLabel.includes("今天")) {
    return 0;
  }

  if (dateLabel.includes("明天")) {
    return 1;
  }

  if (dateLabel.includes("后天")) {
    return 2;
  }

  return null;
}

function jsDayToWeekday(day: number) {
  return day === 0 ? 7 : day;
}

function isTimeInsideWindow(time: number, window: OpeningWindow) {
  if (window.end >= window.start) {
    return time >= window.start && time <= window.end;
  }

  return time >= window.start || time <= window.end;
}
