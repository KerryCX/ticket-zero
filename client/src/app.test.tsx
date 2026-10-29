import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./app";
import {
  createTicket,
  deleteTicket,
  fetchTickets,
  updateTicket,
} from "./services/tickets-service";
import { buildTicket } from "./test/fixtures";

vi.mock("./services/tickets-service");

const fetchTicketsMock = vi.mocked(fetchTickets);
const createTicketMock = vi.mocked(createTicket);
const updateTicketMock = vi.mocked(updateTicket);
const deleteTicketMock = vi.mocked(deleteTicket);

describe("App", () => {
  beforeEach(() => {
    fetchTicketsMock.mockReset();
    createTicketMock.mockReset();
    updateTicketMock.mockReset();
    deleteTicketMock.mockReset();
  });

  it("loads and shows tickets on first render", async () => {
    fetchTicketsMock.mockResolvedValue([
      buildTicket({ id: "1", title: "First" }),
      buildTicket({ id: "2", title: "Second" }),
    ]);

    render(<App />);

    expect(screen.getByText("Loading tickets...")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "First" }),
    ).toBeInTheDocument();
    expect(fetchTicketsMock).toHaveBeenCalledWith("all");
    expect(screen.queryByText("Loading tickets...")).not.toBeInTheDocument();
  });

  it("shows an error when the tickets cannot be loaded", async () => {
    fetchTicketsMock.mockRejectedValue(new Error("Server unavailable"));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Server unavailable",
    );
  });

  it("refetches with the chosen status filter", async () => {
    const user = userEvent.setup();
    fetchTicketsMock.mockResolvedValue([]);
    render(<App />);
    await screen.findByText(/No tickets yet/);

    await user.selectOptions(
      within(screen.getByRole("region", { name: "Tickets" })).getByLabelText("Status"),
      "resolved",
    );

    await waitFor(() =>
      expect(fetchTicketsMock).toHaveBeenLastCalledWith("resolved"),
    );
  });

  it("adds a newly created ticket to the top of the list", async () => {
    const user = userEvent.setup();
    fetchTicketsMock.mockResolvedValue([
      buildTicket({ id: "1", title: "Existing" }),
    ]);
    createTicketMock.mockResolvedValue(
      buildTicket({ id: "2", title: "Brand new" }),
    );
    render(<App />);
    await screen.findByRole("heading", { name: "Existing" });

    await user.type(screen.getByLabelText("Subject"), "Brand new");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Brand new" }),
      ).toBeInTheDocument(),
    );
    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual(["Brand new", "Existing"]);
  });

  it("does not show a created ticket that falls outside the active filter", async () => {
    const user = userEvent.setup();
    fetchTicketsMock.mockResolvedValue([]);
    createTicketMock.mockResolvedValue(
      buildTicket({ id: "2", title: "Wrong filter", status: "new" }),
    );
    render(<App />);
    await screen.findByText(/No tickets yet/);
    await user.selectOptions(
      within(screen.getByRole("region", { name: "Tickets" })).getByLabelText("Status"),
      "resolved",
    );
    await screen.findByText("No resolved tickets.");

    await user.type(screen.getByLabelText("Subject"), "Wrong filter");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    await screen.findByText('Ticket "Wrong filter" created');
    expect(
      screen.queryByRole("heading", { name: "Wrong filter" }),
    ).not.toBeInTheDocument();
  });

  it("removes a ticket from the list after it is deleted", async () => {
    const user = userEvent.setup();
    fetchTicketsMock.mockResolvedValue([
      buildTicket({ id: "1", title: "Doomed" }),
    ]);
    deleteTicketMock.mockResolvedValue(undefined);
    render(<App />);
    await screen.findByRole("heading", { name: "Doomed" });

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Doomed" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("drops an edited ticket from the list when its new status no longer matches the filter", async () => {
    const user = userEvent.setup();
    fetchTicketsMock.mockResolvedValue([
      buildTicket({ id: "1", title: "Move me", status: "new" }),
    ]);
    updateTicketMock.mockResolvedValue(
      buildTicket({ id: "1", title: "Move me", status: "resolved" }),
    );
    render(<App />);
    await screen.findByRole("heading", { name: "Move me" });
    await user.selectOptions(
      within(screen.getByRole("region", { name: "Tickets" })).getByLabelText("Status"),
      "new",
    );
    await screen.findByRole("heading", { name: "Move me" });

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.selectOptions(
      within(screen.getByRole("listitem")).getByLabelText("Status"),
      "resolved",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Move me" }),
      ).not.toBeInTheDocument(),
    );
  });
});
