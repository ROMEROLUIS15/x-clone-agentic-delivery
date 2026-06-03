import { test, expect } from "@playwright/test";

test.describe("Replies / Threads E2E Flow", () => {
  const uniqueId = Date.now();
  const email = `replies-e2e-${uniqueId}@example.com`;
  const username = `replyuser_${uniqueId}`;
  const password = "password123";
  const name = "Reply E2E User";

  test("should open a thread, post a reply, and see the reply count update", async ({ page }) => {
    // 1. Register a new user
    await page.goto("/");
    await page.locator("text=Sign up").click();
    await expect(page.locator("h1")).toHaveText("Create your account");

    await page.locator('input[id="name"]').fill(name);
    await page.locator('input[id="email"]').fill(email);
    await page.locator('input[id="username"]').fill(username);
    await page.locator('input[id="password"]').fill(password);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator("h1.main-header-title")).toHaveText("Home");

    // 2. Create a tweet to reply to
    const parentText = `Parent tweet for replies ${uniqueId}`;
    await page.locator(".tweet-box-textarea").fill(parentText);
    await page.locator(".tweet-btn").click();
    await expect(page.locator(`text=${parentText}`)).toBeVisible();

    // 3. Open the thread via the card's reply affordance
    const parentCard = page.locator(".tweet-card", { hasText: parentText });
    await expect(parentCard).toBeVisible();
    await parentCard.locator(".tweet-reply-btn").click();
    await expect(page.locator("h1.main-header-title")).toHaveText("Thread");
    await expect(page.locator("text=No replies yet. Be the first to reply!")).toBeVisible();

    // 4. Post a reply (the composer placeholder is "Post your reply")
    const replyText = `My E2E reply ${uniqueId}`;
    await page.locator('textarea[placeholder="Post your reply"]').fill(replyText);
    await page.locator(".tweet-box .tweet-btn").click();

    // 5. The reply appears in the thread
    await expect(page.locator(`text=${replyText}`)).toBeVisible();

    // 6. Go back home — the parent card's reply count should now read 1
    await page.locator(".thread-back-btn").click();
    await expect(page.locator("h1.main-header-title")).toHaveText("Home");
    await expect(page.locator(".tweet-card", { hasText: parentText }).locator(".reply-count")).toHaveText("1");
  });
});
