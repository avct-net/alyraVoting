"use client";

import { useState } from "react";
import { useChainId, useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain } from "wagmi";
import { shortAddress } from "@/lib/contract";
import { chain } from "@/lib/wagmi";

export function ConnectButton({ role }: { role?: string }) {
  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const connectors = useConnectors();
  const { mutate: connect, isPending, error } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const { mutate: switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);
  // Le connecteur générique « injected » n'est utile que si un wallet est présent dans le navigateur.
  const available = connectors.filter(
    (c) => c.id !== "injected" || (typeof window !== "undefined" && "ethereum" in window),
  );

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {chainId !== chain.id && (
          <button
            onClick={() => switchChain({ chainId: chain.id })}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Basculer sur {chain.name}
          </button>
        )}
        {role && (
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">{role}</span>
        )}
        <span className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm">{shortAddress(address)}</span>
        <button
          onClick={() => disconnect()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
        >
          Déconnexion
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending ? "Connexion…" : "Se connecter"}
      </button>
      {error && !open && (
        <p className="absolute right-0 mt-2 w-64 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error.message.split("\n")[0]}
        </p>
      )}
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {available.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => {
                setOpen(false);
                connect({ connector });
              }}
              className="block w-full px-4 py-2.5 text-left text-sm hover:bg-indigo-50"
            >
              {connector.type === "injected" ? `Wallet du navigateur (${connector.name})` : connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
