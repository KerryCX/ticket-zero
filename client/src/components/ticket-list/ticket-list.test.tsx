import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TicketList } from "./ticket-list";
import type { StatusFilter, Ticket } from "../../types/ticket";
import { buildTicket } from "../../test/fixtures";

interface RenderOptions {
  tickets?: Ticket[];
  loading?: boolean;
  error?: string | null;
  filter?: StatusFilter;
}

const renderList = ({
  tickets = [],
  loading = false,
  error = null,
  filter = "all",
}: RenderOptions = {}) => {
  const onFilterChange = vi.fn();
  render(
    <TicketList
      tickets={tickets}
      loading={loading}
      error={error}
      filter={filter}
      onFilterChange={onFilterChange}
      onUpdated={vi.fn()}
      onDeleted={vi.fn()}
    />,
  );
  return { onFilterChange };
};

describe("TicketList", () => {
  it("shows a loading message and no list while loading", () => {
    renderList({ loading: true, tickets: [buildTicket()] });

    expect(screen.getByText("Loading tickets...")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("announces errors with role=alert", () => {
    renderList({ error: "Failed to load tickets" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to load tickets",
    );
  });

  it("shows a getting-started message when there are no tickets at all", () => {
    renderList({ filter: "all" });

    expect(
      screen.getByText("No tickets yet. Create one above to get started."),
    ).toBeInTheDocument();
  });

  it("names the active filter in the empty message", () => {
    renderList({ filter: "waiting-on-customer" });

    expect(
      screen.getByText("No waiting on customer tickets."),
    ).toBeInTheDocument();
  });

  it("renders one list item per ticket", () => {
    renderList({
      tickets: [
        buildTicket({ id: "1", title: "First" }),
        buildTicket({ id: "2", title: "Second" }),
      ],
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "First" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Second" })).toBeInTheDocument();
  });

  it("offers every status as a filter option", () => {
    renderList();

    const options = screen
      .getAllByRole("option")
      .map((option) => option.getAttribute("value"));

    expect(options).toEqual([
      "all",
      "new",
      "in-progress",
      "waiting-on-customer",
      "resolved",
    ]);
  });

  it("reports the chosen filter", async () => {
    const user = userEvent.setup();
    const { onFilterChange } = renderList();

    await user.selectOptions(screen.getByLabelText("Status"), "resolved");

    expect(onFilterChange).toHaveBeenCalledWith("resolved");
  });
});
