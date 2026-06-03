import { test, expect } from "@playwright/test";

// 1x1 transparent PNG.
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);
const pngFile = { name: "pic.png", mimeType: "image/png", buffer: PNG_1x1 };

test.describe("Image Upload E2E Flow", () => {
  const password = "password123";
  const name = "Upload E2E User";

  // Unique identity per call so the tests never collide on a duplicate email,
  // even when several land on the same Playwright worker.
  async function register(page: import("@playwright/test").Page): Promise<string> {
    const uid = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await page.goto("/");
    await page.locator("text=Sign up").click();
    await expect(page.locator("h1")).toHaveText("Create your account");
    await page.locator('input[id="name"]').fill(name);
    await page.locator('input[id="email"]').fill(`uploads-${uid}@example.com`);
    await page.locator('input[id="username"]').fill(`upload_${uid}`);
    await page.locator('input[id="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("h1.main-header-title")).toHaveText("Home");
    return uid;
  }

  test("should attach an image to a tweet and render it in the feed", async ({ page }) => {
    const uniqueId = await register(page);

    const tweetText = `Tweet with image ${uniqueId}`;
    await page.getByTestId("tweet-image-input").setInputFiles(pngFile);

    // Composer preview shows the uploaded image
    await expect(page.getByAltText("Selected attachment")).toBeVisible();

    await page.locator(".tweet-box-textarea").fill(tweetText);
    await page.locator(".tweet-box .tweet-btn").click();

    const card = page.locator(".tweet-card", { hasText: tweetText });
    await expect(card).toBeVisible();
    const image = card.locator(".tweet-card-image");
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("src", /\/uploads\//);

    // Regression guard: the image must actually LOAD, not just have a src.
    // (A missing /uploads dev proxy previously rendered these as broken images.)
    await expect
      .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  });

  test("should let a user comment on a tweet that has an image", async ({ page }) => {
    const uniqueId = await register(page);

    const tweetText = `Commentable image tweet ${uniqueId}`;
    await page.getByTestId("tweet-image-input").setInputFiles(pngFile);
    await expect(page.getByAltText("Selected attachment")).toBeVisible();
    await page.locator(".tweet-box-textarea").fill(tweetText);
    await page.locator(".tweet-box .tweet-btn").click();

    const card = page.locator(".tweet-card", { hasText: tweetText });
    await expect(card).toBeVisible();

    // Open the thread from the image tweet and post a comment
    await card.locator(".tweet-reply-btn").click();
    await expect(page.locator("h1.main-header-title")).toHaveText("Thread");

    const comment = `Comment on image ${uniqueId}`;
    await page.locator('textarea[placeholder="Post your reply"]').fill(comment);
    await page.locator(".tweet-box .tweet-btn").click();
    await expect(page.locator(`text=${comment}`)).toBeVisible();
  });

  test("should update the profile avatar via upload", async ({ page }) => {
    await register(page);

    await page.locator("nav").locator("text=Profile").click();
    await expect(page.locator("h2.profile-name")).toHaveText(name);

    await page.getByTestId("avatar-input").setInputFiles(pngFile);

    const avatar = page.locator(".profile-large-avatar");
    await expect(avatar).toHaveAttribute("src", /\/uploads\//, { timeout: 10000 });
  });
});
