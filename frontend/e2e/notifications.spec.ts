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

test.describe("Notifications", () => {
  test("recipient sees a live badge and notifications when another user follows, likes and replies", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const recipient = await register(pageA, "recipient");

    const tweetText = `Notif base ${recipient.uid}`;
    await pageA.locator(".tweet-box-textarea").fill(tweetText);
    await pageA.locator(".tweet-box .tweet-btn").click();
    await expect(pageA.locator(".tweet-card", { hasText: tweetText })).toBeVisible();

    // Actor B (a non-follower) finds A and interacts
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await register(pageB, "actor");
    await pageB.locator("nav").locator("text=Search").click();
    await pageB.locator(".search-input").fill(recipient.username);
    await expect(pageB.locator(".search-user-card").first()).toBeVisible({ timeout: 10000 });
    await pageB.locator(".search-user-name").filter({ hasText: recipient.name }).click();
    await expect(pageB.locator("h2.profile-name")).toHaveText(recipient.name);

    // Follow + like
    await pageB.locator(".follow-btn").click();
    await expect(pageB.locator(".follow-btn")).toHaveText("Following");
    await pageB.locator(".tweet-card", { hasText: tweetText }).locator(".tweet-like-btn").click();

    // A's notification badge appears live (no reload)
    await expect(pageA.locator(".nav-badge")).toBeVisible({ timeout: 10000 });

    // B replies to A's tweet
    await pageB.locator(".tweet-card", { hasText: tweetText }).locator(".tweet-reply-btn").click();
    await expect(pageB.locator("h1.main-header-title")).toHaveText("Thread");
    await pageB.locator('textarea[placeholder="Post your reply"]').fill(`A reply ${recipient.uid}`);
    await pageB.locator(".tweet-box .tweet-btn").click();
    await expect(pageB.locator(`text=A reply ${recipient.uid}`)).toBeVisible();

    // A opens the notifications view and sees all three interactions
    await pageA.locator("nav").locator("text=Notifications").click();
    await expect(pageA.locator("h1.main-header-title")).toHaveText("Notifications");
    await expect(pageA.locator(".notification-item", { hasText: "followed you" })).toBeVisible();
    await expect(pageA.locator(".notification-item", { hasText: "liked your tweet" })).toBeVisible();
    await expect(pageA.locator(".notification-item", { hasText: "replied to your tweet" })).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});
