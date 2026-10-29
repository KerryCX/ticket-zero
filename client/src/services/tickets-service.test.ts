import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTicket,
  deleteTicket,
  fetchTickets,
  updateTicket,
} from "./tickets-service";
import { buildTicket } from "../test/fixtures";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const mockFetch = (response: Response) => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchTickets", () => {
  it("requests all tickets without a query string", async () => {
    const tickets = [buildTicket()];
    const fetchMock = mockFetch(jsonResponse(tickets));

    await expect(fetchTickets("all")).resolves.toEqual(tickets);
    expect(fetchMock).toHaveBeenCalledWith("/tickets");
  });

  it("adds a status query when filtering", async () => {
    const fetchMock = mockFetch(jsonResponse([]));

    await fetchTickets("in-progress");

    expect(fetchMock).toHaveBeenCalledWith("/tickets?status=in-progress");
  });

  it("throws the API's error message when the request fails", async () => {
    mockFetch(jsonResponse({ message: "Invalid status" }, 400));

    await expect(fetchTickets("new")).rejects.toThrow("Invalid status");
  });

  it("falls back to the status code when the error body is not JSON", async () => {
    mockFetch(new Response("Bad gateway", { status: 502 }));

    await expect(fetchTickets("all")).rejects.toThrow(
      "Request failed with status 502",
    );
  });

  it("falls back to the status code when the error body has no message", async () => {
    mockFetch(jsonResponse({}, 500));

    await expect(fetchTickets("all")).rejects.toThrow(
      "Request failed with status 500",
    );
  });
});

describe("createTicket", () => {
  it("POSTs the input as JSON and returns the created ticket", async () => {
    const created = buildTicket({ title: "New one" });
    const fetchMock = mockFetch(jsonResponse(created, 201));

    const result = await createTicket({ title: "New one", priority: "high" });

    expect(result).toEqual(created);
    expect(fetchMock).toHaveBeenCalledWith("/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New one", priority: "high" }),
    });
  });

  it("throws the API's validation message", async () => {
    mockFetch(jsonResponse({ message: "title is required" }, 422));

    await expect(createTicket({ title: "" })).rejects.toThrow(
      "title is required",
    );
  });
});

describe("updateTicket", () => {
  it("PATCHes the ticket by id", async () => {
    const updated = buildTicket({ status: "resolved" });
    const fetchMock = mockFetch(jsonResponse(updated));

    const result = await updateTicket("ticket-1", { status: "resolved" });

    expect(result).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith("/tickets/ticket-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
  });

  it("throws when the ticket does not exist", async () => {
    mockFetch(jsonResponse({ message: "Ticket not found" }, 404));

    await expect(updateTicket("missing", { title: "x" })).rejects.toThrow(
      "Ticket not found",
    );
  });
});

describe("deleteTicket", () => {
  it("sends a DELETE request for the id", async () => {
    const fetchMock = mockFetch(new Response(null, { status: 204 }));

    await expect(deleteTicket("ticket-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/tickets/ticket-1", {
      method: "DELETE",
    });
  });

  it("throws when the delete fails", async () => {
    mockFetch(jsonResponse({ message: "Ticket not found" }, 404));

    await expect(deleteTicket("missing")).rejects.toThrow("Ticket not found");
  });
});
