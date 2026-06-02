# Task Tracking - X Clone Agentic Delivery

## Phase 1: Scaffolding & Database Setup
- [x] Initialize monorepo or standard multi-folder structure (`/backend`, `/frontend`).
- [x] Initialize Git.
- [x] Set up TypeScript configuration in both projects.
- [x] Set up Database connection (Prisma/PostgreSQL/SQLite) and execute initial migration.
- [x] _Git Commit: `chore: initial project scaffolding and database schema migration`_

## Phase 2: Custom Authentication System
- [x] Create Database models for `User`.
- [x] Write password hashing utility and validation logic.
- [x] Create backend endpoints: `/register`, `/login`, `/logout`, `/me`.
- [x] Write backend unit tests for User model and integration tests for auth endpoints (aiming for >80% coverage).
- [x] Set up frontend router and login/register pages.
- [x] Integrate frontend auth with backend endpoints.
- [x] Write at least one End-to-End (E2E) test for register/login flow.
- [x] _Git Commit: `feat(auth): implement custom authentication system with backend/frontend integration and E2E tests`_

## Phase 3: Tweets Operations
- [x] Create Database model for `Tweet`.
- [x] Implement backend `/api/tweets` endpoints (create, delete, getMyTweets, validation rules for ≤280 chars).
- [x] Write unit & integration tests for tweet operations (11 tests).
- [x] Implement frontend components to write (TweetBox with 280-char counter) and delete tweets.
- [x] Add E2E Playwright test for tweet creation and deletion.
- [x] _Git Commit: `feat(tweets): add tweet creation, deletion, and character validation with tests`_

## Phase 4: Social Graph & Interactions
- [x] Create Database models for `Follow` and `Like`.
- [x] Write backend endpoints: `/follow`, `/unfollow`, `/like`, `/unlike`.
- [x] Write backend integration tests for interactions (31 tests).
- [x] Implement frontend elements: Follow/Unfollow button, Like button with counters, and lists of followers/following on the profile page.
- [x] _Git Commit: `feat(social): add follow/unfollow and like/unlike systems with real-time UI counters and tests`_

## Phase 5: Timeline, Pagination & Search
- [x] Implement Timeline query (tweets from self + followed users) on backend.
- [x] Add pagination (offset-based) to backend timeline endpoint.
- [x] Implement frontend Home timeline showing paginated tweets with "Load More" button.
- [x] Implement user search backend endpoint (`GET /api/users/search?q=...`) and search bar in frontend.
- [x] Write tests covering timeline pagination (15 backend + 9 frontend) and user search.
- [x] _Git Commit: `feat(timeline): implement paginated home timeline and search feature with tests`_

## Phase 6: Responsive Design & Premium CSS
- [x] Implement mobile-first CSS rules for all layouts (base < 640px, tablet 640px-1024px, desktop > 1024px).
- [x] Add dark mode support and sleek gradients (radial bg on auth, subtle accents on cards, glow focus rings).
- [x] Add micro-animations (likePop bounce, button scale on click, hover transitions, smooth page fadeIn).
- [x] Validate responsive breakpoints: bottom nav on mobile, compact sidebar on tablet, full sidebar + right panel on desktop.
- [x] _Git Commit: `style: achieve full mobile-first responsive layout with custom design and animations`_

## Phase 7: Seed Data & Bonus Features
- [x] Choose **at least one** bonus feature:
  - **Docker Compose:** Setup a `docker-compose.yml` to spin up PostgreSQL, backend, and frontend with a single command.
- [x] Implement chosen bonus features with corresponding tests.
- [x] Write database seed script generating: 10 realistic users, cross-follows, tweets, and cross-likes.
- [x] _Git Commit: `feat(bonus): implement complete docker-compose stack and realistic database seed script`_

## Phase 8: Documentation, Verification & Runbook
- [ ] Create `README.md` with stack justification, architecture decisions, custom auth flow, AI usage summary.
- [ ] Create `Runbook` (Setup & Operations).
- [ ] Execute clean install from scratch to verify the runbook works.
- [ ] _Git Commit: `docs: update README and finalize operational Runbook`_
