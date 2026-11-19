// Généré depuis out/Voting.sol/Voting.json (forge build)
export const votingAbi = [
      {
        inputs: [],
        stateMutability: "payable",
        type: "constructor",
      },
      // --- Erreurs personnalisées ---
      {
        inputs: [],
        name: "AlreadyRegistered",
        type: "error",
      },
      {
        inputs: [],
        name: "AlreadyVoted",
        type: "error",
      },
      {
        inputs: [],
        name: "EmptyProposal",
        type: "error",
      },
      {
        inputs: [
          {
            internalType: "enum Voting.WorkflowStatus",
            name: "expected",
            type: "uint8",
          },
          {
            internalType: "enum Voting.WorkflowStatus",
            name: "current",
            type: "uint8",
          },
        ],
        name: "InvalidWorkflowStatus",
        type: "error",
      },
      {
        inputs: [],
        name: "NotVoter",
        type: "error",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "owner",
            type: "address",
          },
        ],
        name: "OwnableInvalidOwner",
        type: "error",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "account",
            type: "address",
          },
        ],
        name: "OwnableUnauthorizedAccount",
        type: "error",
      },
      {
        inputs: [],
        name: "ProposalNotFound",
        type: "error",
      },
      // --- Événements ---
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "previousOwner",
            type: "address",
          },
          {
            indexed: true,
            internalType: "address",
            name: "newOwner",
            type: "address",
          },
        ],
        name: "OwnershipTransferred",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: "uint256",
            name: "proposalId",
            type: "uint256",
          },
        ],
        name: "ProposalRegistered",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: "address",
            name: "voter",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "proposalId",
            type: "uint256",
          },
        ],
        name: "Voted",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: "address",
            name: "voterAddress",
            type: "address",
          },
        ],
        name: "VoterRegistered",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: "enum Voting.WorkflowStatus",
            name: "previousStatus",
            type: "uint8",
          },
          {
            indexed: false,
            internalType: "enum Voting.WorkflowStatus",
            name: "newStatus",
            type: "uint8",
          },
        ],
        name: "WorkflowStatusChange",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: "uint256",
            name: "newSession",
            type: "uint256",
          },
        ],
        name: "SessionReset",
        type: "event",
      },
      // --- Fonctions ---
      {
        inputs: [
          {
            internalType: "string",
            name: "_desc",
            type: "string",
          },
        ],
        name: "addProposal",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "_addr",
            type: "address",
          },
        ],
        name: "addVoter",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "endProposalsRegistering",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "endVotingSession",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "uint256",
            name: "_id",
            type: "uint256",
          },
        ],
        name: "getOneProposal",
        outputs: [
          {
            components: [
              {
                internalType: "string",
                name: "description",
                type: "string",
              },
              {
                internalType: "uint256",
                name: "voteCount",
                type: "uint256",
              },
            ],
            internalType: "struct Voting.Proposal",
            name: "",
            type: "tuple",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "_addr",
            type: "address",
          },
        ],
        name: "getVoter",
        outputs: [
          {
            components: [
              {
                internalType: "bool",
                name: "isRegistered",
                type: "bool",
              },
              {
                internalType: "bool",
                name: "hasVoted",
                type: "bool",
              },
              {
                internalType: "uint128",
                name: "votedProposalId",
                type: "uint128",
              },
            ],
            internalType: "struct Voting.Voter",
            name: "",
            type: "tuple",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "owner",
        outputs: [
          {
            internalType: "address",
            name: "",
            type: "address",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "renounceOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "uint256",
            name: "_id",
            type: "uint256",
          },
        ],
        name: "setVote",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "startProposalsRegistering",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "startVotingSession",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "tallyVotes",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "newOwner",
            type: "address",
          },
        ],
        name: "transferOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "winningProposalID",
        outputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "workflowStatus",
        outputs: [
          {
            internalType: "enum Voting.WorkflowStatus",
            name: "",
            type: "uint8",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "currentSession",
        outputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "getProposalsCount",
        outputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "resetVotingSession",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ] as const;
