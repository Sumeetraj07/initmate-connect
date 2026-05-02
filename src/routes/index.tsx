import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MessageSquare, Lock, AtSign, Mic, Users, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen overflow-hidden">
      <header className="sticky top-0 z-30">
        <div className="glass mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-full px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-aurora h-7 w-7 rounded-lg glow" />
            <span className="font-display text-lg font-bold tracking-tight">Aurora</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#mention" className="hover:text-foreground">Selective Send</a>
            <a href="#stack" className="hover:text-foreground">Stack</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-full px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link to="/signup" className="bg-aurora rounded-full px-4 py-1.5 text-sm font-medium text-primary-foreground glow">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-24 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="text-muted-foreground">Private. No feeds. No noise.</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
        >
          Messaging that{" "}
          <span className="text-aurora">whispers</span>
          <br />
          only to who you mean.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          A premium private messenger built for groups that need privacy <em>inside</em> the
          group. Mention someone with <span className="text-aurora font-semibold">@username</span> and your message
          stays invisible to everyone else.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link to="/signup" className="bg-aurora rounded-full px-7 py-3 font-semibold text-primary-foreground glow">
            Start messaging
          </Link>
          <Link to="/login" className="glass rounded-full px-7 py-3 font-medium">
            I have an account
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="glass-strong mx-auto mt-20 max-w-3xl rounded-3xl p-2"
        >
          <div className="rounded-[20px] bg-card/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-aurora h-9 w-9 rounded-full" />
                <div className="text-left">
                  <div className="font-semibold">Design Squad</div>
                  <div className="text-xs text-muted-foreground">5 members</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">now</div>
            </div>
            <div className="space-y-3 text-left text-sm">
              <Bubble who="Arjun">Looks 🔥</Bubble>
              <Bubble who="You" mine mention>
                <span className="text-aurora font-semibold">@priya</span> can you share the dark variant separately?
              </Bubble>
              <div className="ml-2 text-xs text-muted-foreground italic">
                🔒 Only Priya can see this message
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-32">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature icon={<AtSign />} title="Selective @mention" desc="Tag a member to make a message visible to them only — perfect for private asks inside busy groups." />
          <Feature icon={<Lock />} title="Truly private" desc="No public feeds, no follows, no algorithmic surface. Just the people you choose." />
          <Feature icon={<Mic />} title="Voice notes" desc="Press, speak, send. With waveforms and seen receipts." />
          <Feature icon={<Users />} title="Groups with admins" desc="Create rooms, manage members, hand off admin — without the chaos." />
          <Feature icon={<MessageSquare />} title="Realtime, everywhere" desc="Typing indicators, seen status, presence — instant on every device." />
          <Feature icon={<Sparkles />} title="Premium glass UI" desc="Midnight aurora glassmorphism with thoughtful motion. Built mobile-first." />
        </div>
      </section>

      <section id="stack" className="mx-auto max-w-4xl px-6 pb-24 text-center">
        <h2 className="font-display text-3xl font-bold">Frontend ready. Plug in your FastAPI.</h2>
        <p className="mt-3 text-muted-foreground">
          The whole UI talks through one adapter file (<code className="text-aurora">src/lib/api.ts</code>).
          Swap the mock implementation for <code>fetch</code> + <code>WebSocket</code> calls to your FastAPI/Postgres/Redis backend.
        </p>
      </section>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass rounded-2xl p-6"
    >
      <div className="bg-aurora mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
    </motion.div>
  );
}

function Bubble({ children, who, mine, mention }: { children: React.ReactNode; who: string; mine?: boolean; mention?: boolean }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? "bg-aurora text-primary-foreground" : "glass"} ${mention ? "ring-2 ring-accent/40" : ""}`}>
        {!mine && <div className="text-xs font-semibold text-accent mb-0.5">{who}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}
