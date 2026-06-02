import { test, expect } from "@playwright/test";

test.describe("Authentication E2E Flow", () => {
  test.beforeEach(async ({ request }) => {
    // Ensure a clean state by asking the backend to remove test users
    // (Backend must be running on port 4000 for E2E tests)
    await request.post("http://localhost:4000/api/auth/logout").catch(() => {
      // Backend might not be ready yet; tests will fail clearly if missing
    });
  });

  test("should register a new user, log in, and log out successfully", async ({ page }) => {
    // Generate unique credentials for this test run to prevent uniqueness errors
    const uniqueId = Date.now();
    const email = `e2e-${uniqueId}@example.com`;
    const username = `e2e_user_${uniqueId}`;
    const password = "password123";
    const name = "E2E Test User";

    // 1. Visit the application - should redirect to Login page
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("Log in to X");

    // 2. Click "Sign up" to go to the Register page
    await page.locator("text=Sign up").click();
    await expect(page.locator("h1")).toHaveText("Create your account");

    // 3. Fill in registration form
    await page.locator('input[id="name"]').fill(name);
    await page.locator('input[id="email"]').fill(email);
    await page.locator('input[id="username"]').fill(username);
    await page.locator('input[id="password"]').fill(password);
    await page.locator('textarea[id="bio"]').fill("This user was created by an automated E2E test.");
    
    // Submit registration
    await page.locator('button[type="submit"]').click();

    // 4. Verify successful redirect to Home timeline
    // App should load and show user profile at the sidebar bottom or greetings on home page
    await expect(page.locator("h1.main-header-title")).toHaveText("Home");
    await expect(page.locator("text=Welcome, E2E Test User!")).toBeVisible();

    // 5. Navigate to Profile page and verify details
    await page.locator("text=Profile").click();
    await expect(page.locator("h1.main-header-title")).toHaveText("Profile");
    await expect(page.locator(`text=@${username}`).first()).toBeVisible();

    // 6. Click Logout in sidebar
    await page.locator("text=Log out").click();

    // 7. Verify we are redirected back to the Login page
    await expect(page.locator("h1")).toHaveText("Log in to X");
  });
});
