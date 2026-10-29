import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";
import { TICKET_STATUSES, type TicketStatus } from "../../types/ticket";

const LABELS: Record<TicketStatus, string> = {
  new: "New",
  "in-progress": "In progress",
  "waiting-on-customer": "Waiting on customer",
  resolved: "Resolved",
};

describe("StatusBadge", () => {
  it.each(TICKET_STATUSES)("shows a readable label for %s", (status) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(LABELS[status])).toBeInTheDocument();
  });
});
