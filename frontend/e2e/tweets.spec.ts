import { test, expect } from "@playwright/test";

test.describe("Tweets E2E Flow", () => {
  const uniqueId = Date.now();
  const email = `tweets-e2e-${uniqueId}@example.com`;
  const username = `tweetuser_${uniqueId}`;
  const password = "password123";
  const name = "Tweet E2E User";

  test("should create a tweet, verify it in the feed, and delete it", async ({ page }) => {
    // 1. Register a new user
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("Log in to X");

    await page.locator("text=Sign up").click();
    await expect(page.locator("h1")).toHaveText("Create your account");

    await page.locator('input[id="name"]').fill(name);
    await page.locator('input[id="email"]').fill(email);
    await page.locator('input[id="username"]').fill(username);
    await page.locator('input[id="password"]').fill(password);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator("h1.main-header-title")).toHaveText("Home");

    // 2. Create a tweet
    await page.locator(".tweet-box-textarea").fill("Hello from E2E test! This tweet will be deleted.");
    await page.locator(".tweet-btn").click();

    // 3. Verify tweet appears in the feed
    await expect(page.locator("text=Hello from E2E test! This tweet will be deleted.")).toBeVisible();

    // 4. Delete the tweet
    await page.locator(".tweet-delete-btn").click();

    // 5. Verify tweet is removed from the feed
    await expect(page.locator("text=Hello from E2E test! This tweet will be deleted.")).not.toBeVisible();
  });
});
