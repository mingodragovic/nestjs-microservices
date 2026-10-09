<div align="center">

# 🎟️ EventFlow

### Event-driven microservices for an event-ticketing platform

**NestJS · Apache Kafka · PostgreSQL · Drizzle ORM · Redis · Docker**

<p>
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white" alt="NestJS 11" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Apache%20Kafka-7.5-231F20?logo=apachekafka&logoColor=white" alt="Kafka" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Jest-22%20tests-C21325?logo=jest&logoColor=white" alt="Jest" />
</p>

<sub>Organizers create and publish events · attendees buy tickets · organizers check them in at the door · every step is broadcast on Kafka and turned into emails.</sub>

</div>

---

> [!NOTE]
> **About this project.** EventFlow started from a microservices tutorial by
> [Fiston N](https://github.com/fiston-user/nestjs-microservices), which this repository is forked from.
> After building it I audited the whole backend and found **36 issues**, including race conditions,
> an authentication bypass and features that silently didn't work. I then fixed the most serious ones.
> Those fixes are listed in [What I fixed](#-what-i-fixed) with a link to each commit.

## 📑 Contents

1. [Highlights](#-highlights)
2. [Architecture](#-architecture)
3. [How a ticket purchase flows](#-how-a-ticket-purchase-flows)
4. [Event-driven messaging with Kafka](#-event-driven-messaging-with-kafka)
5. [Data model](#-data-model)
6. [What I fixed](#-what-i-fixed)
7. [Tech stack](#-tech-stack)
8. [API reference](#-api-reference)
9. [Getting started](#-getting-started)
10. [Project structure](#-project-structure)
11. [Testing](#-testing)
12. [Roadmap](#-roadmap)

---

## ✨ Highlights

| | |
|---|---|
| 🧩 **5 independent services** | API gateway, auth, events, tickets and notifications, each its own NestJS app in one monorepo |
| 📨 **Event-driven** | Services publish domain events (`user.registered`, `ticket.purchased`…) to Kafka; notifications react asynchronously |
| 🔐 **Gateway-centred security** | JWT verified once at the edge; internal services accept only gateway traffic via a shared internal token |
| 🔒 **Concurrency-safe ticketing** | Purchases run in a transaction with a `SELECT … FOR UPDATE` row lock, so events can't be oversold |
| 🚦 **Distributed rate limiting** | Redis-backed throttling shared across gateway instances (5 logins / 3 sign-ups per minute) |
| ✅ **Validated contracts** | Shared DTOs with `class-validator`, a uniform response envelope and global exception filters |
| 🐳 **One-command infrastructure** | Docker Compose brings up Kafka, Zookeeper, PostgreSQL, Redis, Kafka UI and MailHog |

---

## 🏗 Architecture

Clients talk to a single **API gateway**. It authenticates the request, applies rate limits and forwards
it over HTTP to the service that owns the data. Services that change state also **emit an event to Kafka**.
The notifications service consumes those events and sends emails, so a slow mail server never slows
down a purchase.

```mermaid
flowchart LR
    client(["🖥️ Next.js client<br/>:4000"])

    subgraph edge ["Edge"]
        gw["🚪 API Gateway<br/>:3000<br/><sub>JWT · rate limit · routing</sub>"]
        redis[("🟥 Redis<br/><sub>rate-limit counters</sub>")]
    end

    subgraph core ["Internal services (not exposed to the host)"]
        auth["🔐 Auth service<br/>:3001"]
        events["📅 Events service<br/>:3003"]
        tickets["🎟️ Tickets service<br/>:3004"]
    end

    kafka{{"📨 Apache Kafka"}}
    notif["✉️ Notifications service<br/>:3006"]
    pg[("🐘 PostgreSQL")]
    mail["📬 MailHog / SMTP"]

    client -->|HTTPS + Bearer JWT| gw
    gw <--> redis
    gw -->|"HTTP + x-internal-token<br/>x-user-id / role / email"| auth
    gw --> events
    gw --> tickets

    auth --> pg
    events --> pg
    tickets --> pg

    auth -. user.registered .-> kafka
    events -. event.created / cancelled .-> kafka
    tickets -. ticket.purchased / cancelled .-> kafka
    kafka -. consume .-> notif
    notif --> mail

    classDef svc fill:#eef2ff,stroke:#6366f1,color:#1e1b4b
    classDef infra fill:#f0fdf4,stroke:#22c55e,color:#14532d
    classDef bus fill:#fff7ed,stroke:#f97316,color:#7c2d12
    class gw,auth,events,tickets,notif svc
    class pg,redis,mail infra
    class kafka bus
```

### Design decisions

| Decision | Why |
|---|---|
| **Gateway as the only public entry point** | Authentication, CORS, validation and rate limiting live in one place. Services stay small and focused on business rules. |
| **Synchronous HTTP for commands, Kafka for side effects** | The buyer needs an immediate "yes, you have a seat", so purchases are synchronous. Sending the email doesn't need to block that response, so it goes through Kafka. |
| **Shared libraries (`@app/common`, `@app/database`, `@app/kafka`)** | DTOs, topic names and the DB schema are defined once, so a renamed field can't silently break another service. |
| **Identity forwarded as headers, guarded by an internal token** | Services don't re-verify JWTs. They trust `x-user-id`, but only on requests that carry the gateway's secret. |

---

## 🔄 How a ticket purchase flows

```mermaid
sequenceDiagram
    autonumber
    actor U as Attendee
    participant G as API Gateway
    participant T as Tickets service
    participant DB as PostgreSQL
    participant K as Kafka
    participant N as Notifications
    participant M as Mail

    U->>G: POST /tickets/purchase {eventId, quantity}<br/>Authorization: Bearer JWT
    G->>G: Verify JWT · rate limit · validate DTO
    G->>T: POST /purchase<br/>x-internal-token, x-user-id, x-user-email
    T->>T: InternalAuthGuard ✔
    rect rgb(238, 242, 255)
        note over T,DB: One transaction
        T->>DB: SELECT … FROM events WHERE id = $1 FOR UPDATE
        T->>DB: SUM(quantity) of CONFIRMED + CHECKED_IN tickets
        alt seats left
            T->>DB: INSERT ticket … RETURNING *
        else sold out
            T-->>G: 400 "Only N tickets remaining"
        end
    end
    T-)K: emit ticket.purchased {ticketCode, email, eventTitle}
    T-->>G: 201 ticket
    G-->>U: { success: true, data: ticket }
    K-)N: deliver (consumer group: notifications)
    N->>M: "Your ticket is confirmed!"
```

The row lock is what prevents overselling. Without it, two buyers arriving at the same moment both read
"1 seat left" and both get a ticket. With `FOR UPDATE`, the second transaction waits until the first
one commits, then sees the updated count.

### Ticket lifecycle

Every status change is a **conditional update** (`UPDATE … WHERE id = $1 AND status = 'CONFIRMED'`).
When two requests race, exactly one wins and the other gets `409 Conflict`. A ticket can never be
both cancelled and checked in.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> CONFIRMED: purchase
    CONFIRMED --> CHECKED_IN: organizer scans code
    CONFIRMED --> CANCELLED: attendee cancels
    CHECKED_IN --> [*]
    CANCELLED --> [*]
    note right of CONFIRMED
        Only CONFIRMED tickets can move.
        Losing a race returns 409.
    end note
```

---

## 📨 Event-driven messaging with Kafka

```mermaid
flowchart LR
    subgraph producers ["Producers"]
        A["Auth"]
        E["Events"]
        T["Tickets"]
    end
    subgraph topics ["Kafka topics"]
        t1(["user.registered"])
        t2(["user.login"])
        t3(["event.created · event.updated · event.cancelled"])
        t4(["ticket.purchased"])
        t5(["ticket.cancelled"])
        t6(["ticket.checked-in"])
    end
    subgraph consumers ["Consumer group: notifications-consumer-group"]
        N1["✉️ Welcome email"]
        N2["✉️ Ticket confirmation"]
        N3["✉️ Cancellation notice"]
    end
    A --> t1 & t2
    E --> t3
    T --> t4 & t5 & t6
    t1 --> N1
    t4 --> N2
    t5 --> N3

    classDef topic fill:#fff7ed,stroke:#f97316,color:#7c2d12
    class t1,t2,t3,t4,t5,t6 topic
```

- **Topic names are typed constants** in `@app/kafka`, shared by producers and consumers.
- **Consumer groups** mean you can run several copies of the notifications service. Kafka spreads the
  partitions across them, and each message is handled once per group.
- **Unconsumed topics** (`event.*`, `ticket.checked-in`, `user.login`) are already published, so
  analytics or audit services can be added later without changing the producers.
- **Kafka listeners** are split into `kafka:29092` (between containers) and `localhost:9093` (from
  your machine). Each address is advertised to the clients on that side, so services running in
  Docker and services running locally can both connect.

---

## 🗄 Data model

Schema defined in TypeScript with **Drizzle ORM** (`libs/database/src/schema`). Money is stored as integer cents.

```mermaid
erDiagram
    USERS ||--o{ EVENTS : organizes
    USERS ||--o{ TICKETS : buys
    EVENTS ||--o{ TICKETS : "has"

    USERS {
        uuid id PK
        varchar email UK
        varchar password "bcrypt hash"
        varchar name
        enum role "USER | ORGANIZER | ADMIN"
        timestamp created_at
    }
    EVENTS {
        uuid id PK
        varchar title
        text description
        timestamp date
        varchar location
        int capacity
        int price "cents"
        enum status "DRAFT | PUBLISHED | CANCELLED"
        uuid organize_id FK
    }
    TICKETS {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        int quantity
        int total_price "cents"
        enum status "PENDING | CONFIRMED | CHECKED_IN | CANCELLED"
        varchar ticket_code UK
        timestamp purchased_at
        timestamp checked_in_at
    }
```

---

## 🛠 What I fixed

I read every backend file and reviewed it like a production code review. I found 36 issues (3 critical,
9 high, 15 medium, 9 low). These are the ones I fixed. Each fix is its own commit and explains the
root cause.

| Severity | Problem | Root cause | Fix | Commit |
|:---:|---|---|---|:---:|
| 🔴 Critical | **Anyone could act as any user**: call the tickets service directly with a forged `x-user-id`, or send `x-user-role: ADMIN` | Services trusted identity headers from any caller, and Compose published their ports to the host | `InternalAuthGuard` with a shared token compared in constant time, attached by the gateway's `HttpModule`. Internal ports are no longer published (`expose` instead of `ports`) | [`5c24289`](https://github.com/mingodragovic/nestjs-microservices/commit/5c24289) |
| 🔴 Critical | **Events could be oversold** when buyers arrived at the same time | The capacity check and the insert were separate statements, with nothing stopping two requests in between | One transaction with `SELECT … FOR UPDATE` on the event row. Checked-in seats are now also counted as sold | [`c44bdb9`](https://github.com/mingodragovic/nestjs-microservices/commit/c44bdb9) |
| 🔴 Critical | **Check-in always returned 500** | The query selected `events.id` without joining `events`, so Postgres failed with *missing FROM-clause entry* | `innerJoin(events)` and read the organizer in the same query | [`6dd0ac9`](https://github.com/mingodragovic/nestjs-microservices/commit/6dd0ac9) |
| 🟠 High | A ticket could be **checked in and cancelled at once**, or checked in twice | Read-then-write on status | Conditional `UPDATE … WHERE status = 'CONFIRMED'`, returning 409 if no row changed | [`08dad53`](https://github.com/mingodragovic/nestjs-microservices/commit/08dad53) |
| 🟠 High | **Redis rate limiter was never used**: limits were per instance and reset on restart | It was registered under the string `'ThrottlerStorage'`, but `@nestjs/throttler` v6 injects a `Symbol` | Pass the store through `ThrottlerModule.forRoot({ storage })` | [`0fbd2de`](https://github.com/mingodragovic/nestjs-microservices/commit/0fbd2de) |
| 🟠 High | **`ADMIN` / `ORGANIZER` roles had no effect** | The JWT carried only `sub` and `email`, so every caller was forwarded as `USER` | Sign `role` into the token and expose it from both Passport strategies | [`6eeaaca`](https://github.com/mingodragovic/nestjs-microservices/commit/6eeaaca) |
| 🟠 High | **Every `/events` and `/tickets` call failed in Docker** | The gateway was configured with ports 3002/3003; the services listen on 3003/3004 | Correct the service URLs in Compose | [`927d71b`](https://github.com/mingodragovic/nestjs-microservices/commit/927d71b) |
| 🟠 High | **All ticket emails went to `user@example.com`** | Ticket events had no email, so a hard-coded fallback was used | Forward the email from the verified JWT and include it (and the event title) in the event. Skip with a warning instead of using a placeholder | [`6f1791e`](https://github.com/mingodragovic/nestjs-microservices/commit/6f1791e) |
| 🟡 Medium | **Duplicate accounts** from simultaneous sign-ups | No unique constraint on `users.email`; check-then-insert | Unique constraint, with Postgres `23505` mapped to `409 Conflict` | [`9aa6d05`](https://github.com/mingodragovic/nestjs-microservices/commit/9aa6d05) |

The fixes are covered by **unit tests** ([`fa835d9`](https://github.com/mingodragovic/nestjs-microservices/commit/fa835d9)).
They check the row lock, the over-capacity and lost-race paths, the internal-token guard and the JWT role claim.

**What I took away from this:**
- **"Check, then write" is a race unless the database enforces it.** Use row locks, conditional
  updates or unique constraints.
- **In microservices, the trust boundary is the network.** A header only means something if you know
  who could have sent it.
- **Read the library's source.** The throttler bug compiles cleanly, the app runs, and the Redis store
  simply never gets used.

---

## 🧰 Tech stack

| Layer | Technology | Used for |
|---|---|---|
| Framework | **NestJS 11** (monorepo mode, webpack) | Modules, dependency injection, guards, pipes, interceptors |
| Language | **TypeScript 5** | Shared types across services |
| Messaging | **Apache Kafka** (KafkaJS, `@nestjs/microservices`) | Domain events, consumer groups |
| Database | **PostgreSQL 16** + **Drizzle ORM** | Typed schema, transactions, row locking |
| Cache / limits | **Redis 7** + `ioredis` | Shared rate-limit counters |
| Auth | **Passport-JWT**, **bcrypt** | Stateless auth, password hashing |
| Validation | `class-validator`, `class-transformer` | DTOs, whitelisting unknown fields |
| Email | **Nodemailer** + **MailHog** | Transactional emails, local inbox |
| Infra | **Docker**, **Docker Compose** | Multi-stage builds, local environment |
| Testing | **Jest**, `@nestjs/testing` | Unit tests with mocked Kafka and DB |
| Frontend | Next.js 16, React 19, Zustand, Tailwind 4 | Client in `client/` |

---

## 📡 API reference

All responses use the same envelope: `{ success: true, data, meta: { timestamp, path, method } }` or
`{ success: false, error: { code, message, details?, timestamp, path } }`.

| Method | Route | Auth | Description |
|---|---|:---:|---|
| `POST` | `/auth/register` | — | Create an account *(3 req/min)* |
| `POST` | `/auth/login` | — | Get a JWT *(5 req/min)* |
| `GET` | `/auth/profile` | 🔑 | Current user |
| `GET` | `/events` | — | List published events |
| `GET` | `/events/:id` | — | Event details |
| `GET` | `/events/my-events` | 🔑 | Events I organize |
| `POST` | `/events` | 🔑 | Create an event (draft) |
| `PUT` | `/events/:id` | 🔑 owner/admin | Update an event |
| `POST` | `/events/:id/publish` | 🔑 owner/admin | Put on sale |
| `POST` | `/events/:id/cancel` | 🔑 owner/admin | Cancel an event |
| `POST` | `/tickets/purchase` | 🔑 | Buy 1–10 tickets |
| `GET` | `/tickets/my-tickets` | 🔑 | My tickets |
| `GET` | `/tickets/:id` | 🔑 owner | Ticket details |
| `POST` | `/tickets/:id/cancel` | 🔑 owner | Cancel a ticket |
| `POST` | `/tickets/check-in` | 🔑 organizer | Check in by ticket code |
| `GET` | `/tickets/event/:eventId` | 🔑 organizer | Attendee list |

<details>
<summary><b>Example: register, log in and buy a ticket with curl</b></summary>

```bash
# 1. Register and log in
curl -X POST localhost:3000/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"secret123","name":"Ada"}'

TOKEN=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"secret123"}' | jq -r .data.access_token)

# 2. Create and publish an event
EVENT=$(curl -s -X POST localhost:3000/events -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"NestJS Meetup","date":"2026-12-01T18:00:00Z","location":"Paris","capacity":50,"price":1500}' \
  | jq -r .data.id)
curl -X POST localhost:3000/events/$EVENT/publish -H "Authorization: Bearer $TOKEN"

# 3. Buy two tickets, then check the confirmation email at http://localhost:8025
curl -X POST localhost:3000/tickets/purchase -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d "{\"eventId\":\"$EVENT\",\"quantity\":2}"
```
</details>

---

## 🚀 Getting started

**Prerequisites:** Node.js 20+, pnpm, Docker Desktop.

```bash
# 1. Install dependencies
pnpm install

# 2. Start the infrastructure (Kafka, Postgres, Redis, MailHog, Kafka UI)
docker compose up -d zookeeper kafka kafka-ui postgres redis mailhog

# 3. Create the database tables from the Drizzle schema
pnpm db:push

# 4. Start each service (one terminal each, or use your IDE's compound launch)
pnpm start:dev api-gateway
pnpm start:dev auth-service
pnpm start:dev events-service
pnpm start:dev tickets-service
pnpm start:dev notifications-service

# 5. (optional) Frontend
cd client && pnpm install && pnpm dev
```

| URL | What |
|---|---|
| http://localhost:3000 | API gateway |
| http://localhost:4000 | Next.js client |
| http://localhost:8080 | Kafka UI: browse topics and messages |
| http://localhost:8025 | MailHog: see the emails that were sent |

**Environment variables** (all have local-dev defaults):

| Variable | Used by | Default |
|---|---|---|
| `DATABASE_URL` | auth, events, tickets | `postgresql://eventflowapp:eventflow_password@localhost:5432/eventflowapp` |
| `KAFKA_BROKER` | all services | `localhost:9093` |
| `JWT_SECRET` | gateway, auth | `secret` ⚠️ change it |
| `INTERNAL_API_TOKEN` | gateway, auth, events, tickets | `dev-internal-token` ⚠️ change it |
| `REDIS_HOST` / `REDIS_PORT` | gateway | `localhost` / `6379` |
| `SMTP_HOST` / `SMTP_PORT` | notifications | `localhost` / `1025` |

> [!WARNING]
> Building the service images with `docker compose up --build` currently fails at `pnpm install`. The
> Dockerfile installs the latest pnpm, and recent versions refuse to run dependency build scripts
> (bcrypt) unless they are approved. Pin pnpm or add `onlyBuiltDependencies` to fix it (see the
> [Roadmap](#-roadmap)). Running the services locally with the steps above works.

---

## 📁 Project structure

```text
.
├── apps/
│   ├── api-gateway/            # Public entry: JWT strategy, Redis throttler, HTTP proxies
│   ├── auth-service/           # Register / login / profile, bcrypt, JWT signing
│   ├── events-service/         # Event CRUD + publish / cancel, owner & admin checks
│   ├── tickets-service/        # Purchase (row-locked), cancel, check-in, attendee lists
│   └── notifications-service/  # Kafka consumer → Nodemailer
├── libs/
│   ├── common/                 # DTOs, response envelope, exception filters, InternalAuthGuard
│   ├── database/               # Drizzle schema + DatabaseService (pg Pool)
│   └── kafka/                  # KafkaModule.register(), typed topic constants
├── client/                     # Next.js 16 frontend
├── docker-compose.yaml         # Full local environment
├── Dockerfile                  # Multi-stage build, one image per service (ARG SERVICE)
└── drizzle.config.ts
```

The `@app/*` path aliases are configured in `tsconfig.json`, and Jest maps them through `moduleNameMapper`.

---

## 🧪 Testing

```bash
pnpm test          # 6 suites · 22 tests
pnpm test:cov      # with coverage
```

The unit tests replace Drizzle's query builder with a chainable mock that records each call. They
check *how* the database is queried (for example, that the purchase query takes a `FOR UPDATE` lock
inside a transaction), not just what the method returns.

---

## 🗺 Roadmap

These are the remaining items from my audit, in priority order:

- [ ] **Transactional outbox.** Write events to an `outbox` table in the same transaction as the
  ticket, and publish from there. At the moment, a crash between the commit and the Kafka emit loses
  the email.
- [ ] **Idempotent purchases.** Accept an `Idempotency-Key` header, so a retried request doesn't buy
  twice.
- [ ] **Fix the Docker build.** Pin the pnpm version and allow bcrypt's native build.
- [ ] **Versioned migrations.** Use `drizzle-kit generate` + `migrate` in CI instead of `push`.
- [ ] **Health checks** for every service, and `depends_on: service_healthy` for Kafka.
- [ ] **Integration tests** against real Postgres and Kafka with Testcontainers.
- [ ] **Observability.** Structured logs with a correlation id carried from the gateway through Kafka
  headers, plus OpenTelemetry traces.
- [ ] **Event cancellation fan-out.** Notify every ticket holder and refund their tickets.

---

<div align="center">

**Built by [ilyes](https://github.com/mingodragovic)** · forked from
[fiston-user/nestjs-microservices](https://github.com/fiston-user/nestjs-microservices)

<sub>If you're a recruiter or engineer reading this, I'm happy to walk through any of the fixes above.</sub>

</div>
