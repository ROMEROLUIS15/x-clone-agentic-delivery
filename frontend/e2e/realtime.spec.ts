import { test, expect, type Page } from "@playwright/test";

async function register(page: Page, label: string) {
  const uid = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await page.goto("/");
  await page.locator("text=Sign up").click();
  await page.locator('input[id="name"]').fill(`${label} ${uid}`);
  await page.locator('input[id="email"]').fill(`${label}-${uid}@example.com`);
  await page.locator('input[id="username"]').fill(`${label}_${uid}`);
  await page.locator('input[id="password"]').fill("password123");
  await page.locator('button[type="submit"]').click();
  await expect(page.locator("h1.main-header-title")).toHaveText("Home");
  return { uid, name: `${label} ${uid}`, username: `${label}_${uid}` };
}

test.describe("Real-time across users (topic streams)", () => {
  test("a non-follower viewing a profile/thread sees new tweets, replies and likes live", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const author = await register(pageA, "author");

    // Author posts the base tweet
    const base = `RT base ${author.uid}`;
    await pageA.locator(".tweet-box-textarea").fill(base);
    await pageA.locator(".tweet-box .tweet-btn").click();
    await expect(pageA.locator(".tweet-card", { hasText: base })).toBeVisible();

    // Viewer (does NOT follow author) finds the author via search and opens the profile
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await register(pageB, "viewer");
    await pageB.locator("nav").locator("text=Search").click();
    await pageB.locator(".search-input").fill(author.username);
    await expect(pageB.locator(".search-user-card").first()).toBeVisible({ timeout: 10000 });
    await pageB.locator(".search-user-name").filter({ hasText: author.name }).click();
    await expect(pageB.locator("h2.profile-name")).toHaveText(author.name);
    await expect(pageB.locator(".tweet-card", { hasText: base })).toBeVisible();

    // 1) PROFILE real-time: author posts another tweet; viewer sees it live (no reload)
    const live = `RT live ${author.uid}`;
    await pageA.locator(".tweet-box-textarea").fill(live);
    await pageA.locator(".tweet-box .tweet-btn").click();
    await expect(pageB.locator(".tweet-card", { hasText: live })).toBeVisible({ timeout: 10000 });

    // Viewer opens the base tweet's thread
    await pageB.locator(".tweet-card", { hasText: base }).locator(".tweet-reply-btn").click();
    await expect(pageB.locator("h1.main-header-title")).toHaveText("Thread");

    // Author opens the same thread and replies
    await pageA.locator(".tweet-card", { hasText: base }).locator(".tweet-reply-btn").click();
    await expect(pageA.locator("h1.main-header-title")).toHaveText("Thread");
    const reply = `RT reply ${author.uid}`;
    await pageA.locator('textarea[placeholder="Post your reply"]').fill(reply);
    await pageA.locator(".tweet-box .tweet-btn").click();

    // 2) THREAD real-time: viewer sees the reply appear live (no reload)
    await expect(pageB.locator(`text=${reply}`)).toBeVisible({ timeout: 10000 });

    // 3) LIKE real-time: author likes the focused tweet; viewer sees the count update live
    await pageA.locator(".thread-focus .tweet-like-btn").click();
    await expect(pageB.locator(".thread-focus .like-count")).toHaveText("1", { timeout: 10000 });

    await ctxA.close();
    await ctxB.close();
  });
});
