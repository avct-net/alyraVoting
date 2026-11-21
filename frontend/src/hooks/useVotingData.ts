"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { useBlockNumber, useConnection, usePublicClient } from "wagmi";
import { DEPLOY_BLOCK, votingContract, WorkflowStatus } from "@/lib/contract";

export type Proposal = { id: bigint; description: string; voteCount: bigint };
export type VoterInfo = { address: Address; hasVoted?: boolean; votedProposalId?: bigint };

export type VotingData = {
  owner: Address;
  status: WorkflowStatus;
  winningProposalId: bigint;
  voters: VoterInfo[];
  proposalCount: number;
  isOwner: boolean;
  isVoter: boolean;
  me?: { hasVoted: boolean; votedProposalId: bigint };
  proposals: Proposal[];
};

const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** Lit tout l'état du contrat et le rafraîchit à chaque nouveau bloc. */
export function useVotingData() {
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  // Calculer un bloc de départ qui ne dépasse jamais 9 000 blocs en arrière
  const currentBlock = blockNumber ?? 0n;
  const safeFromBlock = currentBlock > 9000n && (currentBlock - DEPLOY_BLOCK > 9000n)
    ? currentBlock - 9000n
    : DEPLOY_BLOCK;

  return useQuery({
    queryKey: ["voting", address, blockNumber?.toString()],
    enabled: !!publicClient,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<VotingData> => {
      const client = publicClient!;
      const read = <T>(functionName: string, args: readonly unknown[] = [], account?: Address) =>
        client.readContract({ ...votingContract, functionName, args, account } as never) as Promise<T>;

      const [owner, status, winningProposalId, voterLogs, proposalLogs] = await Promise.all([
        read<Address>("owner"),
        read<number>("workflowStatus"),
        read<bigint>("winningProposalID"),
        client.getContractEvents({ ...votingContract, eventName: "VoterRegistered", fromBlock: safeFromBlock }),
        client.getContractEvents({ ...votingContract, eventName: "ProposalRegistered", fromBlock: safeFromBlock }),
      ]);

      const seen = new Set<string>();
      const voterAddresses = voterLogs
        .map((log) => log.args.voterAddress as Address)
        .filter((addr) => {
          if (!addr) return false;
          const lower = addr.toLowerCase();
          if (seen.has(lower)) return false;
          seen.add(lower);
          return true;
        });
      const isVoter = voterAddresses.some((v) => same(v, address));

      // Récupère les propositions de la session courante (soit via getProposalsCount, soit via les logs)
      let proposalIds: bigint[] = [];
      if (status >= WorkflowStatus.ProposalsRegistrationStarted) {
        try {
          const count = await read<bigint>("getProposalsCount");
          proposalIds = Array.from({ length: Number(count) }, (_, i) => BigInt(i));
        } catch {
          // La proposition GENESIS (id 0) est créée à l'ouverture des propositions, sans événement.
          proposalIds = [0n, ...proposalLogs.map((log) => log.args.proposalId as bigint)];
        }
      }

      let voters: VoterInfo[] = voterAddresses.map((a) => ({ address: a }));
      let proposals: Proposal[] = [];

      // Les getters sont réservés aux électeurs (onlyVoters) : on les appelle avec le compte connecté.
      if (isVoter && address) {
        type RawVoter = { isRegistered: boolean; hasVoted: boolean; votedProposalId: bigint };
        type RawProposal = { description: string; voteCount: bigint };
        const [voterInfos, proposalInfos] = await Promise.all([
          Promise.all(voterAddresses.map((v) => read<RawVoter>("getVoter", [v], address))),
          Promise.all(proposalIds.map((id) => read<RawProposal>("getOneProposal", [id], address))),
        ]);
        voters = voterAddresses.map((a, i) => ({
          address: a,
          hasVoted: voterInfos[i].hasVoted,
          votedProposalId: voterInfos[i].votedProposalId,
        }));
        proposals = proposalIds.map((id, i) => ({ id, ...proposalInfos[i] }));
      }

      const meInfo = voters.find((v) => same(v.address, address));

      return {
        owner,
        status: status as WorkflowStatus,
        winningProposalId,
        voters,
        proposalCount: proposalIds.length,
        isOwner: same(owner, address),
        isVoter,
        me:
          meInfo?.hasVoted !== undefined
            ? { hasVoted: meInfo.hasVoted, votedProposalId: meInfo.votedProposalId ?? 0n }
            : undefined,
        proposals,
      };
    },
  });
}
