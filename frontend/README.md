# Front Voting (Next.js + Tailwind)

Interface du contrat `Voting.sol` optimisé (`../src/Voting.sol`), basée sur Next.js (App Router), Tailwind CSS, wagmi et viem.

## Fonctionnalités

- Connexion par wallet du navigateur (MetaMask…) ou, en local, par les comptes de test Anvil (sans wallet).
- Rôle affiché : Admin, Électeur ou Non inscrit.
- **Admin** : inscription des électeurs, passage aux étapes suivantes du workflow, dépouillement.
- **Électeur** : ajout de propositions, vote, suivi des résultats en direct, liste des électeurs (a voté ou non).
- Résultat final mis en avant après `tallyVotes`.
- Erreurs personnalisées du contrat (`AlreadyVoted`, `NotVoter`…) traduites en messages lisibles ; chaque transaction est simulée avant envoi.
- Rafraîchissement automatique à chaque nouveau bloc.

## Lancer en local

```bash
# 1. Nœud local
anvil

# 2. Déployer le contrat (depuis la racine du projet Foundry)
forge create src/Voting.sol:Voting --broadcast --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
# => adresse 0x5FbDB2315678afecb367f032d93F642f64180aa3 sur un Anvil neuf

# 3. Front
cd frontend
cp .env.example .env.local   # adapter NEXT_PUBLIC_VOTING_ADDRESS si besoin
npm install
npm run dev                  # http://localhost:3000
```

Le compte de test #0 est le propriétaire (admin) du contrat.

## Configuration (`.env.local`)

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_VOTING_ADDRESS` | Adresse du contrat déployé |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | Bloc de déploiement (lecture des événements) |
| `NEXT_PUBLIC_CHAIN_ID` | `31337` (Anvil) ou `11155111` (Sepolia) |
| `NEXT_PUBLIC_RPC_URL` | RPC utilisé par le navigateur (vide en local : `/rpc` est relayé par Next) |
| `LOCAL_RPC_URL` | Nœud vers lequel `/rpc` est relayé |

L'ABI (`src/lib/votingAbi.ts`) est générée à partir de `out/Voting.sol/Voting.json` après `forge build`.

## Structure

- `src/lib/` : configuration wagmi, ABI, constantes du workflow, traduction des erreurs
- `src/hooks/useVotingData.ts` : lecture de l'état du contrat (getters appelés avec le compte connecté, car réservés aux électeurs)
- `src/hooks/useVotingTx.ts` : simulation, envoi et confirmation des transactions
- `src/components/` : interface (connexion, étapes, administration, propositions, électeurs, résultat)
