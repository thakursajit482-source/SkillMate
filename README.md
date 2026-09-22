# SkillMate

> A verified cross-college student skill-sharing, task collaboration, and peer marketplace focused on the Mumbai Metropolitan Region (MMR).

[![Build & Test](https://img.shields.io/badge/tests-159%20passed-brightgreen.svg)](#-testing)
[![NestJS](https://img.shields.io/badge/backend-NestJS%2010-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%205.22-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey.svg)](#-license)

---

## 🚀 Overview

**SkillMate** is a purpose-built web platform designed to connect college students across campus boundaries within the Mumbai Metropolitan Region (MMR). Students frequently need academic help, technical skills for projects or hackathons, design assistance, or localized tutoring, while other students nearby possess those exact competencies.

SkillMate bridges these campus silos through:
- **Verified Student Identities**: Institutional email verification and student ID validation ensure interactions occur exclusively among authentic peers.
- **Location & Campus Context**: Approximate locality clustering (Kandivali, Powai, Andheri, Bandra, etc.) facilitates nearby collaboration along common Mumbai transit corridors without exposing private addresses.
- **Flexible Collaboration Modes**:
  - **Paid Requests**: Micro-bounties with explicit budgets for structured tasks.
  - **Skill Exchange**: Direct mutual barter where students exchange complementary skills.
  - **Social & Study Help**: Group study sessions, project brainstorming, and peer assistance.
- **Behavioral Reputation**: Trust is established through two-way star ratings, objective completion metrics, behavioral tags, and peer skill endorsements decoupled from financial amounts.

---

## 🎯 Problem Statement

College students operate inside isolated campus bubbles:
1. **Campus Silos**: A computer science student at one college needing a UI/UX designer has no easy, trustworthy way to find a design student at an adjacent campus.
2. **Safety & Identity Risks**: Generalized freelance platforms or open social channels expose students to unverified strangers, scams, and spam.
3. **Geographic Friction**: In vast urban areas like Mumbai, connecting with someone across town is impractical; students need collaborators who study or reside within feasible transit reach.
4. **All-or-Nothing Monetization**: Existing gig platforms require payment gateways and heavy platform cuts, making casual skill barter or low-friction academic exchanges impossible.

---

## 💡 Solution

SkillMate introduces a closed, verified, and structured student-to-student lifecycle:

```
Student Registration & College Verification
                    ↓
Profile Setup (Skills, Levels, Availability Windows, Area)
                    ↓
Discovery & Search (Keyword, Filters, or AI Natural-Language Query)
                    ↓
Matching Engine (Deterministic Discovery or 7-Factor Hybrid AI Matching)
                    ↓
Collaboration Request / Targeted Request (Paid, Skill Exchange, or Social)
                    ↓
Offer Submission & Counter-Terms Negotiation
                    ↓
Offer Acceptance & Atomic Task Generation
                    ↓
Scoped 1:1 Real-Time Chat & Collaboration Coordination
                    ↓
Mutual Task Completion Confirmation
                    ↓
Two-Way Behavioral Rating, Tags & Peer Skill Endorsement
```

---

## ✨ Key Features

| Feature Area | Implementation Summary |
|---|---|
| **Authentication** | Secure JWT-based access tokens with bcrypt password hashing. Provides `/auth/register`, `/auth/login`, and `/auth/me` endpoints with safe user sanitization. |
| **Student Profiles** | Public and private profile management. Tracks bio, hourly rates, profile completeness score, skills, and weekly availability schedules. |
| **College Verification** | Multi-path verification: instant verification via institutional email domain match (`@tcetmumbai.in`, etc.) or manual admin document review (`PENDING` queue with document reference). |
| **Skill Taxonomy** | Standardized, searchable directory of skills categorized into Engineering, Design, Academics, Sports, and more. Profiles link skills with proficiency levels (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`). |
| **Availability Windows** | Recurring weekly slots (`dayOfWeek`, `startTime`, `endTime`) or date-specific calendar windows to prevent scheduling conflicts. |
| **Student Discovery** | Deterministic multi-factor peer search scoring candidates on skill match (+40), proficiency (+5/+10), availability overlap (+25), proximity band (+5 to +20), verification (+10), and completeness (+5). |
| **Location-Aware Matching** | Centroid-based locality proximity calculation using the Haversine formula across 20 MMR localities. Ranks peers into coarse distance bands. |
| **Typed Requests** | Support for `PAID` (with budget), `SKILL_EXCHANGE` (with offered and desired skill), and `SOCIAL` (with activity tag) requests. Supports open broadcast or direct targeted requests. |
| **Offers & Counter-Terms** | Verified students can submit offers on open requests with optional custom messages and counter-terms (counter-rate, proposed time, notes). |
| **Task Lifecycle** | Agreed collaborations transition to formal `Task` entities: `PENDING` $\to$ `ACCEPTED` $\to$ `IN_PROGRESS` $\to$ `COMPLETED` (via mutual confirmation) or `CANCELLED` with mandatory reason tracking. |
| **Real-Time 1:1 Chat** | Socket.IO WebSocket gateway (`/chat`) paired with durable REST message persistence. Strictly unlocked only when an active Request, Offer, or Task relationship exists between users. |
| **Ratings & Reputation** | Two-way post-task evaluations: 1–5 stars and behavioral tags (`punctual`, `skilled`, `great communicator`). Generates transparent metrics: completion rate, rating average, and repeat collaborators count. |
| **Peer Skill Endorsements** | Students who have completed collaborations can endorse specific partner skills, earning them verified skill badges (`isVerifiedSkill: true`). |
| **Safety, Blocking & Reports** | Unilateral, silent blocking completely isolates users across discovery, chat, and requests. Anonymous safety reporting flags bad actors into moderation queues. |
| **AI Query Understanding** | Parses raw, natural language prompts into structured criteria (skills, intent, days, times, interaction types, and academic context). |
| **Semantic Vector Matching** | Text vector embeddings and cosine similarity to surface conceptually relevant candidates even with disparate vocabulary. |
| **Hybrid AI Ranking** | Blends semantic similarity with deterministic constraints, availability, distance, verification, completeness, and reputation. |
| **Explainable AI Matching** | Human-readable match reasons and a 7-factor modal breakdown showing why each candidate was recommended. |
| **Notification Infrastructure** | Prisma `Notification` database model provisioned with read-tracking support for platform events. |
| **Responsive Web UI** | Modern, responsive React interface styled with Tailwind CSS, featuring desktop and mobile navigation, interactive modals, badge indicators, and an inbuilt GuideBot assistant. |

---

## 🤖 AI Matching System

SkillMate features an intelligent, multi-layered matching engine designed to interpret free-form student needs and rank candidate peers transparently.

```
                  Student Natural Language Query
                                ↓
                 Stage 7A: AI Query Understanding
             (Gemini 1.5 Flash / Rule-Based Fallback)
                                ↓
        Structured Requirements (Skills, Day, Time, Intent)
                                ↓
                  Hard Business & Safety Filters
        (Active Status, Mutual Block Filter, Self-Exclusion)
                                ↓
                    Stage 7B: Vector Embeddings
         (text-embedding-004 / 64-Dim Local Semantic Clusters)
                                ↓
                Stage 7C: Hybrid Multi-Factor Scoring
         (7 Weighted Factors Normalized to 0–100 Final Score)
                                ↓
                Ranked Matches & Explainable Reasons
           (Interactive "Why This Match?" Factor Breakdown)
```

### 1. Natural-Language Query Parsing (Stage 7A)
- **Primary Engine**: Google Gemini API via `gemini-1.5-flash` with structured JSON output enforcement (`temperature: 0.1`).
- **Extracted Fields**:
  - `skills`: Normalized skill array (e.g., `["Python", "Machine Learning"]`)
  - `intent`: Primary purpose (`PROJECT_HELP`, `TUTORING`, `SKILL_EXCHANGE`, `EXAM_PREP`, `ASSIGNMENT_HELP`, `GENERAL_HELP`)
  - `day`: Target day (e.g., `tomorrow`, `friday`, `weekend`)
  - `timeRange`: Overlap window (e.g., `18:00-21:00`, `evening`)
  - `locationPreference`: `NEARBY`, `ON_CAMPUS`, `REMOTE`, or specific MMR locality
  - `interactionType`: `PAID`, `SKILL_EXCHANGE`, or `SOCIAL`
  - `skillLevel`: `BEGINNER`, `INTERMEDIATE`, or `ADVANCED`
  - `context`: Academic or hackathon context (e.g., `capstone`, `exam`)
- **Deterministic Fallback**: Built-in `RuleFallbackProvider` using token analysis and regex matching if API keys are absent or rate-limited.

### 2. Semantic Embeddings & Cosine Similarity (Stage 7B)
- **Primary Embedding**: Google `text-embedding-004` (768 dimensions).
- **Offline / Local Fallback**: `LocalSemanticEmbeddingProvider` (64 dimensions) using domain-specific semantic cluster activations (ML, Python, React, Node, SQL, DSA, Flutter, UI/UX, Multimedia, Mathematics) combined with token hashing and L2 normalization.
- **Cache & Persistence**: Embeddings are persisted in the PostgreSQL `embeddings` table (`Embedding` model) to avoid redundant API computation.
- **Similarity Metric**: Standard vector cosine similarity:
  $$\text{Cosine Similarity} = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$$

### 3. Hard Constraints & Safety Enforcement
Before scoring, candidates must satisfy mandatory rules:
- User must be in `ACTIVE` status (suspended users excluded).
- Requesting user is strictly excluded from own results.
- Users who have blocked the searcher, or whom the searcher has blocked, are pruned from the candidate pool.
- Optional hard filters: `hardFilterSkills` and `hardFilterAvailability`.

### 4. Hybrid Multi-Factor Scoring (Stage 7C)
The system calculates a normalized score ($0.0 \text{ to } 1.0$) across seven discrete dimensions, combined using verified backend weights:

| Dimension | Default Weight | Description |
|---|:---:|---|
| **Semantic Relevance** | **40% (`0.40`)** | Cosine similarity between query embedding and student profile vector representation. |
| **Skill Match & Level** | **20% (`0.20`)** | Exact and partial skill overlaps, boosted for `ADVANCED` (+0.2) or `INTERMEDIATE` (+0.1) proficiency. |
| **Availability Overlap** | **15% (`0.15`)** | Day-of-week match and time-window overlap between candidate and query. |
| **Location Proximity** | **10% (`0.10`)** | Centroid distance band between searcher's area and candidate's area (1.0 for same area, 0.8 for $\le 2$ km, down to 0.1 for 20+ km). |
| **College Verification** | **5% (`0.05`)** | Binary boost (1.0) for students with `VERIFIED` college status. |
| **Profile Completeness** | **5% (`0.05`)** | Linear scaling ($0.0 \text{ to } 1.0$) based on profile completeness percentage. |
| **Reputation & History** | **5% (`0.05`)** | Harmonic combination of average star rating and volume of completed tasks. |

$$\text{Final Score} = \left(\frac{\sum_{i=1}^{7} w_i \cdot s_i}{\sum_{i=1}^{7} w_i}\right) \times 100$$

### 5. Transparent Explainability (Stage 7D)
Every candidate result includes an array of contextual `matchReasons` (e.g., *"Strong semantic match with your project requirements"*, *"College verified student (IIT Bombay)"*, *"Available Monday evening"*, *"Located in same area (Kandivali)"*). The frontend renders an interactive **Why This Match?** modal with the complete 7-factor progress bar breakdown.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client Layer
        UI["React 18 + Vite Frontend"]
        Router["React Router DOM"]
        State["Context (Auth)"]
        SocketClient["Socket.IO Client"]
    end

    subgraph API & Gateway Layer
        NestApp["NestJS Modular Monolith API"]
        GlobalPipes["ValidationPipe (class-validator)"]
        AuthGuards["JwtAuthGuard & RolesGuard"]
        ChatGateway["Socket.IO Gateway (/chat)"]
        Swagger["Swagger Documentation (/api/docs)"]
    end

    subgraph Business Logic Modules
        AuthMod["Auth & Users Module"]
        CollegeMod["Colleges & Verification Module"]
        ProfileMod["Profiles & Skills Module"]
        DiscoveryMod["Discovery & Proximity Module"]
        RequestMod["Requests & Offers Module"]
        TaskMod["Tasks Lifecycle Module"]
        RepMod["Reputation & Safety Module"]
        AiMod["AI Intelligence Module"]
    end

    subgraph AI & Intelligence Engine
        GeminiFlash["Google Gemini 1.5 Flash (Query Parser)"]
        RuleFallback["RuleFallbackProvider (Regex/Heuristic)"]
        GeminiEmbed["text-embedding-004 (768-dim)"]
        LocalEmbed["LocalSemanticEmbeddingProvider (64-dim)"]
        HybridEngine["HybridMultiFactorRanking Engine"]
    end

    subgraph Data & Storage Layer
        Prisma["Prisma ORM 5.22"]
        Postgres[("PostgreSQL / Neon Database")]
    end

    UI -->|"HTTP REST Requests"| NestApp
    SocketClient <-->|"WebSocket Events"| ChatGateway
    NestApp --> GlobalPipes --> AuthGuards
    AuthGuards --> BusinessLogicModules

    AiMod --> GeminiFlash
    AiMod --> RuleFallback
    AiMod --> GeminiEmbed
    AiMod --> LocalEmbed
    AiMod --> HybridEngine

    BusinessLogicModules --> Prisma
    Prisma --> Postgres
```

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React | `^18.3.1` | Declarative component UI library |
| **Language (Frontend)** | TypeScript | `~5.6.2` | Type-safe client-side application logic |
| **Bundler & Dev Server** | Vite | `^5.4.11` | Rapid hot module replacement and optimized production builds |
| **Styling** | Tailwind CSS | `^3.4.17` | Utility-first responsive design and styling |
| **Routing** | React Router DOM | `^6.28.2` | Client-side routing, navigation guards, and protected layouts |
| **HTTP Client** | Axios | `^1.7.9` | Promise-based HTTP client for backend REST communication |
| **Real-Time Client** | Socket.IO Client | `^4.8.1` | Bidirectional event-driven communication for live chat |
| **Icons** | Lucide React | `^0.475.0` | Accessible and consistent iconography |
| **Backend Framework** | NestJS | `^10.4.15` | Enterprise TypeScript progressive backend architecture |
| **Language (Backend)** | TypeScript | `^5.7.2` | Strongly typed domain entities, DTOs, and services |
| **ORM** | Prisma | `^5.22.0` | Next-generation schema modeling, migrations, and queries |
| **Database** | PostgreSQL | `v14+` / Neon | Relational persistence with UUID primary keys and indexing |
| **Authentication** | Passport & JWT | `^10.2.0` | Stateless token validation and claims extraction |
| **Password Hashing** | bcrypt | `^5.1.1` | Salted credential encryption |
| **Validation** | class-validator & class-transformer | `^0.14.1` | Declarative runtime DTO payload validation |
| **Real-Time Server** | Socket.IO / `@nestjs/platform-socket.io` | `^4.8.1` | WebSocket gateway for low-latency thread messaging |
| **API Documentation** | Swagger (`@nestjs/swagger`) | `^7.4.2` | Auto-generated OpenAPI v3 interactive documentation |
| **AI LLM** | Google Gemini 1.5 Flash | `v1beta` | Natural language query parsing and parameter extraction |
| **AI Embeddings** | Google text-embedding-004 | `v1beta` | 768-dimensional dense vector embeddings |
| **Local AI Fallback** | Local Cluster Embeddings | Internal | 64-dimensional offline semantic vector representation |
| **Unit Testing** | Jest & ts-jest | `^29.7.0` | Automated unit and service test runner |
| **Frontend Testing** | Node.js Test Runner (`tsx`) | `Native` | Integration tests for AI matching contracts |

---

## 📁 Project Structure

```text
SkillMate/
├── backend/
│   ├── prisma/
│   │   ├── migrations/                 # PostgreSQL migration history
│   │   ├── schema.prisma               # 18 Prisma data models & enums
│   │   └── seed.ts                     # Database seed for MMR colleges & standard skills
│   ├── src/
│   │   ├── common/                     # Cross-cutting utilities, decorators & filters
│   │   │   ├── decorators/             # @CurrentUser, @Roles, @Public
│   │   │   ├── dto/                    # ApiResponseDto, ApiErrorResponseDto
│   │   │   ├── filters/                # GlobalHttpExceptionFilter
│   │   │   ├── guards/                 # JwtAuthGuard, RolesGuard
│   │   │   ├── interceptors/           # TransformInterceptor
│   │   │   └── utils/                  # LocationUtil (centroids, Haversine, privacy sanitizer)
│   │   ├── config/                     # Environment configuration schemas
│   │   ├── database/                   # PrismaModule & PrismaService
│   │   ├── modules/                    # Modular Monolith Domain Modules
│   │   │   ├── admin/                  # Admin moderation metadata & queues
│   │   │   ├── ai/                     # AI parsing, semantic vectors, and hybrid matching
│   │   │   │   ├── dto/                # ParseQueryDto, HybridMatchDto, etc.
│   │   │   │   ├── providers/          # Gemini, GeminiEmbedding, LocalSemantic, RuleFallback
│   │   │   │   ├── ai.controller.ts
│   │   │   │   ├── ai.service.ts
│   │   │   │   ├── hybrid-matching.service.ts
│   │   │   │   └── semantic-matching.service.ts
│   │   │   ├── auth/                   # Registration, login, JWT strategy
│   │   │   ├── availability/           # Student availability management
│   │   │   ├── chat/                   # 1:1 chat controller & Socket.IO gateway
│   │   │   ├── colleges/               # MMR college directory & autocomplete
│   │   │   ├── discovery/              # Nearby student & request discovery
│   │   │   ├── health/                 # Health check endpoints
│   │   │   ├── matching/               # Matching module integration
│   │   │   ├── notifications/          # Notification queue placeholders
│   │   │   ├── offers/                 # Offer creation, counter-terms & acceptance
│   │   │   ├── profiles/               # Student profile, skills & availability
│   │   │   ├── reputation/             # Ratings, behavioral tags & peer endorsements
│   │   │   ├── requests/               # Paid, skill exchange & social requests
│   │   │   ├── safety/                 # Silent blocking & safety reports
│   │   │   ├── skills/                 # Skill taxonomy directory
│   │   │   ├── tasks/                  # Task state machine & mutual completion
│   │   │   ├── users/                  # User account data & relationships
│   │   │   └── verification/           # Institutional email & document verification
│   │   ├── app.module.ts               # Root module registering all domains
│   │   └── main.ts                     # Bootstrap entry point, CORS, Swagger, pipes
│   ├── .env.example                    # Backend environment configuration template
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                        # Axios API client & typed endpoint functions
│   │   ├── components/                 # Reusable UI components
│   │   │   ├── AiCandidateCard.tsx     # Match card displaying score, tags & reasons
│   │   │   ├── Badges.tsx              # Verification & skill proficiency badges
│   │   │   ├── GuideBot.tsx            # In-app contextual onboarding guide
│   │   │   ├── Layout.tsx              # Core app shell with Navbar & Sidebar
│   │   │   ├── Modal.tsx               # Accessible dialog container
│   │   │   ├── Navbar.tsx              # Top navigation bar
│   │   │   ├── ProtectedRoute.tsx      # Route guard requiring auth/verification
│   │   │   ├── SearchableCollegeSelect.tsx # Autocomplete college selector
│   │   │   ├── SearchableSkillSelect.tsx   # Searchable multi-skill selector
│   │   │   ├── Sidebar.tsx             # Collapsible side navigation
│   │   │   └── WhyThisMatchModal.tsx   # 7-factor explainable score breakdown
│   │   ├── context/                    # AuthContext & session state
│   │   ├── pages/                      # 16 Application views
│   │   │   ├── AiMatchPage.tsx         # Natural language AI search interface
│   │   │   ├── ChatPage.tsx            # Split-pane 1:1 real-time messaging
│   │   │   ├── CollegeVerificationPage.tsx # Verification submission view
│   │   │   ├── CreateRequestPage.tsx   # Typed request creation form
│   │   │   ├── DashboardPage.tsx       # Student hub with active tasks & stats
│   │   │   ├── DiscoverRequestsPage.tsx # Browse open requests nearby
│   │   │   ├── DiscoverStudentsPage.tsx # Filter & explore student peers
│   │   │   ├── LandingPage.tsx         # Public marketing & feature overview
│   │   │   ├── LoginPage.tsx           # Authentication login
│   │   │   ├── MyRequestsPage.tsx      # Manage caller's outgoing requests
│   │   │   ├── OffersPage.tsx          # Manage received & sent offers
│   │   │   ├── ProfilePage.tsx         # Manage student bio & area
│   │   │   ├── PublicProfilePage.tsx   # Sanitized public view of any student
│   │   │   ├── RegisterPage.tsx        # New student account signup
│   │   │   ├── RequestDetailPage.tsx   # Request info & incoming offer list
│   │   │   ├── SettingsPage.tsx        # Blocked users & account settings
│   │   │   ├── SkillsAvailabilityPage.tsx # Manage skill levels & time slots
│   │   │   └── TaskDetailPage.tsx      # Task tracking, status updates & ratings
│   │   ├── types/                      # TypeScript definitions (User, Task, AI, etc.)
│   │   ├── App.tsx                     # Route hierarchy
│   │   └── main.tsx                    # React DOM entry point
│   ├── test/
│   │   └── ai-matching.test.ts         # Frontend integration tests for AI matching
│   ├── .env.example                    # Frontend environment configuration template
│   ├── .env.production                 # Production API URLs
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── docs/
│   └── backend-plan.md                 # Architecture plan and domain specifications
└── README.md
```

---

## 🔐 Security & Privacy

SkillMate implements rigorous safety controls tailored to a student community:

- **Stateless JWT Authentication**: Passwords hashed with `bcrypt` (10 rounds). Tokens verified via `JwtAuthGuard` and Passport JWT strategy.
- **Role-Based Access Control (RBAC)**: Strict separation via `RolesGuard` protecting administrative endpoints (`UserRole.ADMIN` vs `UserRole.STUDENT`).
- **Input Validation & Sanitization**: Global `ValidationPipe` running with `whitelist: true`, `forbidNonWhitelisted: true`, and automatic type coercion via `class-transformer`.
- **CORS Protection**: Explicit origin whitelisting supporting local environments and the production Vercel frontend (`https://skill-mate-seven.vercel.app`) with `credentials: true`. Wildcards with credentials are strictly forbidden.
- **Mutual Silent Blocking**: The `Block` entity inspects both blocker and blocked directions (`blockerId` and `blockedId`). When User A blocks User B:
  - Neither user appears in the other's discovery feeds or AI search results.
  - Direct request creation and offer submissions are blocked with `403 Forbidden`.
  - Chat thread creation is immediately rejected.
  - The blocked party receives no notification or alert of being blocked.
- **Account Suspension**: Suspended accounts (`UserStatus.SUSPENDED`) are filtered out of all query results and blocked from authenticating.
- **Relationship-Scoped Chat Authorization**: Students cannot arbitrarily direct-message anyone. Chat threads can only be initiated if an active collaboration relationship (an accepted offer, a valid request, or an ongoing task) exists.
- **WebSocket Handshake Validation**: The Socket.IO `/chat` gateway validates JWT bearer tokens during the initial connection handshake.

---

## 📍 Location Privacy

SkillMate follows a strict architectural guarantee: **"Approximate, never exact. Location privacy is a hard constraint, not a setting."**

1. **Zero Exact GPS Exposure**: The database never stores precise GPS coordinates, home addresses, or room numbers.
2. **Centroid Bucket Fuzzing**: The system maintains predefined centroid coordinates for 20 MMR localities (e.g., *Kandivali, Borivali, Malad, Goregaon, Andheri, Bandra, Powai, Dadar, Thane, Vashi*). Coordinates are fuzzed to 3 decimal places (~100-meter resolution).
3. **Haversine Distance Calculation**: Great-circle distance is computed between locality centroids using the Haversine formula:
   $$d = 2R \arcsin \left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
4. **Banded Distance Presentation**: Distance is never displayed as raw floating-point kilometers. The frontend and public APIs expose only qualitative distance bands:
   - `Same area`
   - `~2 km away`
   - `2–5 km away`
   - `5–10 km away`
   - `10–20 km away`
   - `20+ km away`
5. **Profile Sanitization**: The `sanitizePublicProfile()` utility strips phone numbers, email addresses, uploaded ID card documents, and coordinate buckets prior to returning any profile to another student.

---

## 🔄 Core User Flow

A complete collaboration on SkillMate follows this verified sequence:

1. **Sign Up**: A student registers with their name, email, phone, and password at `/register`.
2. **Setup Profile**: The student configures their bio, primary MMR locality, and optional hourly rate.
3. **Declare Skills**: The student selects skills from the taxonomy directory (e.g., *Python, Flutter, Figma, DSA*) with their proficiency level.
4. **Set Availability**: The student designates weekly recurring availability slots (e.g., *Monday 18:00–21:00*).
5. **Verify College**:
   - Fast-path: Submitting an approved college email instantly awards `VERIFIED` status.
   - Document path: Uploading a student ID card moves the record to `PENDING` for admin approval.
6. **Discover / Search**:
   - Browse nearby peers on `/discover/students` using skill, area, and day filters.
   - Or type a natural language prompt on `/match` (e.g., *"Need someone for Machine Learning and Python project tomorrow evening"*).
7. **Initiate Request**:
   - The requester creates a `PAID`, `SKILL_EXCHANGE`, or `SOCIAL` request on `/requests/new`.
8. **Receive & Review Offers**:
   - Other verified students browse open requests and submit offers with proposed terms.
9. **Accept Offer**:
   - The requester reviews offers on `/requests/:id` and clicks **Accept Offer**.
   - Competing offers are declined, the request transitions to `MATCHED`, and a collaboration `Task` is generated.
10. **Coordinate via Chat**:
    - Both students enter the dedicated 1:1 chat room (`/chat`) to share project files, discuss deadlines, and coordinate.
11. **Complete Task**:
    - Once the deliverable is finished, both students click **Mark Complete**. Mutual confirmation transitions the task to `COMPLETED` and closes the request.
12. **Build Reputation**:
    - Both students rate each other (1–5 stars) and assign behavioral tags.
    - Students can officially endorse each other's specific skills, helping them earn the verified skill badge.

---

## 🧠 API Overview

All API routes are prefixed with `/api/v1`. Protected endpoints require an `Authorization: Bearer <token>` header.

### Authentication
- `POST /api/v1/auth/register` (alias `/auth/signup`) — Register student account *(Public)*
- `POST /api/v1/auth/login` — Authenticate and receive JWT access token *(Public)*
- `GET /api/v1/auth/me` — Retrieve current authenticated student identity *(Bearer Token)*

### Users & Account
- `GET /api/v1/users/me` — Retrieve current user account details and verification summary *(Bearer Token)*
- `GET /api/v1/users/blocked` — List users currently blocked by the caller *(Bearer Token)*
- `POST /api/v1/users/:id/block` — Block a student by user ID *(Bearer Token)*
- `DELETE /api/v1/users/:id/block` — Unblock a student *(Bearer Token)*
- `GET /api/v1/users/:userId/ratings` — Get paginated ratings received by a student *(Bearer Token)*
- `GET /api/v1/users/:userId/reputation` — Get aggregated behavioral reputation summary *(Bearer Token)*
- `GET /api/v1/users/:userId/endorsements` — List peer skill endorsements received by a student *(Bearer Token)*

### Profiles
- `GET /api/v1/profile/me` — Get caller's own full profile with completeness score *(Bearer Token)*
- `PATCH /api/v1/profile/me` (or `PUT`) — Update bio, approximate area, or hourly rate *(Bearer Token)*
- `GET /api/v1/profile/:id` — View sanitized public profile of any student *(Bearer Token)*
- `POST /api/v1/profile/me/skills` — Add a skill to caller profile *(Bearer Token)*
- `DELETE /api/v1/profile/me/skills/:id` — Remove a skill from profile *(Bearer Token)*
- `POST /api/v1/profile/me/availability` — Add an availability time slot *(Bearer Token)*
- `DELETE /api/v1/profile/me/availability/:id` — Remove an availability slot *(Bearer Token)*

### Colleges & Verification
- `GET /api/v1/colleges` — List/search MMR colleges by query string *(Public)*
- `GET /api/v1/colleges/:id` — Get single college details *(Public)*
- `POST /api/v1/verification` — Submit college verification (email or ID document) *(Bearer Token)*
- `GET /api/v1/verification/me` (alias `/verification/status`) — Get own verification status *(Bearer Token)*
- `GET /api/v1/verification/admin/pending` — List pending verifications for admin review *(Admin Role)*
- `PATCH /api/v1/verification/:id/review` — Approve or reject verification *(Admin Role)*

### Skills Directory
- `GET /api/v1/skills` — Search and paginate standardized skill taxonomy *(Public)*
- `GET /api/v1/skills/categories` — List all unique skill categories *(Public)*
- `GET /api/v1/skills/:id` — Get skill details by ID *(Public)*

### Student & Request Discovery
- `GET /api/v1/discovery/students` — Discover nearby students with multi-factor ranking *(Bearer Token)*
- `GET /api/v1/discovery/requests` — Discover open collaboration requests filtered by skill and area *(Bearer Token)*

### Requests
- `POST /api/v1/requests` — Create a new `PAID`, `SKILL_EXCHANGE`, or `SOCIAL` request *(Verified Student)*
- `GET /api/v1/requests` — Browse and filter requests by direction, status, type, or area *(Bearer Token)*
- `GET /api/v1/requests/mine` — List outgoing requests created by current user *(Bearer Token)*
- `GET /api/v1/requests/:id` — Get request details (includes offers for owner) *(Bearer Token)*
- `PUT /api/v1/requests/:id` — Edit an open request *(Request Owner)*
- `POST /api/v1/requests/:id/accept` — Accept request directly and initiate task *(Bearer Token)*
- `POST /api/v1/requests/:id/close` — Close an open request *(Request Owner)*
- `POST /api/v1/requests/:id/cancel` — Cancel request with reason *(Request Owner)*

### Offers
- `POST /api/v1/requests/:requestId/offers` — Submit an offer with optional counter-terms *(Verified Student)*
- `GET /api/v1/requests/:requestId/offers` — List all offers received on a request *(Request Owner)*
- `GET /api/v1/offers/mine` — List all offers submitted by the caller *(Bearer Token)*
- `GET /api/v1/offers/:id` — Get offer details *(Offering Student or Request Owner)*
- `POST /api/v1/offers/:id/accept` — Accept offer, transition request, and create task *(Request Owner)*
- `POST /api/v1/offers/:id/decline` — Decline an offer *(Request Owner)*
- `POST /api/v1/offers/:id/withdraw` — Withdraw own pending offer *(Offering Student)*

### Tasks Lifecycle
- `GET /api/v1/tasks` (alias `/tasks/mine`) — List active and past tasks filtered by role and status *(Bearer Token)*
- `GET /api/v1/tasks/:id` — Get task details and agreed terms *(Task Participant)*
- `POST /api/v1/tasks/:id/status` (and `PATCH`) — Advance task status (`ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) *(Task Participant)*

### Chat & Messaging
- `POST /api/v1/chat/threads` — Access or create 1:1 chat thread scoped to collaboration *(Bearer Token)*
- `GET /api/v1/chat/threads` — List caller's active chat conversations and unread counts *(Bearer Token)*
- `GET /api/v1/chat/threads/:id` — Get chat thread details *(Thread Participant)*
- `POST /api/v1/chat/threads/:threadId/messages` — Send message via HTTP REST *(Thread Participant)*
- `GET /api/v1/chat/threads/:threadId/messages` — Retrieve paginated chat history and mark as read *(Thread Participant)*
- `WebSocket /chat` — Live gateway supporting `joinThread`, `leaveThread`, `sendMessage`, and `messageRead`

### Reputation & Endorsements
- `POST /api/v1/tasks/:taskId/rating` — Submit 1–5 star rating and behavioral tags *(Completed Task Participant)*
- `POST /api/v1/endorsements` — Endorse a peer's skill based on completed collaboration *(Bearer Token)*

### Safety & Recourse
- `POST /api/v1/blocks` — Block user via request body *(Bearer Token)*
- `DELETE /api/v1/blocks/:userId` — Unblock user *(Bearer Token)*
- `POST /api/v1/reports` — File confidential safety report against a user or task *(Bearer Token)*
- `GET /api/v1/reports/mine` — List reports filed by the caller *(Bearer Token)*

### System Health
- `GET /api/v1/health` — Service and database connectivity health check *(Public)*

---

## 🤖 AI API

SkillMate provides dedicated AI endpoints for smart query processing and matching:

### 1. Parse Natural Language Query
```http
POST /api/v1/ai/parse-query
Content-Type: application/json
```
```json
{
  "query": "Need someone who knows Python and ML for my project tomorrow evening, preferably nearby."
}
```
**Response (`200 OK`):**
```json
{
  "skills": ["Python", "Machine Learning"],
  "intent": "PROJECT_HELP",
  "day": "tomorrow",
  "timeRange": "18:00-21:00",
  "locationPreference": "NEARBY",
  "interactionType": null,
  "skillLevel": null,
  "context": "project"
}
```

### 2. Semantic Vector Match
```http
POST /api/v1/ai/semantic-match
Content-Type: application/json
```
```json
{
  "query": "Machine learning and Python data modeling",
  "limit": 10,
  "threshold": 0.5
}
```
**Response (`200 OK`):** Ranked array of candidate profiles with vector cosine similarity scores.

### 3. Hybrid Multi-Factor Match
```http
POST /api/v1/ai/match
Content-Type: application/json
```
```json
{
  "query": "Looking for a verified React developer in Bandra for weekend hackathon",
  "area": "Bandra",
  "limit": 10,
  "hardFilterSkills": false,
  "hardFilterAvailability": false,
  "weights": {
    "semantic": 0.4,
    "skill": 0.2,
    "availability": 0.15,
    "location": 0.1,
    "verification": 0.05,
    "profile": 0.05,
    "reputation": 0.05
  }
}
```
**Response (`200 OK`):**
```json
{
  "data": [
    {
      "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "profileId": "7ca85f64-5717-4562-b3fc-2c963f66afa7",
      "finalScore": 92.45,
      "scoreBreakdown": {
        "semanticScore": 0.95,
        "skillScore": 0.88,
        "availabilityScore": 1.0,
        "locationScore": 1.0,
        "verificationScore": 1.0,
        "profileScore": 0.9,
        "reputationScore": 0.96
      },
      "matchedSkills": ["React", "TypeScript"],
      "matchReasons": [
        "Strong semantic match with your project requirements",
        "Has requested skill: React (Advanced)",
        "Available during requested time window",
        "Located in same area: Bandra",
        "College verified student (Thadomal Shahani Engineering College)"
      ],
      "candidate": {
        "name": "Aarav Sharma",
        "approximateArea": "Bandra",
        "collegeName": "Thadomal Shahani Engineering College",
        "isVerified": true,
        "bio": "Frontend developer specializing in React and component architecture",
        "skills": [
          { "name": "React", "level": "ADVANCED", "isVerifiedSkill": true }
        ]
      }
    }
  ],
  "meta": {
    "query": "Looking for a verified React developer in Bandra for weekend hackathon",
    "totalCandidatesEvaluated": 15,
    "returnedCount": 1
  }
}
```

---

## 🗄️ Database

SkillMate uses **PostgreSQL** managed through **Prisma ORM 5.22**. The database schema contains **18 models**:

| Model | Purpose |
|---|---|
| `User` | Core account entity storing name, email, phone, role (`STUDENT`, `ADMIN`), and status (`ACTIVE`, `SUSPENDED`). |
| `College` | Master directory of Mumbai Metropolitan Region colleges with approved institutional email domains. |
| `CollegeVerification` | Student college verification records tracking status (`UNVERIFIED`, `PENDING`, `VERIFIED`, `REJECTED`), department, year, and reviewer ID. |
| `Profile` | Extended student profile holding bio, hourly rate, completeness score, and approximate locality centroid buckets. |
| `Skill` | Standardized skill taxonomy definitions categorized by domain. |
| `ProfileSkill` | Join entity associating profiles with skills, tracking proficiency levels (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`) and endorsement verification. |
| `Availability` | Recurring weekly or date-specific availability windows for students. |
| `Request` | Structured collaboration requests (`PAID`, `SKILL_EXCHANGE`, `SOCIAL`) with budget, tags, and status lifecycle. |
| `Offer` | Proposals submitted on open requests with messages and optional counter-terms. |
| `Task` | Formal agreed collaborations tracking mutual completion status, cancel reasons, and agreed terms. |
| `ChatThread` | 1:1 conversation channels scoped strictly to active request/offer/task relationships between two participants. |
| `Message` | Individual chat messages with delivery timestamps, read timestamps, and sender linkage. |
| `Rating` | Two-way post-task evaluations containing 1–5 numerical scores and behavioral tag arrays. |
| `Endorsement` | Peer skill endorsements recorded between students following completed collaborations. |
| `Report` | Anonymous moderation tickets submitted against bad actors or problematic tasks. |
| `Block` | Unilateral silent blocking pairs isolating users across all system features. |
| `Notification` | System notifications tracking user alerts, event payloads, and read states. |
| `Embedding` | Persistent cache of 768-dim vector embeddings for queries and student representations. |

---

## 🧪 Testing

The codebase includes automated test suites covering backend services and frontend integration contracts.

### Backend Test Suite (Jest)
- **Framework**: Jest `29.7.0` with `ts-jest`
- **Coverage**: **14 test suites**, **151 total tests passed**
- **Tested Modules**:
  - `ai.service.spec.ts` — Query parsing and normalization
  - `hybrid-matching.service.spec.ts` — 7-factor scoring, weighting, and constraint filtering
  - `semantic-matching.service.spec.ts` — Embedding generation and cosine similarity
  - `auth.service.spec.ts` — Registration, login, password hashing, and token issuance
  - `verification.service.spec.ts` — Email domain fast-path and admin approval flows
  - `profiles.service.spec.ts` — Privacy sanitization, profile completeness, and skills
  - `skills.service.spec.ts` — Taxonomy querying and category resolution
  - `discovery.service.spec.ts` — Deterministic ranking and proximity calculations
  - `requests.service.spec.ts` — Request validation, state changes, and permissions
  - `offers.service.spec.ts` — Offer creation, counter-terms, and atomic acceptance
  - `tasks.service.spec.ts` — Task transitions and mutual completion logic
  - `chat.service.spec.ts` — Relationship authorization, blocking enforcement, and read receipts
  - `reputation.service.spec.ts` — Star rating calculations, tags, and skill endorsements
  - `safety.service.spec.ts` — Unilateral blocking and anonymous report filing

```bash
cd backend
npm test
```

### Frontend Test Suite (Node.js Test Runner)
- **Framework**: Node.js native test runner via `npx tsx`
- **Coverage**: **1 test suite**, **8 total tests passed**
- **Tested Contracts**:
  - Search request and response parsing matching backend contract
  - Score preservation (displaying backend `finalScore` without recalculation)
  - Candidate profile rendering with exact explainable match reasons
  - Safe navigation link generation (`/profile/:id`)
  - Strict privacy enforcement (zero exposure of email, phone, passwords, or coordinates)
  - 7-factor breakdown rendering in `WhyThisMatchModal`
  - Empty search state handling without mock fabrication
  - Graceful error boundary messages

```bash
cd frontend
npm test
```

---

## ▶️ Local Development

Follow these steps to run SkillMate locally:

### Prerequisites
- **Node.js**: v18+ (tested on Node v20 / v22)
- **npm**: v9+
- **PostgreSQL**: v14+ (local instance or cloud database like Neon / Supabase)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd SkillMate
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Configure your environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your PostgreSQL database URL and JWT secrets:
```env
PORT=3000
API_PREFIX=api/v1
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skillmate_db?schema=public
JWT_SECRET=super-secret-jwt-key-for-local-dev
FRONTEND_URL=http://localhost:5173

# Optional: Google Gemini API Key for live AI query parsing & embeddings
# If omitted, SkillMate automatically falls back to deterministic rules and local embeddings
GEMINI_API_KEY=your-gemini-api-key-here
```

Generate Prisma client and run migrations:
```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

Start the NestJS development server:
```bash
npm run start:dev
```
The backend will be live at `http://localhost:3000/api/v1`.

### 3. Frontend Setup
Open a second terminal window:
```bash
cd frontend
npm install
```

Configure the local frontend environment:
```bash
cp .env.example .env
```
Ensure `.env` points to the local backend:
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

Start the Vite development server:
```bash
npm run dev
```
The frontend application will be live at `http://localhost:5173`.

---

## 🌐 Production Deployment

SkillMate is configured and deployed across cloud providers:

| Component | Platform | URL / Configuration |
|---|---|---|
| **Frontend Web App** | **Vercel** | [https://skill-mate-seven.vercel.app](https://skill-mate-seven.vercel.app) |
| **Backend API Service** | **Render** | [https://skillmate-r0v6.onrender.com](https://skillmate-r0v6.onrender.com) |
| **Database** | **Neon** | Serverless PostgreSQL instance |

- **Production Build Script**: Backend runs via `node dist/src/main` (configured via `npm run start:prod`).
- **Production CORS**: Configured to explicitly permit incoming authenticated requests from `https://skill-mate-seven.vercel.app` with credentials support.
- **Environment Separation**: Public frontend variables (`VITE_API_URL`, `VITE_SOCKET_URL`) are isolated from backend secrets (`DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`).

---

## 📚 API Documentation

SkillMate comes with interactive OpenAPI documentation generated via Swagger.

When running the backend locally, visit:
```text
http://localhost:3000/api/docs
```
The Swagger UI provides:
- Complete interactive schema exploration for all DTOs and models
- Built-in JWT Bearer token authorization button for testing protected endpoints
- Organized endpoint groupings across Auth, Verification, Profiles, Discovery, Requests, Offers, Tasks, Chat, Reputation, Safety, and AI

---

## 🛣️ Roadmap

- [x] **Stage 1: Backend Foundation & Database** — Modular Monolith architecture, PostgreSQL database, and 18-model Prisma schema.
- [x] **Stage 2: Authentication, Profile & College Verification** — JWT authentication, institutional email fast-path, admin verification queue, and profile completeness score.
- [x] **Stage 3: Skills, Availability & Discovery** — Standardized skill taxonomy, weekly availability slots, and multi-factor deterministic discovery.
- [x] **Stage 4: Requests, Offers & Task Lifecycle** — Typed requests (Paid, Exchange, Social), counter-terms negotiation, atomic offer acceptance, and mutual completion state machine.
- [x] **Stage 5: Chat, Reputation & Safety** — Relationship-scoped 1:1 chat (Socket.IO + REST), behavioral ratings, peer skill endorsements, and unilateral silent blocking.
- [x] **Stage 6: Web Frontend & Backend Integration** — Complete React 18 + Tailwind CSS frontend with 16 pages, responsive layout, and GuideBot assistant.
- [x] **Stage 7: AI Matching & Intelligence** — Gemini 1.5 Flash natural-language query parsing, dense vector embeddings, 7-factor hybrid ranking engine, and explainable Why-Match modal.
- [x] **Stage 8: Production, Testing & Launch Audit** — 151 backend unit tests, 8 frontend integration tests, TypeScript type-check verification, and CORS audit.
- [x] **Stage 9: Deployment & Live Demo** — Frontend live on Vercel, backend live on Render, and database on Neon PostgreSQL.

---

## 👥 Team / Project Context

SkillMate was developed as a verified, campus-aware student collaboration network to empower college students across the Mumbai Metropolitan Region to share skills, find collaborators, and build proven peer reputation.

---

## 📄 License

This project currently has no open-source license specified (`UNLICENSED`). All rights reserved.

---

## 👨‍💻 Project Creator

**Sajit Thakur**  
BE Computer Science Engineering (AI/ML)

GitHub: [@thakursajit482-source](https://github.com/thakursajit482-source)

## 📄 Project Ownership

© 2026 Sajit Thakur. All rights reserved.

SkillMate is currently an unlicensed project. The source code is not granted open-source redistribution or commercial-use rights.
