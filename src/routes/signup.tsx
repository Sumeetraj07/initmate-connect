import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/useAuth";
import { AuthShell, Field } from "./login";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.username.trim() || !form.password.trim() || !form.email.trim()) {
      setError("All fields are required.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    try {
      await signup({
        name: form.name.trim() || form.username.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate({ to: "/chat" });
    } catch {
      setError("Could not create account.");
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Private by default. Always.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Display name">
          <input className="auth-input" maxLength={60} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Rahul Sharma" />
        </Field>
        <Field label="Username">
          <input className="auth-input" maxLength={30} value={form.username} onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="rahul" />
        </Field>
        <Field label="Email">
          <input type="email" className="auth-input" maxLength={120} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" />
        </Field>
        <Field label="Password">
          <input type="password" className="auth-input" maxLength={200} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 6 characters" />
        </Field>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          className="bg-aurora glow w-full rounded-xl py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create account"}
        </motion.button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have one?{" "}
        <Link to="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
