import type { VotingData } from "@/hooks/useVotingData";

export function Results({ data }: { data: VotingData }) {
  const winner = data.proposals.find((p) => p.id === data.winningProposalId);
  return (
    <section className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-6 shadow-sm">
      <p className="text-sm font-medium text-amber-700">Résultat du vote</p>
      <p className="mt-1 text-2xl font-bold">
        Proposition n°{data.winningProposalId.toString()}
        {winner && <span className="font-semibold text-slate-700"> : {winner.description}</span>}
      </p>
      {winner ? (
        <p className="mt-1 text-sm text-slate-600">
          {winner.voteCount.toString()} vote{winner.voteCount > 1n ? "s" : ""}
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-500">Le détail des propositions est réservé aux électeurs inscrits.</p>
      )}
    </section>
  );
}
