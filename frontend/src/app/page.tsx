import { HealthStatus } from "@/features/health/HealthStatus";

export default function HomePage(): React.ReactElement {
  return (
    <main className="page-shell">
      <div className="page-content">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">Phase 1 foundation</p>
          <h1 id="page-title">Mini ecommerce platform foundation is running.</h1>
          <p className="lead">
            The frontend is live and checks the backend health endpoint through a
            centralized API service.
          </p>
        </section>

        <HealthStatus />
      </div>
    </main>
  );
}
