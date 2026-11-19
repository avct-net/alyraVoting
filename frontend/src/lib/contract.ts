import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, type Address } from "viem";
import { votingAbi } from "./votingAbi";

export const VOTING_ADDRESS = (process.env.NEXT_PUBLIC_VOTING_ADDRESS ||
  "0xFbF6e3F3434Ce02C942Cfb643b42253F8602BF47") as Address;

export const DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK || "0");

export const votingContract = { address: VOTING_ADDRESS, abi: votingAbi } as const;

export enum WorkflowStatus {
  RegisteringVoters,
  ProposalsRegistrationStarted,
  ProposalsRegistrationEnded,
  VotingSessionStarted,
  VotingSessionEnded,
  VotesTallied,
}

type NextStepFunction =
  | "startProposalsRegistering"
  | "endProposalsRegistering"
  | "startVotingSession"
  | "endVotingSession"
  | "tallyVotes"
  | "resetVotingSession";

export const WORKFLOW_STEPS: { label: string; next?: { fn: NextStepFunction; label: string } }[] = [
  { label: "Inscription des électeurs", next: { fn: "startProposalsRegistering", label: "Ouvrir les propositions" } },
  { label: "Propositions ouvertes", next: { fn: "endProposalsRegistering", label: "Clore les propositions" } },
  { label: "Propositions closes", next: { fn: "startVotingSession", label: "Ouvrir le vote" } },
  { label: "Vote en cours", next: { fn: "endVotingSession", label: "Clore le vote" } },
  { label: "Vote clos", next: { fn: "tallyVotes", label: "Dépouiller les votes" } },
  { label: "Votes dépouillés", next: { fn: "resetVotingSession", label: "Démarrer une nouvelle session" } },
];

const ERROR_MESSAGES: Record<string, string> = {
  NotVoter: "Vous n'êtes pas inscrit comme électeur.",
  InvalidWorkflowStatus: "Action impossible à cette étape du vote.",
  AlreadyRegistered: "Cette adresse est déjà inscrite.",
  EmptyProposal: "La proposition ne peut pas être vide.",
  AlreadyVoted: "Vous avez déjà voté.",
  ProposalNotFound: "Proposition introuvable.",
  OwnableUnauthorizedAccount: "Seul l'administrateur peut effectuer cette action.",
};

export function formatError(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return "Transaction refusée dans le wallet.";
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && ERROR_MESSAGES[name]) return ERROR_MESSAGES[name];
      if (name) return name;
    }
    return error.shortMessage;
  }
  return error instanceof Error ? error.message : String(error);
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
