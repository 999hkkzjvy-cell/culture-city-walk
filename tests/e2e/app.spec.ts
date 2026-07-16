import { expect, test } from "@playwright/test";

test("home page exposes the three planning modes", async ({ page }) => {
  await page.goto("/");
  const mainNav = page.getByLabel("主导航");

  await expect(page.getByRole("heading", { name: "细读一座城" })).toBeVisible();
  await expect(page.getByRole("link", { name: /AI 帮我发现/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /我已有几个目标/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /我已有路线/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /南京 金陵城南 · 民国记忆/ }),
  ).toHaveAttribute("href", /\/share\/\?code=nanjing-minguo/);
  await expect(
    mainNav.getByRole("link", { name: "首页", exact: true }),
  ).toHaveAttribute("href", "/");
  await expect(
    mainNav.getByRole("link", { name: "开始规划", exact: true }),
  ).toHaveAttribute("href", "/plan/");
  await expect(
    mainNav.getByRole("link", { name: "我的路线", exact: true }),
  ).toHaveAttribute("href", "/library/");
  await expect(
    mainNav.getByRole("link", { name: "推荐路线", exact: true }),
  ).toHaveAttribute("href", "/recommendations/");
  await expect(
    mainNav.getByRole("link", { name: "关于我们", exact: true }),
  ).toHaveAttribute("href", "/about/");
  await expect(
    mainNav.getByRole("link", { name: "如何使用", exact: true }),
  ).toHaveAttribute("href", "/guide/");
  await expect(
    page.getByRole("link", { name: "登录" }).first(),
  ).toHaveAttribute("href", "/login/");
});

test("planning page can save a local draft and open route reader", async ({
  page,
}) => {
  await page.goto("/plan/");

  await page.getByRole("button", { name: "音乐" }).click();
  await page.getByRole("button", { name: "保存草稿" }).click();
  await expect(page.getByRole("button", { name: "草稿已保存" })).toBeVisible();

  await page.getByRole("link", { name: /查看生成路线/ }).click();
  await expect(
    page.getByRole("heading", { name: /书页与旧城之间/ }),
  ).toBeVisible();
});

test("planning page requires real provider places for must-visit stops", async ({
  page,
}) => {
  await page.goto("/plan/");

  await expect(
    page.getByRole("button", { name: "移除地点 先锋书店" }),
  ).toHaveCount(0);
  await page.getByLabel("去哪座城市").fill("苏州");
  await expect(page.getByLabel("去哪座城市")).toHaveValue("苏州");

  await page.getByLabel("新增必去地点").fill("拙政园");
  await expect(page.getByRole("button", { name: "搜高德" })).toBeVisible();
  await page.getByLabel("新增必去地点").press("Enter");
  await expect(
    page.getByRole("button", { name: "移除地点 拙政园" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("路线预案站点")).not.toContainText("拙政园");
  await expect(page.locator(".must-visit-search-status")).toBeVisible();

  await page.getByRole("button", { name: "保存草稿" }).click();
  await expect(page.getByRole("button", { name: "草稿已保存" })).toBeVisible();
});

test("planning page can add a candidate to the editable route preview", async ({
  page,
}) => {
  await page.goto("/plan/");

  await page.getByRole("button", { name: /生成沿途候选/ }).click();
  await page.locator(".candidate-summary-row").first().click();
  const joinButton = page
    .getByLabel("沿途可选点")
    .getByRole("button", { name: "加入路线" })
    .first();

  await expect(joinButton).toBeVisible();

  await joinButton.click();
  await expect(page.getByRole("heading", { name: "已处理" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "撤回" }).first(),
  ).toBeVisible();
  await expect(page.getByLabel("路线预案站点")).toContainText(/预案|停留/);

  await page
    .getByLabel(/停留分钟/)
    .first()
    .fill("55");
  await expect(page.getByLabel("路线预案站点")).toContainText("停留 55 分钟");

  await page.getByRole("button", { name: "撤回" }).first().click();
  await expect(
    page.getByRole("button", { name: "加入路线" }).first(),
  ).toBeVisible();
});

test("saved planning preview appears in the route reader", async ({ page }) => {
  await page.goto("/plan/");

  await page.getByRole("button", { name: /生成沿途候选/ }).click();
  await page.locator(".candidate-summary-row").first().click();
  const candidateName = await page
    .getByLabel("沿途可选点")
    .locator(".candidate-summary-row strong")
    .first()
    .innerText();

  await page.getByRole("button", { name: "加入路线" }).first().click();
  await expect(page.getByLabel("路线预案站点")).toContainText(candidateName);
  await page.getByRole("button", { name: "保存草稿" }).click();
  await page.getByRole("link", { name: /查看生成路线/ }).click();

  await expect(
    page.getByRole("heading", { name: candidateName }),
  ).toBeVisible();
});

test("route reader supports direct refresh with query string", async ({
  page,
}) => {
  await page.goto("/route/?id=demo");

  await expect(
    page.getByRole("heading", { name: "先锋书店（五台山店） 必去" }),
  ).toBeVisible();
  await expect(page.getByLabel("高德路线地图")).toBeVisible();
  await expect(page.getByText("本地估算，待高德复核")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "在高德查看地点" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "海报" })).toBeVisible();
  await expect(page.getByText("模板讲解 · 来源待核验").first()).toBeVisible();
  await page.getByRole("button", { name: "展开深读" }).first().click();
  await expect(
    page.getByText(/城市记忆如何被保留|建议停留/).first(),
  ).toBeVisible();
  await expect(page.getByText("官方开放公告：").first()).toBeVisible();
  await expect(page.getByLabel("核验来源入口").first()).toContainText(
    "官方公告搜索",
  );
});

test("route reader can edit stay time locally", async ({ page }) => {
  await page.goto("/route/?id=demo");

  await page.getByRole("button", { name: "编辑路线" }).click();
  await page.getByLabel("停留分钟").first().fill("65");
  await expect(page.getByLabel("停留分钟").first()).toHaveValue("65");
  await page.getByLabel("交通方式").first().selectOption("cycling");
  await expect(page.getByText(/骑行 \d+ 分钟/).first()).toBeVisible();
  await page
    .getByLabel(/路途分钟/)
    .first()
    .fill("18");
  await expect(page.getByText("骑行 18 分钟").first()).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "编辑路线" }).click();
  await expect(page.getByLabel("停留分钟").first()).toHaveValue("65");
  await expect(page.getByLabel("交通方式").first()).toHaveValue("cycling");
  await expect(page.getByLabel(/路途分钟/).first()).toHaveValue("18");
});

test("mobile route reader exposes fullscreen map mode", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/route/?id=demo");

  const mapButton = page.getByRole("button", { name: "全屏导航地图" });
  await expect(mapButton).toBeVisible();
  await mapButton.click();
  await expect(
    page.getByRole("button", { name: "退出全屏地图" }),
  ).toBeVisible();
});

test("route journey mode archives check-in photos", async ({ page }) => {
  await page.goto("/route/?id=demo");

  await page.getByRole("link", { name: "体验路线" }).click();
  await expect(page).toHaveURL(/\/journey\/\?id=demo/);
  await expect(page.getByRole("heading", { name: /体验路线/ })).toBeVisible();
  await expect(page.getByLabel("路线概览")).toContainText("先锋书店");
  await expect(page.getByLabel("站点深度讲解")).toContainText("打卡任务");

  await page.getByLabel("上传打卡图").setInputFiles({
    name: "checkin.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw2R9wAAAABJRU5ErkJggg==",
      "base64",
    ),
  });

  await expect(
    page.getByText(/打卡图已存入本地|打卡图已同步到云端/),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /打卡图/ })).toBeVisible();

  await page.getByRole("button", { name: /删除打卡图/ }).click();
  await expect(page.getByText("还没有为这一站上传打卡图。")).toBeVisible();
});

test("journey archive page shows completed route records", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "cultural-citywalk:journey-archives",
      JSON.stringify([
        {
          id: "journey-demo-2026-07-16",
          routeId: "demo",
          routeTitle: "书页与旧城之间",
          city: "南京",
          score: 88,
          arrivedCount: 4,
          skippedCount: 1,
          photoCount: 2,
          experienceStopCount: 5,
          completedAt: "2026-07-16T09:30:00.000Z",
        },
      ]),
    );
  });

  await page.goto("/journeys/");

  await expect(page.getByRole("heading", { name: "行程存档" })).toBeVisible();
  await expect(page.getByLabel("存档总览")).toContainText("1 次");
  await expect(page.getByLabel("存档总览")).toContainText("4 个");
  await expect(
    page.getByRole("heading", { name: "书页与旧城之间" }),
  ).toBeVisible();
  await expect(page.getByText("到达 4/5")).toBeVisible();
  await expect(page.getByRole("link", { name: "查看路线" })).toHaveAttribute(
    "href",
    "/route/?id=demo",
  );

  await page.getByLabel("行程存档筛选").getByLabel("城市").selectOption("南京");
  await expect(
    page.getByRole("heading", { name: "书页与旧城之间" }),
  ).toBeVisible();
});

test("library page shows login gate when signed out", async ({ page }) => {
  await page.goto("/library/");

  await expect(
    page.getByRole("heading", { name: "我的路线档案" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /登录账号|登录功能待连接/,
    }),
  ).toBeVisible();
});

test("recommended routes can be filtered", async ({ page }) => {
  await page.goto("/recommendations/");

  await expect(
    page.getByRole("heading", { level: 1, name: "推荐路线" }),
  ).toBeVisible();
  await expect(page.getByText("金陵城南 · 民国记忆")).toBeVisible();

  await page.getByPlaceholder("输入城市名").fill("上海");
  await expect(page.getByText("武康路文学漫游")).toBeVisible();
  await expect(page.getByText("金陵城南 · 民国记忆")).toHaveCount(0);

  await page.getByRole("button", { name: "书店" }).click();
  await expect(page.getByText("武康路文学漫游")).toBeVisible();
  await page.getByRole("button", { name: "紧凑" }).click();
  await expect(page.getByText("没有符合当前筛选的推荐路线。")).toBeVisible();

  await page.getByRole("button", { name: "紧凑" }).click();
  await page.getByRole("button", { name: "书店" }).click();
  await page.getByPlaceholder("输入城市名").fill("成都");
  await expect(page.getByText("茶馆、街巷与晚餐")).toBeVisible();
  await expect(page.getByText(/人民公园 → 宽窄巷子边线/)).toBeVisible();
});

test("login and profile pages expose account flows", async ({ page }) => {
  await page.goto("/login/");

  await expect(
    page.getByRole("heading", { name: /登录账号|登录功能待连接/ }),
  ).toBeVisible();

  if (
    await page.getByRole("button", { name: "注册", exact: true }).isVisible()
  ) {
    await page.getByRole("button", { name: "注册", exact: true }).click();
    await expect(page.getByRole("heading", { name: "注册账号" })).toBeVisible();
    await expect(page.getByLabel("邮箱")).toBeVisible();
    await expect(page.getByLabel("密码")).toBeVisible();
  }

  await page.goto("/profile/");
  await expect(
    page.getByRole("heading", { name: /请先登录|个人中心待连接/ }),
  ).toBeVisible();
});

test("share page has a read-only fallback shell", async ({ page }) => {
  await page.goto("/share/?code=abc1234567");

  await expect(
    page.getByRole("heading", { name: "朋友发来的一段城市阅读" }),
  ).toBeVisible();
  await expect(page.getByText(/分享页待连接|分享链接不可用/)).toBeVisible();
});

test("about and guide pages are available", async ({ page }) => {
  await page.goto("/about/");

  await expect(
    page.getByRole("heading", { name: /城市重新变成一本可以慢慢读的书/ }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "地理优先" })).toBeVisible();

  await page.goto("/guide/");
  await expect(
    page.getByRole("heading", { name: /可走、可读、可分享/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "推荐的一次完整流程" }),
  ).toBeVisible();
});
