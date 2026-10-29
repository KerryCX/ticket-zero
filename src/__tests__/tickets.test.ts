// supertest lets you make HTTP requests against the app without a running server
import request from "supertest";
import app from "../app";
import { ticketStore } from "../store";

beforeEach(() => {
  // Resets the store before every test so no state leaks between them. Essential for reliable tests.
  ticketStore.clear();
});

describe("GET /health", () => {
  it("returns status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("GET /tickets", () => {
  it("returns an empty array when no tickets exist", async () => {
    // fires a real request through the full Express stack
    const res = await request(app).get("/tickets");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns all tickets", async () => {
    await request(app).post("/tickets").send({ title: "Ticket one" });
    await request(app).post("/tickets").send({ title: "Ticket two" });

    const res = await request(app).get("/tickets");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("filters by status", async () => {
    await request(app)
      .post("/tickets")
      .send({ title: "New ticket", status: "new" });
    await request(app)
      .post("/tickets")
      .send({ title: "Resolved ticket", status: "resolved" });

    const res = await request(app).get("/tickets?status=new");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe("new");
  });
});

describe("POST /tickets", () => {
  it("creates a ticket with defaults", async () => {
    const res = await request(app)
      .post("/tickets")
      .send({ title: "New ticket" });
    expect(res.status).toBe(201);
    // checks that the response contains at least those fields. It doesn't fail if there are extra fields like id or createdAt
    expect(res.body).toMatchObject({
      title: "New ticket",
      status: "new",
      priority: "medium",
      assignee: null,
    });
    // just checks the field exists, not its exact value. Useful for things like UUIDs and timestamps that you can't predict
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it("returns 400 when title is invalid", async () => {
    const res = await request(app).post("/tickets").send({ title: "" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/tickets")
      .send({ priority: "high" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  it("returns 400 for an invalid status", async () => {
    const res = await request(app)
      .post("/tickets")
      .send({ title: "Bad status", status: "unknown" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid priority", async () => {
    const res = await request(app)
      .post("/tickets")
      .send({ title: "Bad priority", priority: "invalid" });
    expect(res.status).toBe(400);
  });
});

describe("GET /tickets/:id", () => {
  it("returns ticket by :id", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Ticket one" });
    const id = created.body.id;
    const res = await request(app).get(`/tickets/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.title).toBe("Ticket one");
  });

  it("returns 404 for a non-existent id", async () => {
    const res = await request(app).get("/tickets/non-existent");
    expect(res.status).toBe(404);
    expect(res.body.message).toBeDefined();
  });
});

describe("PATCH /tickets/:id", () => {
  const newTitle = "Ticket Two";
  it("patches ticket with :id", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Ticket one" });
    const id = created.body.id;
    const patched = await request(app)
      .patch(`/tickets/${id}`)
      .send({ title: newTitle });
    expect(patched.status).toBe(200);
    expect(patched.body.title).toBe(newTitle);
    expect(patched.body.status).toBe("new");
  });

  it("returns 404 for a non-existent id", async () => {
    const patched = await request(app)
      .patch("/tickets/non-existent")
      .send({ title: newTitle });
    expect(patched.status).toBe(404);
    expect(patched.body.message).toBeDefined();
  });

  it("updates ticket :id with assignee", async () => {
    const assignee = "Kerry";
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Ticket one" });
    const id = created.body.id;
    const patched = await request(app)
      .patch(`/tickets/${id}`)
      .send({ assignee });
    expect(patched.status).toBe(200);
    expect(patched.body.assignee).toBe(assignee);
    expect(patched.body.status).toBe("new");
  });

  it("updates ticket :id with null assignee", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Ticket one" });
    const id = created.body.id;
    const patched = await request(app)
      .patch(`/tickets/${id}`)
      .send({ assignee: null });
    expect(patched.status).toBe(200);
    expect(patched.body.assignee).toBeNull();
  });

  it("returns 400 for an invalid status", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Ticket one" });
    const id = created.body.id;
    const patched = await request(app)
      .patch(`/tickets/${id}`)
      .send({ status: "banana" });
    expect(patched.status).toBe(400);
    expect(patched.body.message).toBeDefined();
  });

  it("returns 400 for an empty status", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Ticket one" });
    const id = created.body.id;
    const patched = await request(app)
      .patch(`/tickets/${id}`)
      .send({ status: "" });
    expect(patched.status).toBe(400);
    expect(patched.body.message).toBeDefined();
  });

  it("returns 400 for an empty title", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Ticket one" });
    const id = created.body.id;
    const patched = await request(app)
      .patch(`/tickets/${id}`)
      .send({ title: "" });
    expect(patched.status).toBe(400);
    expect(patched.body.message).toBeDefined();
  });

  it("returns 400 for an invalid priority", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Ticket one" });
    const id = created.body.id;
    const patched = await request(app)
      .patch(`/tickets/${id}`)
      .send({ priority: "banana" });
    expect(patched.status).toBe(400);
    expect(patched.body.message).toBeDefined();
  });

  it("returns 400 for an empty priority", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Ticket one" });
    const id = created.body.id;
    const patched = await request(app)
      .patch(`/tickets/${id}`)
      .send({ priority: "" });
    expect(patched.status).toBe(400);
    expect(patched.body.message).toBeDefined();
  });
});

describe("DELETE /tickets/:id", () => {
  it("deletes ticket with :id", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Ticket one" });
    const id = created.body.id;
    const deleted = await request(app).delete(`/tickets/${id}`);
    expect(deleted.status).toBe(204);
    const res = await request(app).get(`/tickets/${id}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBeDefined();
  });
  it("returns 404 for a non-existent id", async () => {
    const res = await request(app).delete("/tickets/non-existent");
    expect(res.status).toBe(404);
    expect(res.body.message).toBeDefined();
  });
});

describe("ticket edge cases", () => {
  it("trims whitespace from the title on create", async () => {
    const res = await request(app)
      .post("/tickets")
      .send({ title: "  Padded title  " });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Padded title");
  });

  it("returns 400 for a whitespace-only title", async () => {
    const res = await request(app).post("/tickets").send({ title: "   " });
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is not a string", async () => {
    const res = await request(app).post("/tickets").send({ title: 123 });
    expect(res.status).toBe(400);
  });

  it("accepts every valid status and priority on create", async () => {
    const statuses = ["new", "in-progress", "waiting-on-customer", "resolved"];
    const priorities = ["low", "medium", "high"];
    for (const status of statuses) {
      for (const priority of priorities) {
        const res = await request(app)
          .post("/tickets")
          .send({ title: `${status}/${priority}`, status, priority });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ status, priority });
      }
    }
  });

  it("creates a ticket with an assignee", async () => {
    const res = await request(app)
      .post("/tickets")
      .send({ title: "Assigned", assignee: "Kerry" });
    expect(res.status).toBe(201);
    expect(res.body.assignee).toBe("Kerry");
  });

  it("returns an empty array when no tickets match the status filter", async () => {
    await request(app).post("/tickets").send({ title: "Only new" });
    const res = await request(app).get("/tickets?status=resolved");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await request(app)
      .post("/tickets")
      .set("Content-Type", "application/json")
      .send("{ not json");
    expect(res.status).toBe(400);
  });

  it("returns a JSON 404 for an unknown route", async () => {
    const res = await request(app).get("/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Not found" });
  });
});

describe("PATCH /tickets/:id (workflow updates)", () => {
  it("updates status and priority together", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Workflow" });
    const res = await request(app)
      .patch(`/tickets/${created.body.id}`)
      .send({ status: "in-progress", priority: "high" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: "Workflow",
      status: "in-progress",
      priority: "high",
    });
  });

  it("trims the title and keeps id and createdAt unchanged", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Original" });
    const res = await request(app)
      .patch(`/tickets/${created.body.id}`)
      .send({ title: "  Renamed  " });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Renamed");
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.createdAt).toBe(created.body.createdAt);
  });

  it("returns 400 when title is not a string", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Original" });
    const res = await request(app)
      .patch(`/tickets/${created.body.id}`)
      .send({ title: 42 });
    expect(res.status).toBe(400);
  });

  it("persists the update so a later GET sees it", async () => {
    const created = await request(app)
      .post("/tickets")
      .send({ title: "Persist me" });
    await request(app)
      .patch(`/tickets/${created.body.id}`)
      .send({ status: "resolved" });
    const res = await request(app).get(`/tickets/${created.body.id}`);
    expect(res.body.status).toBe("resolved");
  });
});
