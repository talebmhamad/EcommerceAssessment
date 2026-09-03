import { LoginForm } from "@/features/auth/LoginForm";

export default function LoginPage(): React.ReactElement {
  return (
    <main className="page-shell page-shell--centered">
      <LoginForm />
    </main>
  );
}
