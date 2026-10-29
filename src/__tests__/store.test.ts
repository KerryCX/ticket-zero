import { ticketStore } from "../store";
import { Ticket } from "../types/ticket";

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: "t-1",
  title: "A ticket",
  status: "new",
  priority: "medium",
  assignee: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  ticketStore.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("TicketStore", () => {
  it("creates and finds a ticket by id", () => {
    const ticket = makeTicket();
    expect(ticketStore.create(ticket)).toEqual(ticket);
    expect(ticketStore.findById("t-1")).toEqual(ticket);
  });

  it("returns undefined for an unknown id", () => {
    expect(ticketStore.findById("nope")).toBeUndefined();
  });

  it("findAll returns everything, or filters by status", () => {
    ticketStore.create(makeTicket({ id: "a", status: "new" }));
    ticketStore.create(makeTicket({ id: "b", status: "resolved" }));
    expect(ticketStore.findAll()).toHaveLength(2);
    expect(ticketStore.findAll("resolved").map((t) => t.id)).toEqual(["b"]);
    expect(ticketStore.findAll("in-progress")).toEqual([]);
  });

  it("update merges fields, protects id and refreshes updatedAt", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
    ticketStore.create(makeTicket());
    const updated = ticketStore.update("t-1", {
      title: "Changed",
      id: "hacked",
    });
    expect(updated).toMatchObject({
      id: "t-1",
      title: "Changed",
      status: "new",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
    });
    expect(ticketStore.findById("hacked")).toBeUndefined();
  });

  it("update returns undefined for an unknown id", () => {
    expect(ticketStore.update("nope", { title: "x" })).toBeUndefined();
  });

  it("delete returns true once, then false", () => {
    ticketStore.create(makeTicket());
    expect(ticketStore.delete("t-1")).toBe(true);
    expect(ticketStore.delete("t-1")).toBe(false);
  });

  it("clear removes all tickets", () => {
    ticketStore.create(makeTicket({ id: "a" }));
    ticketStore.create(makeTicket({ id: "b" }));
    ticketStore.clear();
    expect(ticketStore.findAll()).toEqual([]);
  });
});
