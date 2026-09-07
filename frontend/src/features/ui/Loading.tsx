type SpinnerProps = {
  label?: string;
  size?: "small" | "medium";
};

export function Spinner({
  label = "Loading",
  size = "medium"
}: SpinnerProps): React.ReactElement {
  return (
    <span
      aria-label={label}
      className={size === "small" ? "spinner spinner--small" : "spinner"}
      role="status"
    />
  );
}

export function ButtonSpinner({
  label = "Working"
}: {
  label?: string;
}): React.ReactElement {
  return <Spinner label={label} size="small" />;
}

export function LoadingState({
  message
}: {
  message: string;
}): React.ReactElement {
  return (
    <div className="catalog-state catalog-state--loading" role="status">
      <Spinner label={message} />
      <p className="message">{message}</p>
    </div>
  );
}

export function SkeletonBlock({
  className = ""
}: {
  className?: string;
}): React.ReactElement {
  return <span aria-hidden="true" className={`skeleton ${className}`} />;
}
