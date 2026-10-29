import { useId } from "react";
import { TICKET_STATUSES, type StatusFilter, type Ticket } from "../../types/ticket";
import { TicketItem } from "../ticket-item/ticket-item";
import styles from "./ticket-list.module.css";

interface TicketListProps {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  filter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  onUpdated: (updated: Ticket) => void;
  onDeleted: (id: string) => void;
}

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  new: "New",
  "in-progress": "In progress",
  "waiting-on-customer": "Waiting on customer",
  resolved: "Resolved",
};

export const TicketList = ({
  tickets,
  loading,
  error,
  filter,
  onFilterChange,
  onUpdated,
  onDeleted,
}: TicketListProps): React.JSX.Element => {
  const filterId = useId();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <div className={styles.toolbar}>
        <h2 id={headingId} className={styles.heading}>
          Tickets
        </h2>
        <div className={styles.filterField}>
          <label htmlFor={filterId}>Status</label>
          <select
            id={filterId}
            value={filter}
            onChange={(event) =>
              onFilterChange(event.target.value as StatusFilter)
            }
          >
            <option value="all">All</option>
            {TICKET_STATUSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p>Loading tickets...</p>}

      {!loading && error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {!loading && !error && tickets.length === 0 && (
        <p className={styles.empty}>
          {filter === "all"
            ? "No tickets yet. Create one above to get started."
            : `No ${FILTER_LABELS[filter].toLowerCase()} tickets.`}
        </p>
      )}

      {!loading && !error && tickets.length > 0 && (
        <ul className={styles.list}>
          {tickets.map((ticket) => (
            <TicketItem
              key={ticket.id}
              ticket={ticket}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
            />
          ))}
        </ul>
      )}
    </section>
  );
};
