import type {
  RoutePlan,
  RouteStop,
  RouteValidationSnapshot,
} from "@/lib/route";

export type RouteLegSource = "provider" | "estimated" | "missing";

export type RouteKernelIssueCode =
  | "duplicate_poi"
  | "missing_required_stop"
  | "fixed_time_conflict"
  | "missing_route_leg";

export type RouteKernelIssue = {
  code: RouteKernelIssueCode;
  severity: "warning" | "error";
  stopId?: string;
  message: string;
};

export type TimelineStop = RouteStop & {
  calculatedTime: string;
};

export type RouteKernelResult = {
  stops: TimelineStop[];
  totalWalkingMeters: number;
  totalWalkingMinutes: number;
  totalStayMinutes: number;
  totalMinutes: number;
  legSource: RouteLegSource;
  issues: RouteKernelIssue[];
};

export function calculateRouteKernel(route: RoutePlan): RouteKernelResult {
  const issues = validateRouteStops(route.stops);
  const stops = calculateTimeline(route.stops);
  const totals = stops.reduce(
    (result, stop) => {
      result.totalStayMinutes += stop.stayMinutes;
      result.totalWalkingMinutes += stop.walkingFromPrevious?.minutes ?? 0;
      result.totalWalkingMeters +=
        stop.walkingFromPrevious?.distanceMeters ?? 0;
      return result;
    },
    {
      totalWalkingMeters: 0,
      totalWalkingMinutes: 0,
      totalStayMinutes: 0,
    },
  );

  return {
    stops,
    ...totals,
    totalMinutes: totals.totalStayMinutes + totals.totalWalkingMinutes,
    legSource: getRouteLegSource(stops),
    issues,
  };
}

export function createRouteValidationSnapshot(
  route: RoutePlan,
): RouteValidationSnapshot {
  const issues = calculateRouteKernel(route).issues.map((issue) => ({
    code: issue.code,
    severity: issue.severity,
    stopId: issue.stopId,
    message: issue.message,
  }));

  return {
    checkedAt: new Date().toISOString(),
    issueCount: issues.length,
    issues,
  };
}

export function calculateTimeline(stops: RouteStop[]): TimelineStop[] {
  let cursorMinutes: number | null = null;

  return stops.map((stop) => {
    const walkMinutes = stop.walkingFromPrevious?.minutes ?? 0;

    if (cursorMinutes === null) {
      cursorMinutes = parseTime(stop.time) ?? 9 * 60;
    } else {
      cursorMinutes += walkMinutes;
    }

    const calculatedTime = formatTime(cursorMinutes);
    cursorMinutes += stop.stayMinutes;

    return {
      ...stop,
      calculatedTime,
    };
  });
}

export function validateRouteStops(stops: RouteStop[]): RouteKernelIssue[] {
  const issues: RouteKernelIssue[] = [];

  if (stops.length < 2) {
    issues.push({
      code: "missing_required_stop",
      severity: "error",
      message: "路线至少需要起点和终点。",
    });
  }

  stops.forEach((stop, index) => {
    if (index > 0 && !stop.walkingFromPrevious) {
      issues.push({
        code: "missing_route_leg",
        severity: "warning",
        stopId: stop.id,
        message: `${stop.name} 缺少上一站到本站的路途数据。`,
      });
    }
  });

  issues.push(...findFixedTimeConflicts(stops));

  return issues;
}

export function findFixedTimeConflicts(stops: RouteStop[]): RouteKernelIssue[] {
  const issues: RouteKernelIssue[] = [];
  let cursorMinutes: number | null = null;

  stops.forEach((stop) => {
    const walkMinutes = stop.walkingFromPrevious?.minutes ?? 0;
    const fixedMinutes = stop.fixedTime ? parseTime(stop.time) : null;

    if (cursorMinutes === null) {
      cursorMinutes = fixedMinutes ?? parseTime(stop.time) ?? 9 * 60;
    } else {
      cursorMinutes += walkMinutes;
    }

    if (fixedMinutes !== null && cursorMinutes > fixedMinutes) {
      issues.push({
        code: "fixed_time_conflict",
        severity: "error",
        stopId: stop.id,
        message: `${stop.name} 的固定时间是 ${stop.time}，当前路线预计 ${formatTime(cursorMinutes)} 才能到达。`,
      });
      cursorMinutes = fixedMinutes;
    }

    cursorMinutes += stop.stayMinutes;
  });

  return issues;
}

export function getRouteLegSource(stops: RouteStop[]): RouteLegSource {
  const legs = stops.slice(1);

  if (legs.length === 0 || legs.some((stop) => !stop.walkingFromPrevious)) {
    return "missing";
  }

  return legs.every((stop) => stop.walkingFromPrevious?.source === "provider")
    ? "provider"
    : "estimated";
}

export function parseTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function formatTime(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
