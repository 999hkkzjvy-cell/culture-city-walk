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
