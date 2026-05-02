import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }
    try {
      await login(username.trim(), password);
      navigate({ to: "/chat" });
    } catch {
      setError("Invalid credentials.");
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your private space.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Username">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={40}
            className="auth-input"
            placeholder="rahul"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            maxLength={200}
            className="auth-input"
            placeholder="••••••••"
          />
        </Field>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          className="bg-aurora glow w-full rounded-xl py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </motion.button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/signup" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-strong w-full max-w-md rounded-3xl p-8"
      >
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <div className="bg-aurora h-7 w-7 rounded-lg glow" />
          <span className="font-display text-lg font-bold">Aurora</span>
        </Link>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitle}</p>
        {children}
      </motion.div>
      <style>{`
        .auth-input {
          width: 100%;
          background: oklch(1 0 0 / 0.04);
          border: 1px solid var(--glass-border);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: var(--color-foreground);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .auth-input:focus {
          border-color: var(--ring);
          box-shadow: 0 0 0 3px var(--ring);
        }
      `}</style>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
