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
    page.getByRole("heading", { name: /南京 · 文学漫游/ }),
  ).toBeVisible();
});

test("planning page can edit city and must-visit places", async ({ page }) => {
  await page.goto("/plan/");

  await page.getByLabel("去哪座城市").fill("苏州");
  await expect(page.getByLabel("去哪座城市")).toHaveValue("苏州");

  await page.getByLabel("新增必去地点").fill("拙政园");
  await expect(page.getByRole("button", { name: "搜高德" })).toBeVisible();
  await page.getByLabel("新增必去地点").press("Enter");
  await expect(
    page.getByRole("button", { name: "移除地点 拙政园" }),
  ).toBeVisible();
  await expect(page.getByLabel("路线预案站点")).toContainText("拙政园");

  await page.getByRole("button", { name: "移除地点 先锋书店" }).click();
  await expect(
    page.getByRole("button", { name: "移除地点 先锋书店" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "保存草稿" }).click();
  await expect(page.getByRole("button", { name: "草稿已保存" })).toBeVisible();
});

test("planning page can add a candidate to the editable route preview", async ({
  page,
}) => {
  await page.goto("/plan/");

  await page.getByRole("button", { name: /生成沿途候选/ }).click();
  await expect(
    page
      .getByLabel("沿途可选点")
      .getByRole("button", { name: "加入路线" })
      .first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "加入路线" }).first().click();
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
  const candidateName = await page
    .getByLabel("沿途可选点")
    .locator(".candidate-item h3")
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
  await expect(page.getByText("模板讲解 · 来源待核验").first()).toBeVisible();
  await page.getByRole("button", { name: "展开深读" }).first().click();
  await expect(
    page.getByText(/出发前请再次核验|阅读角度/).first(),
  ).toBeVisible();
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
