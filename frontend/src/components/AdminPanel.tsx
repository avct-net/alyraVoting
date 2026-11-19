"use client";

import { useState } from "react";
import { isAddress, type Address } from "viem";
import { WORKFLOW_STEPS, WorkflowStatus } from "@/lib/contract";
import type { useVotingTx } from "@/hooks/useVotingTx";
import { buttonClass, Card, inputClass } from "./Card";

type Tx = ReturnType<typeof useVotingTx>;

export function AdminPanel({ status, tx }: { status: WorkflowStatus; tx: Tx }) {
  const [voter, setVoter] = useState("");
  const next = WORKFLOW_STEPS[status].next;
  const validAddress = isAddress(voter);

  async function addVoter(e: React.FormEvent) {
    e.preventDefault();
    if (!validAddress) return;
    const ok = await tx.send({ functionName: "addVoter", args: [voter as Address] }, "Électeur inscrit.");
    if (ok) setVoter("");
  }

  return (
    <Card title="Administration">
      {status === WorkflowStatus.RegisteringVoters && (
        <form onSubmit={addVoter} className="mb-5 space-y-2">
          <label className="text-sm font-medium text-slate-600" htmlFor="voter">
            Inscrire un électeur
          </label>
          <input
            id="voter"
            value={voter}
            onChange={(e) => setVoter(e.target.value.trim())}
            placeholder="0x…"
            className={`${inputClass} font-mono`}
          />
          {voter && !validAddress && <p className="text-xs text-rose-600">Adresse invalide.</p>}
          <button type="submit" disabled={!validAddress || tx.isPending} className={`${buttonClass} w-full`}>
            Inscrire
          </button>
        </form>
      )}

      {next ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            {status === WorkflowStatus.VotesTallied ? "Action disponible :" : "Étape suivante du workflow :"}
          </p>
          <button
            onClick={() => tx.send({ functionName: next.fn }, `${next.label} : fait.`)}
            disabled={tx.isPending}
            className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              status === WorkflowStatus.VotesTallied
                ? "bg-amber-600 hover:bg-amber-700 shadow-sm"
                : "bg-slate-900 hover:bg-slate-700"
            }`}
          >
            {status === WorkflowStatus.VotesTallied ? "" : ""}{next.label} →
          </button>
          {status === WorkflowStatus.VotesTallied && (
            <p className="text-xs text-slate-500">
              Réinitialise les propositions et les votes pour un nouveau cycle, tout en conservant les électeurs déjà inscrits.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-600">Le vote est terminé.</p>
      )}
    </Card>
  );
}
