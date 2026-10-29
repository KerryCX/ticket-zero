import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TicketItem } from "./ticket-item";
import { deleteTicket, updateTicket } from "../../services/tickets-service";
import { buildTicket } from "../../test/fixtures";

vi.mock("../../services/tickets-service");

const updateTicketMock = vi.mocked(updateTicket);
const deleteTicketMock = vi.mocked(deleteTicket);

const renderItem = (ticket = buildTicket()) => {
  const onUpdated = vi.fn();
  const onDeleted = vi.fn();
  render(
    <ul>
      <TicketItem ticket={ticket} onUpdated={onUpdated} onDeleted={onDeleted} />
    </ul>,
  );
  return { onUpdated, onDeleted };
};

describe("TicketItem", () => {
  beforeEach(() => {
    updateTicketMock.mockReset();
    deleteTicketMock.mockReset();
  });

  describe("viewing", () => {
    it("shows the ticket details", () => {
      renderItem(
        buildTicket({ title: "VPN down", priority: "high", assignee: "Ada" }),
      );

      expect(
        screen.getByRole("heading", { name: "VPN down" }),
      ).toBeInTheDocument();
      expect(screen.getByText("New")).toBeInTheDocument();
      expect(screen.getByText("high")).toBeInTheDocument();
      expect(screen.getByText("Ada")).toBeInTheDocument();
    });

    it("shows Unassigned when there is no assignee", () => {
      renderItem(buildTicket({ assignee: null }));

      expect(screen.getByText("Unassigned")).toBeInTheDocument();
    });
  });

  describe("editing", () => {
    it("opens a form pre-filled with the current values", async () => {
      const user = userEvent.setup();
      renderItem(buildTicket({ title: "VPN down", assignee: "Ada" }));

      await user.click(screen.getByRole("button", { name: "Edit" }));

      expect(screen.getByLabelText("Subject")).toHaveValue("VPN down");
      expect(screen.getByLabelText("Assignee")).toHaveValue("Ada");
    });

    it("saves trimmed changes and reports the updated ticket", async () => {
      const user = userEvent.setup();
      const updated = buildTicket({ title: "VPN fixed", status: "resolved" });
      updateTicketMock.mockResolvedValue(updated);
      const { onUpdated } = renderItem(buildTicket({ title: "VPN down" }));

      await user.click(screen.getByRole("button", { name: "Edit" }));
      await user.clear(screen.getByLabelText("Subject"));
      await user.type(screen.getByLabelText("Subject"), "  VPN fixed  ");
      await user.selectOptions(screen.getByLabelText("Status"), "resolved");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
      expect(updateTicketMock).toHaveBeenCalledWith("ticket-1", {
        title: "VPN fixed",
        status: "resolved",
        priority: "medium",
        assignee: null,
      });
      expect(screen.queryByLabelText("Subject")).not.toBeInTheDocument();
    });

    it("rejects a whitespace-only subject without calling the API", async () => {
      const user = userEvent.setup();
      renderItem();

      await user.click(screen.getByRole("button", { name: "Edit" }));
      await user.clear(screen.getByLabelText("Subject"));
      await user.type(screen.getByLabelText("Subject"), "   ");
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Subject cannot be empty",
      );
      expect(updateTicketMock).not.toHaveBeenCalled();
    });

    it("shows the API error and stays in edit mode when saving fails", async () => {
      const user = userEvent.setup();
      updateTicketMock.mockRejectedValue(new Error("Ticket not found"));
      const { onUpdated } = renderItem();

      await user.click(screen.getByRole("button", { name: "Edit" }));
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Ticket not found",
      );
      expect(screen.getByLabelText("Subject")).toBeInTheDocument();
      expect(onUpdated).not.toHaveBeenCalled();
    });

    it("discards changes when cancelled", async () => {
      const user = userEvent.setup();
      renderItem(buildTicket({ title: "Original" }));

      await user.click(screen.getByRole("button", { name: "Edit" }));
      await user.clear(screen.getByLabelText("Subject"));
      await user.type(screen.getByLabelText("Subject"), "Changed");
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(
        screen.getByRole("heading", { name: "Original" }),
      ).toBeInTheDocument();
      expect(updateTicketMock).not.toHaveBeenCalled();
    });
  });

  describe("deleting", () => {
    it("asks for confirmation before deleting anything", async () => {
      const user = userEvent.setup();
      renderItem();

      await user.click(screen.getByRole("button", { name: "Delete" }));

      expect(screen.getByText("Delete this ticket?")).toBeInTheDocument();
      expect(deleteTicketMock).not.toHaveBeenCalled();
    });

    it("deletes the ticket once confirmed", async () => {
      const user = userEvent.setup();
      deleteTicketMock.mockResolvedValue(undefined);
      const { onDeleted } = renderItem();

      await user.click(screen.getByRole("button", { name: "Delete" }));
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => expect(onDeleted).toHaveBeenCalledWith("ticket-1"));
      expect(deleteTicketMock).toHaveBeenCalledWith("ticket-1");
    });

    it("backs out of the confirmation without deleting", async () => {
      const user = userEvent.setup();
      renderItem();

      await user.click(screen.getByRole("button", { name: "Delete" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByText("Delete this ticket?")).not.toBeInTheDocument();
      expect(deleteTicketMock).not.toHaveBeenCalled();
    });

    it("shows an error and returns to the normal buttons if the delete fails", async () => {
      const user = userEvent.setup();
      deleteTicketMock.mockRejectedValue(new Error("Server unavailable"));
      const { onDeleted } = renderItem();

      await user.click(screen.getByRole("button", { name: "Delete" }));
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Server unavailable",
      );
      expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
      expect(onDeleted).not.toHaveBeenCalled();
    });
  });
});
