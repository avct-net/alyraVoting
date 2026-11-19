"use client";

import { useSyncExternalStore } from "react";
import { useConnection } from "wagmi";
import { shortAddress, VOTING_ADDRESS, WORKFLOW_STEPS, WorkflowStatus } from "@/lib/contract";
import { useVotingData } from "@/hooks/useVotingData";
import { useVotingTx } from "@/hooks/useVotingTx";
import { AdminPanel } from "./AdminPanel";
import { Card } from "./Card";
import { ConnectButton } from "./ConnectButton";
import { ProposalsPanel } from "./ProposalsPanel";
import { Results } from "./Results";
import { TxToast } from "./TxToast";
import { VotersList } from "./VotersList";
import { WorkflowStepper } from "./WorkflowStepper";

export function VotingApp() {
  // Rendu uniquement côté client : l'état du wallet n'existe pas au rendu serveur.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      {mounted ? <Dashboard /> : <p className="text-sm text-slate-500">Chargement…</p>}
    </div>
  );
}

function Dashboard() {
  const { address, isConnected } = useConnection();
  const { data, error, isLoading } = useVotingData();
  const tx = useVotingTx();

  const role = data?.isOwner && data?.isVoter
    ? "Admin · Électeur"
    : data?.isOwner
      ? "Admin"
      : data?.isVoter
        ? "Électeur"
        : isConnected
          ? "Non inscrit"
          : undefined;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voting</h1>
          <p className="text-sm text-slate-500">
            Contrat <span className="font-mono">{shortAddress(VOTING_ADDRESS)}</span>
          </p>
        </div>
        <ConnectButton role={role} />
      </header>

      {error && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Impossible de lire le contrat : {error.message.split("\n")[0]}
        </p>
      )}
      {isLoading && <p className="text-sm text-slate-500">Lecture du contrat…</p>}

      {data && (
        <>
          <WorkflowStepper status={data.status} />

          {data.status === WorkflowStatus.VotesTallied && <Results data={data} />}

          {!isConnected ? (
            <Card title="Bienvenue">
              <p className="text-sm text-slate-600">
                Connectez-vous pour participer. Étape actuelle :{" "}
                <strong>{WORKFLOW_STEPS[data.status].label}</strong>.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                {data.isVoter ? (
                  <ProposalsPanel data={data} tx={tx} />
                ) : (
                  <Card title="Propositions">
                    <p className="text-sm text-slate-600">
                      {data.proposalCount} proposition(s). Seuls les électeurs inscrits peuvent consulter et
                      soumettre des propositions et voter.
                    </p>
                  </Card>
                )}
              </div>
              <div className="space-y-6">
                {data.isOwner && <AdminPanel status={data.status} tx={tx} />}
                <VotersList voters={data.voters} me={address} />
              </div>
            </div>
          )}
        </>
      )}

      <TxToast state={tx.state} onClose={tx.reset} />
    </>
  );
}
