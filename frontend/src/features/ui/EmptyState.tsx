import type { ReactNode } from "react";

type EmptyStateProps = {
  action?: ReactNode;
  eyebrow?: string;
  message: string;
  title: string;
};

export function EmptyState({
  action,
  eyebrow = "Empty",
  message,
  title
}: EmptyStateProps): React.ReactElement {
  return (
    <div className="empty-state">
      <div className="empty-state__content">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="message">{message}</p>
      </div>

      {action ? <div className="empty-state__actions">{action}</div> : null}
    </div>
  );
}
