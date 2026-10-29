# TicketZero

A support ticket tracker with a Getting Things Done slant: everything starts as `new` and the goal is to clear the queue. RESTful API (Node.js, Express, TypeScript) with a React + TypeScript client in `client/`.

## Setup

```bash
npm install         # installs the API's dependencies
cd client && npm install   # installs the client's dependencies
```

## Run (development)

Two servers, in two terminals:

```bash
npm run dev                 # API, with hot reload, on http://localhost:3000
```

```bash
cd client && npm run dev    # client, with hot reload, on http://localhost:5173
```

Open `http://localhost:5173`. The client's dev server forwards `/tickets` and `/health` requests to the API on port 3000 (see `client/vite.config.ts`), so there's no CORS setup to think about.

## Run (as one combined app)

Build the client, then start the API, which serves the built client itself:

```bash
cd client && npm run build  # outputs client/dist
cd ..
npm run build:api           # compiles the API
npm start                   # serves both from http://localhost:3000
```

Now `http://localhost:3000` shows the app directly instead of `Cannot GET /`. This is the shape you'd deploy: one server, one port.

## Deploying

`npm run build` builds the client and the API together (it installs the client's dependencies, builds it, then compiles the API), so a host that just runs `npm install && npm run build && npm start` will work with no extra configuration. `build:api` is a fast path to compile just the API if you don't need to touch the client. The server already reads `PORT` from the environment, falling back to 3000 locally, which is what most Node hosts (Render, Railway, Fly.io) expect.

One thing to know before relying on a deployed copy: tickets are stored in memory only, there's no database. Any restart, redeploy, or the server sleeping on a free tier wipes all tickets back to empty. Fine for a live demo, not for anything you need to persist.

## Test

```bash
npm test           # API tests, with coverage
npm run test:watch # watch mode
```

The client doesn't have its own test suite yet.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request. The API job type-checks and builds with `tsc`, then runs `npm test`, which fails if coverage drops below the thresholds in `jest.config.ts`. The client job runs `oxlint` and a production build.

## Using the API directly

The client covers day-to-day use, but the API can still be called directly if you want to script something or use Postman/Insomnia. A browser address bar can only send GET requests, so you can view `/tickets` and `/tickets/:id` just by typing the URL in, creating, updating, or deleting a ticket needs a tool that can send POST/PATCH/DELETE requests, `curl` in a terminal being the simplest.

With the server running, here's the full flow using `curl`:

**List all tickets**

```bash
curl http://localhost:3000/tickets
```

Filter by status:

```bash
curl "http://localhost:3000/tickets?status=new"
```

**Create a ticket**

```bash
curl -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -d '{"title":"Cannot reset password","status":"new","priority":"high"}'
```

Only `title` is required, `status` defaults to `new`, `priority` defaults to `medium`, `assignee` defaults to `null`. The response includes the generated `id`, use it for the next two.

**Get a single ticket**

```bash
curl http://localhost:3000/tickets/THE_ID
```

**Update a ticket**

```bash
curl -X PATCH http://localhost:3000/tickets/THE_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"resolved"}'
```

Send only the fields you want to change.

**Delete a ticket**

```bash
curl -X DELETE http://localhost:3000/tickets/THE_ID
```

## API reference

Base URL: `http://localhost:3000`

| Method | Path         | Description                            |
| ------ | ------------ | --------------------------------------- |
| GET    | /tickets     | List all tickets (supports `?status=`)  |
| GET    | /tickets/:id | Get a single ticket                     |
| POST   | /tickets     | Create a ticket                         |
| PATCH  | /tickets/:id | Update a ticket                         |
| DELETE | /tickets/:id | Delete a ticket                         |

### Ticket fields

| Field       | Type                                                            | Required? | Notes                 |
| ----------- | ---------------------------------------------------------------- | --------- | --------------------- |
| `id`        | string                                                          | No        | Generated, read-only  |
| `title`     | string                                                          | Yes       | Non-empty             |
| `status`    | `new` \| `in-progress` \| `waiting-on-customer` \| `resolved`   | No        | Defaults to `new`     |
| `priority`  | `low` \| `medium` \| `high`                                     | No        | Defaults to `medium`  |
| `assignee`  | string or `null`                                                | No        | Defaults to `null`    |
| `createdAt` | ISO timestamp                                                   | No        | Generated, read-only  |
| `updatedAt` | ISO timestamp                                                   | No        | Generated, read-only  |

### Errors

Invalid input (missing `title`, or a `status`/`priority` outside the allowed values) returns `400` with a `message` explaining what's wrong. A request for a ticket `id` that doesn't exist returns `404` with `{"message":"Ticket not found"}`.
