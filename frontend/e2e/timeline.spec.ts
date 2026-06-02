import { test, expect } from "@playwright/test";

test.describe("Timeline & Search E2E Flow", () => {
  const uniqueId = Date.now();
  const userAEmail = `timeline-a-${uniqueId}@example.com`;
  const userAUsername = `tla_${uniqueId}`;
  const userAPassword = "password123";
  const userAName = "Timeline User A";

  const userBEmail = `timeline-b-${uniqueId}@example.com`;
  const userBUsername = `tlb_${uniqueId}`;
  const userBPassword = "password123";
  const userBName = "Timeline User B";

  test("should paginate timeline and search for users", async ({ browser }) => {
    const ctx = await browser.newContext();

    // --- Register User A ---
    const pageA = await ctx.newPage();
    await pageA.goto("/");
    await expect(pageA.locator("h1")).toHaveText("Log in to X");
    await pageA.locator("text=Sign up").click();
    await expect(pageA.locator("h1")).toHaveText("Create your account");
    await pageA.locator('input[id="name"]').fill(userAName);
    await pageA.locator('input[id="email"]').fill(userAEmail);
    await pageA.locator('input[id="username"]').fill(userAUsername);
    await pageA.locator('input[id="password"]').fill(userAPassword);
    await pageA.locator('button[type="submit"]').click();
    await expect(pageA.locator("h1.main-header-title")).toHaveText("Home");

    // User A creates 2 tweets
    await pageA.locator(".tweet-box-textarea").fill("User A first tweet");
    await pageA.locator(".tweet-btn").click();
    await expect(pageA.locator("text=User A first tweet")).toBeVisible();

    await pageA.locator(".tweet-box-textarea").fill("User A second tweet");
    await pageA.locator(".tweet-btn").click();
    await expect(pageA.locator("text=User A second tweet")).toBeVisible();

    // --- Register User B ---
    const pageB = await ctx.newPage();
    await pageB.goto("/");
    await expect(pageB.locator("h1")).toHaveText("Log in to X");
    await pageB.locator("text=Sign up").click();
    await expect(pageB.locator("h1")).toHaveText("Create your account");
    await pageB.locator('input[id="name"]').fill(userBName);
    await pageB.locator('input[id="email"]').fill(userBEmail);
    await pageB.locator('input[id="username"]').fill(userBUsername);
    await pageB.locator('input[id="password"]').fill(userBPassword);
    await pageB.locator('button[type="submit"]').click();
    await expect(pageB.locator("h1.main-header-title")).toHaveText("Home");

    // User B creates 2 tweets
    await pageB.locator(".tweet-box-textarea").fill("User B first tweet");
    await pageB.locator(".tweet-btn").click();
    await expect(pageB.locator("text=User B first tweet")).toBeVisible();

    await pageB.locator(".tweet-box-textarea").fill("User B second tweet");
    await pageB.locator(".tweet-btn").click();
    await expect(pageB.locator("text=User B second tweet")).toBeVisible();

    // --- User A follows User B ---
    // Navigate to User B's profile via search (or direct navigation)
    // First, use search to find User B
    await pageA.locator("nav").locator("text=Search").click();
    await expect(pageA.locator("h1.main-header-title")).toHaveText("Search");

    await pageA.locator(".search-input").fill(userBUsername);
    // Wait for search results
    await expect(pageA.locator(".search-user-card").first()).toBeVisible({ timeout: 10000 });
    await expect(pageA.locator(".search-user-name").filter({ hasText: userBName })).toBeVisible();

    // Click on User B to view profile
    await pageA.locator(".search-user-name").filter({ hasText: userBName }).click();
    await expect(pageA.locator(".profile-name")).toHaveText(userBName);

    // Follow User B
    await pageA.locator(".follow-btn").click();
    await expect(pageA.locator(".follow-btn")).toHaveText("Following");

    // --- Go back to Home to see timeline ---
    await pageA.locator("nav").locator("text=Home").click();
    await expect(pageA.locator("h1.main-header-title")).toHaveText("Home");

    // The timeline should show tweets from both A and B
    await expect(pageA.locator("text=User B first tweet")).toBeVisible({ timeout: 10000 });
    await expect(pageA.locator("text=User B second tweet")).toBeVisible();

    // --- Test user search from page B ---
    await pageB.locator("nav").locator("text=Search").click();
    await expect(pageB.locator("h1.main-header-title")).toHaveText("Search");

    // Search for User A by name
    await pageB.locator(".search-input").fill(userAName);
    await expect(pageB.locator(".search-user-card").first()).toBeVisible({ timeout: 10000 });
    await expect(pageB.locator(".search-user-name").filter({ hasText: userAName })).toBeVisible();

    // Search for a non-existent user
    await pageB.locator(".search-input").fill("zzzzznonexistent");
    await expect(pageB.locator("text=No users found for")).toBeVisible({ timeout: 10000 });

    await ctx.close();
  });
});
