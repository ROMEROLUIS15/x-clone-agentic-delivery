import { test, expect } from "@playwright/test";

test.describe("Social E2E Flow", () => {
  const uniqueId = Date.now();
  const userAEmail = `social-a-${uniqueId}@example.com`;
  const userAUsername = `social_a_${uniqueId}`;
  const userAPassword = "password123";
  const userAName = "Social User A";

  const userBEmail = `social-b-${uniqueId}@example.com`;
  const userBUsername = `social_b_${uniqueId}`;
  const userBPassword = "password123";
  const userBName = "Social User B";

  test("should allow user A to follow user B, like their tweet, and verify counts", async ({ browser }) => {
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

    // User A creates a tweet so User B has something to view
    await pageA.locator(".tweet-box-textarea").fill("Hello from User A!");
    await pageA.locator(".tweet-btn").click();
    await expect(pageA.locator("text=Hello from User A!")).toBeVisible();

    // --- Register User B in a separate tab ---
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

    // User B creates a tweet so User A can like
    await pageB.locator(".tweet-box-textarea").fill("Hello from User B!");
    await pageB.locator(".tweet-btn").click();
    await expect(pageB.locator("text=Hello from User B!")).toBeVisible();

    // --- User A navigates to User B's profile ---
    await pageA.locator(`text=@${userBUsername}`).first().click();
    await expect(pageA.locator(".profile-name")).toHaveText(userBName);

    // --- User A follows User B ---
    const followBtn = pageA.locator(".follow-btn");
    await expect(followBtn).toHaveText("Follow");
    await followBtn.click();
    await expect(followBtn).toHaveText("Following");

    // --- User A goes to User B's profile through sidebar navigation ---
    // Click on home in sidebar then click on User B's tweet name
    // Actually, just navigate to user B's profile directly
    // For now, go to User B's tweet on home page
    await pageA.locator("nav").locator("text=Home").click();
    await expect(pageA.locator("h1.main-header-title")).toHaveText("Home");

    // Find User B's tweet and like it
    const userBTweetCard = pageA.locator("article").filter({ hasText: "Hello from User B!" });
    await expect(userBTweetCard).toBeVisible();

    const likeBtn = userBTweetCard.locator(".tweet-like-btn");
    await likeBtn.click();
    // Wait for the liked class to appear
    await expect(likeBtn).toHaveClass(/liked/);

    // --- Verify User B sees the like on their own page ---
    await pageB.locator("nav").locator("text=Profile").click();
    // Refresh to see updated counts
    await pageB.reload();

    // Go to User B's followers
    const statsBtn = pageB.locator(".profile-stat-btn").filter({ hasText: "Followers" });
    await statsBtn.click();

    // Check User A is in the followers list
    await expect(pageB.locator(".list-user-name").filter({ hasText: userAName })).toBeVisible();

    // Close modal
    await pageB.locator(".modal-close-btn").click();

    // --- User A unfollows User B ---
    // Go to User B's profile from User A
    await pageA.goto("/");
    await pageA.locator(`text=@${userBUsername}`).first().click();
    await expect(pageA.locator(".profile-name")).toHaveText(userBName);

    // Hover on Following to show Unfollow text
    const followingBtn = pageA.locator(".follow-btn.following");
    await followingBtn.hover();
    // After hover clicking it unfollows
    await followingBtn.click();
    await expect(pageA.locator(".follow-btn")).toHaveText("Follow");

    await ctx.close();
  });
});
