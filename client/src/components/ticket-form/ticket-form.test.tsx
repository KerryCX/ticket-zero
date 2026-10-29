import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TicketForm } from "./ticket-form";
import { createTicket } from "../../services/tickets-service";
import { buildTicket } from "../../test/fixtures";

vi.mock("../../services/tickets-service");

const createTicketMock = vi.mocked(createTicket);

describe("TicketForm", () => {
  beforeEach(() => {
    createTicketMock.mockReset();
  });

  it("labels every field so it is reachable by assistive technology", () => {
    render(<TicketForm onCreated={vi.fn()} />);

    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Assignee (optional)")).toBeInTheDocument();
  });

  it("shows a validation message and does not call the API for an empty subject", async () => {
    const user = userEvent.setup();
    render(<TicketForm onCreated={vi.fn()} />);

    await user.type(screen.getByLabelText("Subject"), "   ");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    expect(screen.getByText("Subject is required")).toBeInTheDocument();
    expect(createTicketMock).not.toHaveBeenCalled();
  });

  it("submits trimmed values, reports the new ticket and resets the form", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const created = buildTicket({ title: "Broken login" });
    createTicketMock.mockResolvedValue(created);
    render(<TicketForm onCreated={onCreated} />);

    await user.type(screen.getByLabelText("Subject"), "  Broken login  ");
    await user.selectOptions(screen.getByLabelText("Priority"), "high");
    await user.type(screen.getByLabelText("Assignee (optional)"), " Sam ");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(createTicketMock).toHaveBeenCalledWith({
      title: "Broken login",
      status: "new",
      priority: "high",
      assignee: "Sam",
    });
    expect(screen.getByLabelText("Subject")).toHaveValue("");
    expect(screen.getByLabelText("Priority")).toHaveValue("medium");
    expect(screen.getByRole("status")).toHaveTextContent(
      'Ticket "Broken login" created',
    );
  });

  it("sends a null assignee when the field is left blank", async () => {
    const user = userEvent.setup();
    createTicketMock.mockResolvedValue(buildTicket());
    render(<TicketForm onCreated={vi.fn()} />);

    await user.type(screen.getByLabelText("Subject"), "No owner");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    await waitFor(() =>
      expect(createTicketMock).toHaveBeenCalledWith(
        expect.objectContaining({ assignee: null }),
      ),
    );
  });

  it("shows the API error and keeps what the user typed", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    createTicketMock.mockRejectedValue(new Error("Server unavailable"));
    render(<TicketForm onCreated={onCreated} />);

    await user.type(screen.getByLabelText("Subject"), "Will fail");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    expect(await screen.findByText("Server unavailable")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toHaveValue("Will fail");
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("announces feedback through a polite live region", () => {
    render(<TicketForm onCreated={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
