import { shortAddress } from "@/lib/contract";
import type { VoterInfo } from "@/hooks/useVotingData";
import type { Address } from "viem";
import { Card } from "./Card";

export function VotersList({ voters, me }: { voters: VoterInfo[]; me?: Address }) {
  return (
    <Card title={`Électeurs inscrits (${voters.length})`}>
      {voters.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun électeur inscrit pour le moment.</p>
      ) : (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto">
          {voters.map((v) => (
            <li key={v.address} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="font-mono">
                {shortAddress(v.address)}
                {me && v.address.toLowerCase() === me.toLowerCase() && (
                  <span className="ml-2 font-sans text-xs text-indigo-600">(vous)</span>
                )}
              </span>
              {v.hasVoted !== undefined && (
                <span className={`text-xs font-medium ${v.hasVoted ? "text-emerald-600" : "text-slate-400"}`}>
                  {v.hasVoted ? "a voté" : "n'a pas voté"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
