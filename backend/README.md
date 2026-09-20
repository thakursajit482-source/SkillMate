# SkillMate — Backend (Modular Monolith)

Backend API service for **SkillMate**, a verified cross-college student network for the Mumbai Metropolitan Region (MMR). Built with Node.js, TypeScript, NestJS, and Prisma ORM.

---

## Requirements

- **Node.js:** v18+ (tested on Node v22 / v24)
- **npm:** v9+
- **PostgreSQL:** v14+ (optional for initial setup; required for running full migrations and persistence)

---

## Project Structure

```text
backend/
├── src/
│   ├── common/                       # Shared guards, decorators, filters, interceptors, utils
│   │   ├── decorators/               # @CurrentUser, @Roles, @Public
│   │   ├── dto/                      # Standard ApiResponseDto & ApiErrorResponseDto
│   │   ├── filters/                  # GlobalHttpExceptionFilter
│   │   ├── guards/                   # JwtAuthGuard, RolesGuard
│   │   ├── interceptors/             # TransformInterceptor
│   │   └── utils/                    # LocationUtil (centroid resolution, privacy sanitizer)
│   ├── config/                       # Configuration schemas
│   ├── database/                     # PrismaModule & PrismaService
│   ├── modules/                      # Modular Monolith Domain Modules
│   │   ├── auth/                     # Stage 2: Register, Login, JWT strategy, session token
│   │   ├── users/                    # Stage 2: Safe user account retrieval
│   │   ├── colleges/                 # Stage 2: MMR college directory & autocomplete
│   │   ├── verification/             # Stage 2: College verification submissions & admin review
│   │   ├── profiles/                 # Stage 2: Student profiles, privacy filtering, skills, availability
│   │   ├── health/                   # Service & DB health check
│   │   ├── skills/                   # Skill taxonomy placeholders
│   │   ├── availability/             # Availability placeholders
│   │   ├── discovery/                # Nearby peers & requests (Phase 3)
│   │   ├── requests/                 # Requests (Phase 3)
│   │   ├── offers/                   # Offers (Phase 3)
│   │   ├── matching/                 # Matching engine (Phase 3)
│   │   ├── tasks/                    # Task lifecycle (Phase 3)
│   │   ├── chat/                     # 1:1 real-time chat (Phase 3)
│   │   ├── reputation/               # Reputation & ratings (Phase 3)
│   │   ├── safety/                   # Reports & blocking (Phase 3)
│   │   └── notifications/            # Notification queues (Phase 3)
│   ├── app.module.ts                 # Root module
│   └── main.ts                       # Entry point, Swagger & global pipes
├── prisma/
│   ├── schema.prisma                 # Authoritative 17-entity database schema
│   ├── migrations/                   # Baseline migration history
│   └── seed.ts                       # Seed script for MMR colleges & skills
├── .env.example                      # Environment variables template
├── package.json
└── tsconfig.json
```

---

## Environment Variables

Configure `.env` using `.env.example`:

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | HTTP port | `3000` |
| `API_PREFIX` | Global route prefix | `api/v1` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/skillmate_db?schema=public` |
| `JWT_SECRET` | Primary JWT signing secret | Secure random string |
| `JWT_EXPIRES_IN` | Access token lifespan | `15m` |
| `JWT_ACCESS_SECRET` | Access token secret alias | Secure random string |
| `JWT_ACCESS_EXPIRATION` | Access token expiration alias | `15m` |
| `FRONTEND_URL` | Permitted CORS frontend origin | `http://localhost:5173` |
| `DEFAULT_SEARCH_RADIUS_KM` | Default discovery radius in MMR | `5` |
| `MAX_SEARCH_RADIUS_KM` | Maximum search radius in MMR | `25` |

---

## API Documentation & Stage 2 Usage

Interactive Swagger documentation is available at:
```text
http://localhost:3000/api/docs
```

All protected endpoints require an `Authorization` header:
```http
Authorization: Bearer <accessToken>
```

### 1. Authentication APIs

- **Register Student (`POST /api/v1/auth/register` or `POST /api/v1/auth/signup`)**
  ```json
  {
    "name": "Sajit Thakur",
    "email": "sajit@example.com",
    "password": "SecurePassword123",
    "phone": "+919876543210"
  }
  ```
  *Response:* Returns `201 Created` with `accessToken`, `tokenType: 'Bearer'`, and safe `user` profile (excluding `passwordHash`).

- **Login (`POST /api/v1/auth/login`)**
  ```json
  {
    "email": "sajit@example.com",
    "password": "SecurePassword123"
  }
  ```
  *Response:* Returns `200 OK` with fresh `accessToken` and user state.

- **Current User Identity (`GET /api/v1/auth/me`)**
  *Headers:* `Authorization: Bearer <token>`  
  *Response:* Current authenticated student identity and verification status badge.

### 2. User Account API

- **Get My Account (`GET /api/v1/users/me`)**
  *Headers:* `Authorization: Bearer <token>`  
  *Response:* Returns safe account details with college verification and profile summaries.

### 3. College Directory APIs

- **List / Search Colleges (`GET /api/v1/colleges?q=Thakur`)**
  *Access:* Public  
  *Response:* List of matching colleges in MMR with name, city, area, and approved email domains.

- **Get College by ID (`GET /api/v1/colleges/:id`)**
  *Access:* Public  
  *Response:* Single college record.

### 4. Student Profile APIs

- **Get Own Full Profile (`GET /api/v1/profile/me`)**
  *Headers:* `Authorization: Bearer <token>`  
  *Response:* Full own profile including skills, availability windows, completeness score (0–100), and college info.

- **Update Profile (`PATCH /api/v1/profile/me` or `PUT /api/v1/profile/me`)**
  ```json
  {
    "bio": "3rd year CS student passionate about Flutter and backend engineering.",
    "approximateArea": "Kandivali",
    "hourlyRate": 300
  }
  ```
  *Privacy Note:* The system resolves coarse centroid buckets internally for distance calculations but never exposes exact coordinates.

- **View Public Profile (`GET /api/v1/profile/:id`)**
  *Headers:* `Authorization: Bearer <token>`  
  *Privacy Enforcement:* Strictly returns only safe public fields (`name`, `photoUrl`, `bio`, `approximateArea`, `hourlyRate`, `college`, `department`, `yearOfStudy`, `verificationStatus`, `skills`, `availabilities`). Strips raw GPS/centroid coordinates, phone number, email address, and private documents.

- **Add Skill (`POST /api/v1/profile/me/skills`)**
  ```json
  {
    "name": "Flutter",
    "category": "Engineering",
    "level": "INTERMEDIATE"
  }
  ```

- **Remove Skill (`DELETE /api/v1/profile/me/skills/:id`)**

- **Add Availability Slot (`POST /api/v1/profile/me/availability`)**
  ```json
  {
    "dayOfWeek": 1,
    "startTime": "18:00",
    "endTime": "21:00",
    "isRecurring": true
  }
  ```

- **Remove Availability Slot (`DELETE /api/v1/profile/me/availability/:id`)**

### 5. College Verification APIs

- **Submit Verification (`POST /api/v1/verification`)**
  ```json
  {
    "collegeId": "<college-uuid>",
    "department": "Computer Engineering",
    "yearOfStudy": 3,
    "enrollmentId": "TCET/2023/CS/1042",
    "collegeEmail": "sajit@tcetmumbai.in",
    "idDocumentRef": "uploads/id-card.jpg"
  }
  ```
  *Domain Fast-Path:* If `collegeEmail` matches the college's approved domain list, status becomes `VERIFIED` immediately. Otherwise, it is marked `PENDING` for admin ID-card review.

- **Check Own Verification Status (`GET /api/v1/verification/me` or `/verification/status`)**
  *Headers:* `Authorization: Bearer <token>`

- **Admin Review Verification (`PATCH /api/v1/verification/:id/review`)**
  *Headers:* `Authorization: Bearer <adminToken>` (Requires `ADMIN` role)
  ```json
  {
    "status": "VERIFIED",
    "rejectionReason": null
  }
  ```

- **Admin List Pending Verifications (`GET /api/v1/verification/admin/pending`)**
  *Headers:* `Authorization: Bearer <adminToken>` (Requires `ADMIN` role)

### 6. Skills Directory APIs

- **List & Search Skills (`GET /api/v1/skills?search=flutter&category=Engineering`)**
  *Access:* Public  
  *Query Parameters:* `search`, `category`, `page`, `limit`  
  *Response:* Paginated list of public skills with metadata.

- **List Skill Categories (`GET /api/v1/skills/categories`)**
  *Access:* Public  
  *Response:* Unique categories array (`["Academics", "Design", "Engineering", "Sports", ...]`).

- **Get Skill by ID (`GET /api/v1/skills/:id`)**
  *Access:* Public  
  *Response:* Single skill record.

### 7. Student Discovery APIs

- **Discover Nearby Students (`GET /api/v1/discovery/students`)**
  *Headers:* `Authorization: Bearer <token>`  
  *Query Parameters:*
    * `skill`: Filter by skill name (e.g., `Flutter`, `Python`)
    * `skillLevel`: Filter by proficiency (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`)
    * `area`: Filter by MMR locality (e.g., `Kandivali`, `Borivali`, `Malad`)
    * `collegeId`: Filter by college UUID
    * `verifiedOnly`: Boolean flag (`true`/`false`)
    * `dayOfWeek`: Filter availability day (0 = Sunday to 6 = Saturday)
    * `time`: Filter availability time overlap (HH:mm format)
    * `page`: Page number (default: 1)
    * `limit`: Items per page (default: 20, max: 50)
  *Deterministic Ranking Algorithm:*
    1. **Skill Match**: +40 pts for exact requested skill match.
    2. **Skill Level**: +10 pts for `ADVANCED`, +5 pts for `INTERMEDIATE`.
    3. **Availability Overlap**: +25 pts for matching day/time availability window.
    4. **Proximity**: +20 pts (same area or <= 2km), +15 pts (2–5km), +10 pts (5–10km), +5 pts (10–20km).
    5. **College Verification**: +10 pts for `VERIFIED` student status.
    6. **Profile Completeness**: +5 pts if completeness score $\ge 80\%$.
  *Output Privacy & Safety:*
    * Returns explainable `matchScore` and `matchReasons: string[]`.
    * Masks raw GPS coordinates, email, phone, and private documents. Exposes only approximate locality names and banded distances (`~2 km away`, `2–5 km away`).
    * Excludes suspended users, self-matches, and blocked users.

### 8. Requests APIs
- **Create Request (`POST /api/v1/requests`)**
  *Headers:* `Authorization: Bearer <token>` (Verified students only)  
  *Payload:* Supports `PAID` (requires `budget` and `skillId`), `SKILL_EXCHANGE` (requires `skillId` and `desiredSkillId`), or `SOCIAL` (requires `activityTag`). Optionally supports `targetUserId` for direct discovery requests.
- **List & Filter Requests (`GET /api/v1/requests`)**
  *Query Parameters:* `direction` (`incoming` or `outgoing`), `status` (`OPEN`, `MATCHED`, `CLOSED`, `CANCELLED`), `type`, `area`, `skillId`, `page`, `limit`.
- **List Own Requests (`GET /api/v1/requests/mine`)**
- **Get Request Details (`GET /api/v1/requests/:id`)**
  *Includes attached offers for request owner; sanitizes sensitive details for other viewers.*
- **Edit Open Request (`PUT /api/v1/requests/:id`)**
  *Owner only. Allowed only while OPEN and before any offer is accepted.*
- **Close Request (`POST /api/v1/requests/:id/close`)**
- **Cancel Request (`POST /api/v1/requests/:id/cancel`)**
  *Owner only. Transitions status to CANCELLED and declines pending offers.*

### 9. Offers APIs
- **Submit Offer (`POST /api/v1/requests/:requestId/offers`)**
  *Headers:* `Authorization: Bearer <token>` (Verified students only)  
  *Payload:* Optional `message` and `counterTerms` (counterRate, proposedTime, notes).
- **List Offers on Request (`GET /api/v1/requests/:requestId/offers`)**
  *Owner only.*
- **Get Offer Details (`GET /api/v1/offers/:id`)**
  *Owner or offering student only.*
- **Accept Offer (`POST /api/v1/offers/:id/accept`)**
  *Atomically accepts offer, transitions request to MATCHED, declines competing offers, and generates a Task in PENDING status.*
- **Decline Offer (`POST /api/v1/offers/:id/decline`)**
- **Withdraw Offer (`POST /api/v1/offers/:id/withdraw`)**
  *Offering student can withdraw their own pending offer.*

### 10. Tasks Lifecycle APIs
- **List Tasks (`GET /api/v1/tasks` or `GET /api/v1/tasks/mine`)**
  *Query Parameters:* `role` (`requester` or `helper`), `status`, `page`, `limit`.
- **Get Task Detail (`GET /api/v1/tasks/:id`)**
  *Participant only (requester or helper).*
- **Update Task Status (`POST /api/v1/tasks/:id/status` & `PATCH /api/v1/tasks/:id/status`)**
  *Lifecycle transitions:*
  * `PENDING` $\to$ `ACCEPTED`
  * `ACCEPTED` $\to$ `IN_PROGRESS`
  * `IN_PROGRESS` $\to$ `COMPLETED` (Requires mutual confirmation; first confirmation initiates 48-hour timeout, second completes task and closes request).
  * Any active status $\to$ `CANCELLED` (Requires mandatory `cancelReason`; tracks `cancelledById`).

### 11. Request Discovery API
- **Discover Nearby Open Requests (`GET /api/v1/discovery/requests`)**
  *Query Parameters:* `skill`, `type`, `area`, `radiusKm`, `page`, `limit`.

### 12. Chat APIs & Real-Time Socket.IO
- **Create / Access Chat Thread (`POST /api/v1/chat/threads`)**
  *Headers:* `Authorization: Bearer <token>`  
  *Payload:* `{ "requestId": "UUID", "participantId": "UUID" }`  
  *Rule:* Only unlocks when a valid Request/Offer/Task relationship exists between participants. Pre-validates blocking and prevents self-chat.
- **List Chat Threads (`GET /api/v1/chat/threads`)**
  *Returns caller's active threads, latest message snippet, unread message count, and counterpart details.*
- **Get Chat Thread Detail (`GET /api/v1/chat/threads/:id`)**
  *Participant only.*
- **Send Message (`POST /api/v1/chat/threads/:threadId/messages`)**
  *Payload:* `{ "content": "..." }`  
  *Persists durable message to database and broadcasts in real time via Socket.IO gateway.*
- **Retrieve Message History (`GET /api/v1/chat/threads/:threadId/messages`)**
  *Query Parameters:* `page`, `limit`  
  *Marks counterpart messages as read and returns chronological paginated history.*
- **WebSocket Gateway (`ws://localhost:3000/chat`)**
  *Namespace:* `/chat`  
  *Handshake Authentication:* Bearer token in handshake `auth` or headers.  
  *Events:* `joinThread`, `leaveThread`, `newMessage`, `messageRead`.

### 13. Behavioral Reputation APIs
- **Submit Task Rating (`POST /api/v1/tasks/:taskId/rating`)**
  *Headers:* `Authorization: Bearer <token>`  
  *Payload:* `{ "score": 1-5, "tags": ["punctual", "skilled", "great communicator"] }`  
  *Rules:* Only participants of a `COMPLETED` task can submit a rating. Prevents duplicate ratings.
- **Get User Ratings (`GET /api/v1/users/:userId/ratings`)**
  *Paginated ratings received by a student.*
- **Get Transparent Reputation Summary (`GET /api/v1/users/:userId/reputation`)**
  *Outputs:* `completedTasks`, `completionRate` (percentage), `averageRating`, `ratingCount`, `repeatUsersCount` (peers who collaborated $\ge 2$ times), `endorsementsCount`, and `tagBreakdown`. Purely behavioral; decoupled from monetary amounts.
- **Endorse Peer Skill (`POST /api/v1/endorsements`)**
  *Payload:* `{ "endorseeId": "UUID", "skillId": "UUID" }`  
  *Rule:* Endorsement requires completed collaboration history between the two students. Automatically flags `isVerifiedSkill = true` when endorsement threshold is met.
- **List User Endorsements (`GET /api/v1/users/:userId/endorsements`)**

### 14. Safety & Recourse APIs
- **Block User (`POST /api/v1/users/:id/block` or `POST /api/v1/blocks`)**
  *Unilateral and silent. Instantly prevents discovery, incoming/outgoing requests, offers, and chat messaging.*
- **Unblock User (`DELETE /api/v1/users/:id/block` or `DELETE /api/v1/blocks/:userId`)**
- **List Blocked Users (`GET /api/v1/users/blocked`)**
- **Submit Safety Report (`POST /api/v1/reports`)**
  *Payload:* `{ "reportedUserId": "UUID", "category": "NO_SHOW|HARASSMENT|FAKE_PROFILE|SCAM|OTHER", "description": "...", "taskId": "UUID?" }`  
  *Anonymous toward reported user; routes ticket to safety queue.*
- **List My Reports (`GET /api/v1/reports/mine`)**

---

## Running & Testing

### 1. Run Unit & Service Tests
```bash
npm test
```
Runs 106 automated tests across 11 test suites:
- `ChatService`: thread relationship authorization, self-chat prevention, blocking checks, message persistence, Socket.IO broadcast, pagination, and read receipts.
- `ReputationService`: task completion eligibility, star ratings, behavioral tags, duplicate prevention, peer skill endorsements, and reputation metrics.
- `SafetyService`: unilateral silent blocking, unblocking, interaction prevention, report creation, and self-report prevention.
- `RequestsService`, `OffersService`, `TasksService`, `AuthService`, `ProfilesService`, `VerificationService`, `SkillsService`, `DiscoveryService`.

### 2. Build TypeScript
```bash
npm run build
```

### 3. Start Development Server
```bash
npm run start:dev
```
Verify endpoints at:
- Health: `GET http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/api/docs`
- WebSocket Chat: `ws://localhost:3000/chat`

