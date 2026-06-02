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
- [ ] Create Database model for `Tweet`.
- [ ] Implement backend `/api/tweets` endpoints (create, delete, validation rules for <280 chars).
- [ ] Write unit & integration tests for tweet operations.
- [ ] Implement frontend components to write and delete tweets.
- [ ] _Git Commit: `feat(tweets): add tweet creation, deletion, and character validation with tests`_

## Phase 4: Social Graph & Interactions
- [ ] Create Database models for `Follow` and `Like`.
- [ ] Write backend endpoints: `/follow`, `/unfollow`, `/like`, `/unlike`.
- [ ] Write backend integration tests for interactions.
- [ ] Implement frontend elements: Follow/Unfollow button, Like button with counters, and lists of followers/following on the profile page.
- [ ] _Git Commit: `feat(social): add follow/unfollow and like/unlike systems with real-time UI counters and tests`_

## Phase 5: Timeline, Pagination & Search
- [ ] Implement Timeline query (tweets from self + followed users) on backend.
- [ ] Add pagination (offset-based or cursor-based) to backend timeline endpoint.
- [ ] Implement frontend Home timeline showing paginated tweets or infinite scroll.
- [ ] Implement user search backend endpoint (`GET /api/users/search?q=...`) and search bar in frontend.
- [ ] Write tests covering timeline pagination and user search.
- [ ] _Git Commit: `feat(timeline): implement paginated home timeline and search feature with tests`_

## Phase 6: Responsive Design & Premium CSS
- [ ] Implement mobile-first CSS rules for all layouts.
- [ ] Add dark mode support and sleek gradients (visual wow-factor).
- [ ] Add micro-animations (e.g., hover effects on buttons, smooth transitions for liking/following).
- [ ] Validate responsive breakpoints (< 640px, 640px-1024px, > 1024px).
- [ ] _Git Commit: `style: achieve full mobile-first responsive layout with custom design and animations`_

## Phase 7: Seed Data & Bonus Features
- [ ] Choose **at least one** bonus feature.
- [ ] Implement chosen bonus features with corresponding tests.
- [ ] Write database seed script generating: 10 realistic users, cross-follows, tweets, and cross-likes.
- [ ] _Git Commit: `feat(bonus): implement [chosen-feature] and database seed script`_

## Phase 8: Documentation, Verification & Runbook
- [ ] Create `README.md` with stack justification, architecture decisions, custom auth flow, AI usage summary.
- [ ] Create `Runbook` (Setup & Operations).
- [ ] Execute clean install from scratch to verify the runbook works.
- [ ] _Git Commit: `docs: update README and finalize operational Runbook`_
