"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useChainId, useConnection, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { formatError, votingContract } from "@/lib/contract";
import { chain } from "@/lib/wagmi";

type WriteParams = Parameters<ReturnType<typeof useWriteContract>["mutateAsync"]>[0];
export type VotingCall = Omit<Extract<WriteParams, { functionName: string }>, "address" | "abi">;

export type TxState = { status: "idle" | "pending" | "success" | "error"; message?: string };

export function useVotingTx() {
  const { address } = useConnection();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { mutateAsync } = useWriteContract();
  const [state, setState] = useState<TxState>({ status: "idle" });

  async function send(call: VotingCall, successMessage: string) {
    if (!publicClient || !address) return false;
    setState({ status: "pending", message: "Transaction en cours…" });
    try {
      // 1. Force le wallet à basculer sur le bon réseau s'il est sur une autre chaîne
      if (currentChainId !== chain.id) {
        await switchChainAsync({ chainId: chain.id });
      }

      const request = { ...votingContract, ...call, chainId: chain.id } as WriteParams;
      await publicClient.simulateContract({ ...request, account: address } as never);
      const hash = await mutateAsync(request as never);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status !== "success") throw new Error("La transaction a échoué (revert).");
      setState({ status: "success", message: successMessage });
      await queryClient.invalidateQueries({ queryKey: ["voting"] });
      return true;
    } catch (error) {
      setState({ status: "error", message: formatError(error) });
      return false;
    }
  }

  return { send, state, isPending: state.status === "pending", reset: () => setState({ status: "idle" }) };
}
