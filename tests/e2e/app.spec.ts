import { expect, test } from "@playwright/test";

test("home page exposes the three planning modes", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /认识一座城市/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /AI 帮我发现/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /我已有几个目标/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /我已有路线/ })).toBeVisible();
});

test("planning page can save a local draft and open route reader", async ({ page }) => {
  await page.goto("/plan/");

  await page.getByRole("button", { name: "音乐" }).click();
  await page.getByRole("button", { name: "保存草稿" }).click();
  await expect(page.getByRole("button", { name: "草稿已保存" })).toBeVisible();

  await page.getByRole("link", { name: /查看生成路线/ }).click();
  await expect(page.getByRole("heading", { name: /南京 · 文学漫游/ })).toBeVisible();
});

test("route reader supports direct refresh with query string", async ({ page }) => {
  await page.goto("/route/?id=demo");

  await expect(
    page.getByRole("heading", { name: "先锋书店（五台山店） 必去" }),
  ).toBeVisible();
  await expect(page.getByLabel("路线地图示意图")).toBeVisible();
});

test("library page shows cloud save entry point", async ({ page }) => {
  await page.goto("/library/");

  await expect(page.getByRole("heading", { name: "我的路线档案" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /云端保存待连接|登录后保存到云端|已登录/ }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "我的路线", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存当前示例" })).toBeVisible();
});

test("share page has a read-only fallback shell", async ({ page }) => {
  await page.goto("/share/?code=abc1234567");

  await expect(page.getByRole("heading", { name: "朋友发来的一段城市阅读" })).toBeVisible();
  await expect(page.getByText(/分享页待连接|分享链接不可用/)).toBeVisible();
});
