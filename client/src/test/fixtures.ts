import type { Ticket } from "../types/ticket";

export const buildTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: "ticket-1",
  title: "Printer on fire",
  status: "new",
  priority: "medium",
  assignee: null,
  createdAt: "2026-10-01T09:00:00.000Z",
  updatedAt: "2026-10-02T09:00:00.000Z",
  ...overrides,
});
