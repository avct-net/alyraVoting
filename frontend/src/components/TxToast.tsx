"use client";

import { useEffect } from "react";
import type { TxState } from "@/hooks/useVotingTx";

export function TxToast({ state, onClose }: { state: TxState; onClose: () => void }) {
  useEffect(() => {
    if (state.status !== "success") return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [state, onClose]);

  if (state.status === "idle") return null;

  const styles = {
    pending: "border-indigo-200 bg-white text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-rose-200 bg-rose-50 text-rose-800",
  }[state.status];

  return (
    <div
      role="status"
      className={`fixed bottom-5 right-5 z-20 flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${styles}`}
    >
      {state.status === "pending" && (
        <span className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      )}
      <p className="flex-1">{state.message}</p>
      {state.status !== "pending" && (
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Fermer">
          ✕
        </button>
      )}
    </div>
  );
}
