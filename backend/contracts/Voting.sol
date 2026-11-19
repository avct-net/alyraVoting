// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

// [OPTIM] Import nommé : n'importe que le symbole utilisé (lisibilité, pas de collision de noms).
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Voting
/// @notice Système de vote simple : l'administrateur enregistre une liste blanche d'électeurs,
///         qui soumettent des propositions puis votent pour l'une d'elles.
/// @dev [SÉCURITÉ] Faille corrigée : déni de service (DoS) par dépassement de la limite de gas.
///      Dans la version d'origine, `tallyVotes` parcourait tout `proposalsArray`. Or n'importe
///      quel électeur peut ajouter un nombre illimité de propositions : avec ~11 000 propositions,
///      la boucle dépasse la limite de gas d'un bloc (30M), `tallyVotes` revert à chaque appel et
///      le workflow reste bloqué à jamais sur `VotingSessionEnded` (aucun résultat possible).
///      Correctif : la proposition en tête est mise à jour à chaque vote (`setVote`), donc
///      `tallyVotes` ne contient plus de boucle et coûte un montant de gas constant (O(1)).
contract Voting is Ownable {
    uint256 public winningProposalID;

    // [OPTIM] Packing : `votedProposalId` passe de uint256 à uint128 pour que la structure tienne
    // dans un seul slot de stockage (1 + 4 + 16 octets <= 32 octets).
    // Un vote écrit donc un seul slot (~20 000 gas économisés au premier vote).
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint128 votedProposalId;
    }

    struct VoterData {
        bool isRegistered;
        uint32 votedSession;
        uint128 votedProposalId;
    }

    uint256 public currentSession = 1;

    struct Proposal {
        string description;
        uint256 voteCount;
    }

    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    WorkflowStatus public workflowStatus;
    // Visibilité rendue explicite (était `internal` implicite) ; lecture via les getters.
    Proposal[] private proposalsArray;
    mapping(address => VoterData) private voters;

    // [SÉCURITÉ] Nouvelle variable : proposition actuellement en tête, mise à jour dans `setVote`.
    // Elle n'est recopiée dans `winningProposalID` qu'au moment de `tallyVotes`, pour que le
    // gagnant officiel ne soit publié qu'à la fin, comme dans la version d'origine.
    uint256 private leadingProposalId;

    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint256 proposalId);
    event Voted(address voter, uint256 proposalId);
    event SessionReset(uint256 newSession);

    // [OPTIM] Erreurs personnalisées à la place des `require` avec message texte :
    // bytecode plus petit (déploiement ~23 % moins cher) et revert moins coûteux.
    error NotVoter();
    error InvalidWorkflowStatus(WorkflowStatus expected, WorkflowStatus current);
    error AlreadyRegistered();
    error EmptyProposal();
    error AlreadyVoted();
    error ProposalNotFound();

    constructor() payable Ownable(msg.sender) {}

    modifier onlyVoters() {
        if (!voters[msg.sender].isRegistered) revert NotVoter();
        _;
    }

    // [OPTIM] Modifier de statut (suggéré par le commentaire de l'original) : remplace les
    // `require(workflowStatus == ...)` dupliqués dans chaque fonction.
    modifier atStatus(WorkflowStatus _status) {
        if (workflowStatus != _status) revert InvalidWorkflowStatus(_status, workflowStatus);
        _;
    }

    // ::::::::::::: GETTERS ::::::::::::: //

    function getVoter(address _addr) external view onlyVoters returns (Voter memory) {
        VoterData storage v = voters[_addr];
        bool voted = v.votedSession == currentSession;
        return Voter({
            isRegistered: v.isRegistered,
            hasVoted: voted,
            votedProposalId: voted ? v.votedProposalId : 0
        });
    }

    function getProposalsCount() external view returns (uint256) {
        return proposalsArray.length;
    }

    function getOneProposal(uint256 _id) external view onlyVoters returns (Proposal memory) {
        // Erreur explicite au lieu d'un panic (0x32) en cas d'index hors limites.
        if (_id >= proposalsArray.length) revert ProposalNotFound();
        return proposalsArray[_id];
    }

    // ::::::::::::: REGISTRATION ::::::::::::: //

    function addVoter(address _addr) external onlyOwner atStatus(WorkflowStatus.RegisteringVoters) {
        // [OPTIM] Pointeur `storage` : un seul calcul de l'emplacement dans le mapping
        // (au lieu de deux accès `voters[_addr]`).
        VoterData storage voter = voters[_addr];
        // [OPTIM] `!voter.isRegistered` au lieu de `!= true`.
        if (voter.isRegistered) revert AlreadyRegistered();

        voter.isRegistered = true;
        emit VoterRegistered(_addr);
    }

    // ::::::::::::: PROPOSAL ::::::::::::: //

    function addProposal(string calldata _desc)
        external
        onlyVoters
        atStatus(WorkflowStatus.ProposalsRegistrationStarted)
    {
        // [OPTIM] Test de la longueur au lieu de deux `keccak256(abi.encode(...))`.
        if (bytes(_desc).length == 0) revert EmptyProposal();

        // [OPTIM] Push direct du struct, sans variable `memory` intermédiaire.
        proposalsArray.push(Proposal(_desc, 0));
        // [OPTIM] `unchecked` : length >= 1 après le push, pas de risque d'underflow.
        unchecked {
            emit ProposalRegistered(proposalsArray.length - 1);
        }
    }

    // ::::::::::::: VOTE ::::::::::::: //

    function setVote(uint256 _id) external onlyVoters atStatus(WorkflowStatus.VotingSessionStarted) {
        // [OPTIM] Pointeur `storage` : un seul calcul de l'emplacement dans le mapping (au lieu de trois).
        VoterData storage voter = voters[msg.sender];
        if (voter.votedSession == currentSession) revert AlreadyVoted();
        if (_id >= proposalsArray.length) revert ProposalNotFound();

        // [OPTIM] Les deux champs sont dans le même slot : une seule écriture.
        voter.votedSession = uint32(currentSession);
        // forge-lint: disable-next-line(unsafe-typecast)
        voter.votedProposalId = uint128(_id); // sûr : _id < proposalsArray.length

        uint256 newCount;
        // [OPTIM] `unchecked` : le nombre de votes ne peut pas dépasser le nombre d'électeurs.
        unchecked {
            newCount = ++proposalsArray[_id].voteCount;
        }

        // [SÉCURITÉ] Mise à jour de la proposition en tête au fil des votes, ce qui supprime
        // la boucle de `tallyVotes`. Même règle d'égalité que l'ancien décompte :
        // à nombre de votes égal, le plus petit id l'emporte.
        uint256 leader = leadingProposalId;
        if (_id != leader) {
            uint256 leaderCount = proposalsArray[leader].voteCount;
            if (newCount > leaderCount || (newCount == leaderCount && _id < leader)) {
                leadingProposalId = _id;
            }
        }

        emit Voted(msg.sender, _id);
    }

    // ::::::::::::: STATE ::::::::::::: //

    function startProposalsRegistering() external onlyOwner atStatus(WorkflowStatus.RegisteringVoters) {
        // [OPTIM] Push direct du struct, sans variable `memory` intermédiaire.
        proposalsArray.push(Proposal("GENESIS", 0));
        _setStatus(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }

    function endProposalsRegistering() external onlyOwner atStatus(WorkflowStatus.ProposalsRegistrationStarted) {
        _setStatus(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    function startVotingSession() external onlyOwner atStatus(WorkflowStatus.ProposalsRegistrationEnded) {
        _setStatus(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
    }

    function endVotingSession() external onlyOwner atStatus(WorkflowStatus.VotingSessionStarted) {
        _setStatus(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }

    // [SÉCURITÉ] Plus de boucle sur `proposalsArray` : coût constant quel que soit le nombre de
    // propositions, donc un électeur malveillant ne peut plus bloquer le décompte.
    function tallyVotes() external onlyOwner atStatus(WorkflowStatus.VotingSessionEnded) {
        winningProposalID = leadingProposalId;
        _setStatus(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }

    /// @notice Réinitialise la session de vote pour un nouveau cycle tout en conservant les électeurs déjà inscrits.
    function resetVotingSession() external onlyOwner atStatus(WorkflowStatus.VotesTallied) {
        unchecked {
            ++currentSession;
        }
        delete proposalsArray;
        winningProposalID = 0;
        leadingProposalId = 0;
        _setStatus(WorkflowStatus.VotesTallied, WorkflowStatus.RegisteringVoters);
        emit SessionReset(currentSession);
    }

    // [OPTIM] Fonction commune aux changements de statut (au lieu de répéter affectation + event).
    function _setStatus(WorkflowStatus _previousStatus, WorkflowStatus _newStatus) private {
        workflowStatus = _newStatus;
        emit WorkflowStatusChange(_previousStatus, _newStatus);
    }
}
