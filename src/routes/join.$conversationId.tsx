import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/join/$conversationId")({
  component: JoinPage,
});

function JoinPage() {
  const { conversationId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    
    // If user is not logged in, redirect to login and save the intent
    if (!user) {
      sessionStorage.setItem("redirect_after_login", `/join/${conversationId}`);
      navigate({ to: "/login" });
      return;
    }

    // If logged in, join the group and go to chat
    api.updateMembers(conversationId, { add: [user.id] })
      .then(() => {
        navigate({ to: "/chat/$conversationId", params: { conversationId } });
      })
      .catch((err) => {
        setError(err.message || "Failed to join conversation. It might not exist.");
      });
  }, [user, loading, conversationId, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-strong rounded-3xl p-8 max-w-sm text-center">
          <h1 className="text-xl font-bold mb-2">Error Joining</h1>
          <p className="text-muted-foreground">{error}</p>
          <button 
            onClick={() => navigate({ to: "/chat" })} 
            className="mt-6 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            Go to my chats
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground font-medium">Joining conversation...</div>
    </div>
  );
}
