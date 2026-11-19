"use client";

import { useState } from "react";
import { WorkflowStatus } from "@/lib/contract";
import type { Proposal, VotingData } from "@/hooks/useVotingData";
import type { useVotingTx } from "@/hooks/useVotingTx";
import { buttonClass, Card, inputClass } from "./Card";

type Tx = ReturnType<typeof useVotingTx>;

export function ProposalsPanel({ data, tx }: { data: VotingData; tx: Tx }) {
  const [description, setDescription] = useState("");
  const { status, proposals, me } = data;
  const canPropose = status === WorkflowStatus.ProposalsRegistrationStarted;
  const canVote = status === WorkflowStatus.VotingSessionStarted && me && !me.hasVoted;
  const showCounts = status >= WorkflowStatus.VotingSessionStarted;
  const totalVotes = proposals.reduce((sum, p) => sum + p.voteCount, 0n);

  async function addProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    const ok = await tx.send({ functionName: "addProposal", args: [description.trim()] }, "Proposition enregistrée.");
    if (ok) setDescription("");
  }

  return (
    <Card title={`Propositions (${proposals.length})`}>
      {canPropose && (
        <form onSubmit={addProposal} className="mb-5 flex gap-2">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Votre proposition…"
            className={inputClass}
          />
          <button type="submit" disabled={!description.trim() || tx.isPending} className={`${buttonClass} shrink-0`}>
            Proposer
          </button>
        </form>
      )}

      {me?.hasVoted && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Vous avez voté pour la proposition n°{me.votedProposalId.toString()}.
        </p>
      )}

      {proposals.length === 0 ? (
        <p className="text-sm text-slate-500">
          {status === WorkflowStatus.RegisteringVoters
            ? "Les propositions ne sont pas encore ouvertes."
            : "Aucune proposition."}
        </p>
      ) : (
        <ul className="space-y-2">
          {proposals.map((p) => (
            <ProposalRow
              key={p.id.toString()}
              proposal={p}
              share={showCounts && totalVotes > 0n ? Number((p.voteCount * 1000n) / totalVotes) / 10 : undefined}
              showCount={showCounts}
              isMyVote={!!me?.hasVoted && me.votedProposalId === p.id}
              isWinner={status === WorkflowStatus.VotesTallied && data.winningProposalId === p.id}
              onVote={
                canVote
                  ? () => tx.send({ functionName: "setVote", args: [p.id] }, `Vote enregistré pour la proposition n°${p.id}.`)
                  : undefined
              }
              disabled={tx.isPending}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ProposalRow({
  proposal,
  share,
  showCount,
  isMyVote,
  isWinner,
  onVote,
  disabled,
}: {
  proposal: Proposal;
  share?: number;
  showCount: boolean;
  isMyVote: boolean;
  isWinner: boolean;
  onVote?: () => void;
  disabled: boolean;
}) {
  return (
    <li
      className={`relative overflow-hidden rounded-xl border px-4 py-3 ${
        isWinner ? "border-amber-400 bg-amber-50" : isMyVote ? "border-indigo-300" : "border-slate-200"
      }`}
    >
      {share !== undefined && (
        <div className="absolute inset-y-0 left-0 bg-indigo-50" style={{ width: `${share}%` }} aria-hidden />
      )}
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">n°{proposal.id.toString()}</p>
          <p className="truncate text-sm font-medium">
            {isWinner && ""}
            {proposal.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {showCount && (
            <span className="text-sm text-slate-600">
              {proposal.voteCount.toString()} vote{proposal.voteCount > 1n ? "s" : ""}
              {share !== undefined && <span className="text-slate-400"> · {share}%</span>}
            </span>
          )}
          {onVote && (
            <button onClick={onVote} disabled={disabled} className={buttonClass}>
              Voter
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
