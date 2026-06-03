import { test, expect } from "@playwright/test";

// 1x1 transparent PNG.
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);
const pngFile = { name: "pic.png", mimeType: "image/png", buffer: PNG_1x1 };

test.describe("Image Upload E2E Flow", () => {
  const uniqueId = Date.now();
  const email = `uploads-e2e-${uniqueId}@example.com`;
  const username = `uploaduser_${uniqueId}`;
  const password = "password123";
  const name = "Upload E2E User";

  async function register(page: import("@playwright/test").Page) {
    await page.goto("/");
    await page.locator("text=Sign up").click();
    await expect(page.locator("h1")).toHaveText("Create your account");
    await page.locator('input[id="name"]').fill(name);
    await page.locator('input[id="email"]').fill(email);
    await page.locator('input[id="username"]').fill(username);
    await page.locator('input[id="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("h1.main-header-title")).toHaveText("Home");
  }

  test("should attach an image to a tweet and render it in the feed", async ({ page }) => {
    await register(page);

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
