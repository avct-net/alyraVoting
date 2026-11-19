import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("Voting Contract", function () {
  // Enum WorkflowStatus mapping for clarity
  const WorkflowStatus = {
    RegisteringVoters: 0,
    ProposalsRegistrationStarted: 1,
    ProposalsRegistrationEnded: 2,
    VotingSessionStarted: 3,
    VotingSessionEnded: 4,
    VotesTallied: 5,
  } as const;

  // -------------------------------------------------------------
  // FIXTURES
  // -------------------------------------------------------------

  async function deployVotingFixture() {
    const [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();
    const voting = await ethers.deployContract("Voting");

    return { voting, owner, voter1, voter2, voter3, nonVoter };
  }

  async function votersRegisteredFixture() {
    const fixture = await deployVotingFixture();
    const { voting, voter1, voter2, voter3 } = fixture;

    await voting.addVoter(voter1.address);
    await voting.addVoter(voter2.address);
    await voting.addVoter(voter3.address);

    return fixture;
  }

  async function proposalsRegistrationStartedFixture() {
    const fixture = await votersRegisteredFixture();
    const { voting } = fixture;

    await voting.startProposalsRegistering();

    return fixture;
  }

  async function proposalsSubmittedFixture() {
    const fixture = await proposalsRegistrationStartedFixture();
    const { voting, voter1, voter2 } = fixture;

    await voting.connect(voter1).addProposal("Proposal 1");
    await voting.connect(voter2).addProposal("Proposal 2");

    return fixture;
  }

  async function proposalsRegistrationEndedFixture() {
    const fixture = await proposalsSubmittedFixture();
    const { voting } = fixture;

    await voting.endProposalsRegistering();

    return fixture;
  }

  async function votingSessionStartedFixture() {
    const fixture = await proposalsRegistrationEndedFixture();
    const { voting } = fixture;

    await voting.startVotingSession();

    return fixture;
  }

  async function votingSessionEndedFixture() {
    const fixture = await votingSessionStartedFixture();
    const { voting, voter1, voter2, voter3 } = fixture;

    // voter1 and voter3 vote for Proposal 1 (id 1)
    // voter2 votes for Proposal 2 (id 2)
    await voting.connect(voter1).setVote(1);
    await voting.connect(voter2).setVote(2);
    await voting.connect(voter3).setVote(1);

    await voting.endVotingSession();

    return fixture;
  }

  async function votesTalliedFixture() {
    const fixture = await votingSessionEndedFixture();
    const { voting } = fixture;

    await voting.tallyVotes();

    return fixture;
  }

  // -------------------------------------------------------------
  // TESTS: Déploiement et Initialisation
  // -------------------------------------------------------------

  describe("Déploiement et Initialisation", function () {
    it("doit définir le bon propriétaire (owner)", async function () {
      const { voting, owner } = await networkHelpers.loadFixture(deployVotingFixture);
      expect(await voting.owner()).to.equal(owner.address);
    });

    it("doit initialiser le workflowStatus à RegisteringVoters (0)", async function () {
      const { voting } = await networkHelpers.loadFixture(deployVotingFixture);
      expect(await voting.workflowStatus()).to.equal(WorkflowStatus.RegisteringVoters);
    });

    it("doit initialiser winningProposalID à 0", async function () {
      const { voting } = await networkHelpers.loadFixture(deployVotingFixture);
      expect(await voting.winningProposalID()).to.equal(0n);
    });
  });

  // -------------------------------------------------------------
  // TESTS: Enregistrement des électeurs (addVoter)
  // -------------------------------------------------------------

  describe("Enregistrement des électeurs (addVoter)", function () {
    it("permet à l'administrateur d'enregistrer un électeur", async function () {
      const { voting, voter1 } = await networkHelpers.loadFixture(deployVotingFixture);

      await expect(voting.addVoter(voter1.address))
        .to.emit(voting, "VoterRegistered")
        .withArgs(voter1.address);
    });

    it("enregistre correctement l'électeur dans le mapping voters", async function () {
      const { voting, voter1 } = await networkHelpers.loadFixture(deployVotingFixture);
      await voting.addVoter(voter1.address);

      // Un électeur enregistré peut consulter son statut
      const voterInfo = await voting.connect(voter1).getVoter(voter1.address);
      expect(voterInfo.isRegistered).to.equal(true);
      expect(voterInfo.hasVoted).to.equal(false);
      expect(voterInfo.votedProposalId).to.equal(0n);
    });

    it("rejette l'enregistrement par un compte non-owner", async function () {
      const { voting, voter1, voter2 } = await networkHelpers.loadFixture(deployVotingFixture);

      await expect(
        voting.connect(voter1).addVoter(voter2.address)
      )
        .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
        .withArgs(voter1.address);
    });

    it("empêche d'enregistrer deux fois le même électeur", async function () {
      const { voting, voter1 } = await networkHelpers.loadFixture(deployVotingFixture);
      await voting.addVoter(voter1.address);

      await expect(
        voting.addVoter(voter1.address)
      ).to.be.revertedWithCustomError(voting, "AlreadyRegistered");
    });

    it("rejette l'enregistrement si le workflow n'est pas RegisteringVoters", async function () {
      const { voting, nonVoter } = await networkHelpers.loadFixture(proposalsRegistrationStartedFixture);

      await expect(
        voting.addVoter(nonVoter.address)
      )
        .to.be.revertedWithCustomError(voting, "InvalidWorkflowStatus")
        .withArgs(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    });
  });

  // -------------------------------------------------------------
  // TESTS: Enregistrement des propositions (Proposals)
  // -------------------------------------------------------------

  describe("Enregistrement des propositions", function () {
    describe("Démarrage de la session de propositions (startProposalsRegistering)", function () {
      it("permet à l'owner de démarrer l'enregistrement des propositions", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(votersRegisteredFixture);

        await expect(voting.startProposalsRegistering())
          .to.emit(voting, "WorkflowStatusChange")
          .withArgs(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);

        expect(await voting.workflowStatus()).to.equal(WorkflowStatus.ProposalsRegistrationStarted);

        // Vérifie que la proposition GENESIS a bien été ajoutée à l'index 0
        const genesis = await voting.connect(voter1).getOneProposal(0);
        expect(genesis.description).to.equal("GENESIS");
        expect(genesis.voteCount).to.equal(0n);
      });

      it("rejette l'appel par un non-owner", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(votersRegisteredFixture);

        await expect(
          voting.connect(voter1).startProposalsRegistering()
        )
          .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
          .withArgs(voter1.address);
      });

      it("rejette si le statut n'est pas RegisteringVoters", async function () {
        const { voting } = await networkHelpers.loadFixture(proposalsRegistrationStartedFixture);

        await expect(
          voting.startProposalsRegistering()
        )
          .to.be.revertedWithCustomError(voting, "InvalidWorkflowStatus")
          .withArgs(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
      });
    });

    describe("Ajout de propositions (addProposal)", function () {
      it("permet à un électeur enregistré de soumettre une proposition", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(proposalsRegistrationStartedFixture);

        // Premier ajout après GENESIS (id 0) -> émet id 1
        await expect(voting.connect(voter1).addProposal("Première proposition"))
          .to.emit(voting, "ProposalRegistered")
          .withArgs(1);

        const proposal = await voting.connect(voter1).getOneProposal(1);
        expect(proposal.description).to.equal("Première proposition");
        expect(proposal.voteCount).to.equal(0n);
      });

      it("permet d'ajouter plusieurs propositions successivement", async function () {
        const { voting, voter1, voter2 } = await networkHelpers.loadFixture(proposalsRegistrationStartedFixture);

        await expect(voting.connect(voter1).addProposal("Proposition A"))
          .to.emit(voting, "ProposalRegistered")
          .withArgs(1);

        await expect(voting.connect(voter2).addProposal("Proposition B"))
          .to.emit(voting, "ProposalRegistered")
          .withArgs(2);

        const prop1 = await voting.connect(voter1).getOneProposal(1);
        const prop2 = await voting.connect(voter1).getOneProposal(2);
        expect(prop1.description).to.equal("Proposition A");
        expect(prop2.description).to.equal("Proposition B");
      });

      it("rejette une proposition avec une description vide", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(proposalsRegistrationStartedFixture);

        await expect(
          voting.connect(voter1).addProposal("")
        ).to.be.revertedWithCustomError(voting, "EmptyProposal");
      });

      it("rejette la soumission par un non-électeur", async function () {
        const { voting, nonVoter } = await networkHelpers.loadFixture(proposalsRegistrationStartedFixture);

        await expect(
          voting.connect(nonVoter).addProposal("Idée non autorisée")
        ).to.be.revertedWithCustomError(voting, "NotVoter");
      });

      it("rejette la soumission si la session n'est pas ouverte", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(votersRegisteredFixture);

        await expect(
          voting.connect(voter1).addProposal("Trop tôt")
        )
          .to.be.revertedWithCustomError(voting, "InvalidWorkflowStatus")
          .withArgs(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.RegisteringVoters);
      });
    });

    describe("Fin de l'enregistrement des propositions (endProposalsRegistering)", function () {
      it("permet à l'owner de clôturer l'enregistrement des propositions", async function () {
        const { voting } = await networkHelpers.loadFixture(proposalsSubmittedFixture);

        await expect(voting.endProposalsRegistering())
          .to.emit(voting, "WorkflowStatusChange")
          .withArgs(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);

        expect(await voting.workflowStatus()).to.equal(WorkflowStatus.ProposalsRegistrationEnded);
      });

      it("rejette l'appel par un non-owner", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(proposalsSubmittedFixture);

        await expect(
          voting.connect(voter1).endProposalsRegistering()
        )
          .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
          .withArgs(voter1.address);
      });

      it("rejette si le statut n'est pas ProposalsRegistrationStarted", async function () {
        const { voting } = await networkHelpers.loadFixture(votersRegisteredFixture);

        await expect(
          voting.endProposalsRegistering()
        )
          .to.be.revertedWithCustomError(voting, "InvalidWorkflowStatus")
          .withArgs(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.RegisteringVoters);
      });
    });
  });

  // -------------------------------------------------------------
  // TESTS: Session de vote (Voting Session)
  // -------------------------------------------------------------

  describe("Session de vote", function () {
    describe("Démarrage de la session de vote (startVotingSession)", function () {
      it("permet à l'owner d'ouvrir la session de vote", async function () {
        const { voting } = await networkHelpers.loadFixture(proposalsRegistrationEndedFixture);

        await expect(voting.startVotingSession())
          .to.emit(voting, "WorkflowStatusChange")
          .withArgs(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);

        expect(await voting.workflowStatus()).to.equal(WorkflowStatus.VotingSessionStarted);
      });

      it("rejette l'appel par un non-owner", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(proposalsRegistrationEndedFixture);

        await expect(
          voting.connect(voter1).startVotingSession()
        )
          .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
          .withArgs(voter1.address);
      });

      it("rejette si le statut n'est pas ProposalsRegistrationEnded", async function () {
        const { voting } = await networkHelpers.loadFixture(proposalsRegistrationStartedFixture);

        await expect(
          voting.startVotingSession()
        )
          .to.be.revertedWithCustomError(voting, "InvalidWorkflowStatus")
          .withArgs(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.ProposalsRegistrationStarted);
      });
    });

    describe("Vote des électeurs (setVote)", function () {
      it("permet à un électeur de voter pour une proposition existante", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(votingSessionStartedFixture);

        await expect(voting.connect(voter1).setVote(1))
          .to.emit(voting, "Voted")
          .withArgs(voter1.address, 1);

        const voterInfo = await voting.connect(voter1).getVoter(voter1.address);
        expect(voterInfo.hasVoted).to.equal(true);
        expect(voterInfo.votedProposalId).to.equal(1n);

        const proposal = await voting.connect(voter1).getOneProposal(1);
        expect(proposal.voteCount).to.equal(1n);
      });

      it("permet de voter pour la proposition GENESIS (id 0)", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(votingSessionStartedFixture);

        await expect(voting.connect(voter1).setVote(0))
          .to.emit(voting, "Voted")
          .withArgs(voter1.address, 0);

        const genesis = await voting.connect(voter1).getOneProposal(0);
        expect(genesis.voteCount).to.equal(1n);
      });

      it("rejette si l'électeur a déjà voté", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(votingSessionStartedFixture);

        await voting.connect(voter1).setVote(1);

        await expect(
          voting.connect(voter1).setVote(1)
        ).to.be.revertedWithCustomError(voting, "AlreadyVoted");
      });

      it("rejette le vote pour une proposition inexistante", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(votingSessionStartedFixture);

        await expect(
          voting.connect(voter1).setVote(999)
        ).to.be.revertedWithCustomError(voting, "ProposalNotFound");
      });

      it("rejette le vote par un non-électeur", async function () {
        const { voting, nonVoter } = await networkHelpers.loadFixture(votingSessionStartedFixture);

        await expect(
          voting.connect(nonVoter).setVote(1)
        ).to.be.revertedWithCustomError(voting, "NotVoter");
      });

      it("rejette le vote si la session de vote n'a pas commencé", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(proposalsRegistrationEndedFixture);

        await expect(
          voting.connect(voter1).setVote(1)
        )
          .to.be.revertedWithCustomError(voting, "InvalidWorkflowStatus")
          .withArgs(WorkflowStatus.VotingSessionStarted, WorkflowStatus.ProposalsRegistrationEnded);
      });
    });

    describe("Clôture de la session de vote (endVotingSession)", function () {
      it("permet à l'owner de clore la session de vote", async function () {
        const { voting } = await networkHelpers.loadFixture(votingSessionStartedFixture);

        await expect(voting.endVotingSession())
          .to.emit(voting, "WorkflowStatusChange")
          .withArgs(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);

        expect(await voting.workflowStatus()).to.equal(WorkflowStatus.VotingSessionEnded);
      });

      it("rejette l'appel par un non-owner", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(votingSessionStartedFixture);

        await expect(
          voting.connect(voter1).endVotingSession()
        )
          .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
          .withArgs(voter1.address);
      });

      it("rejette si la session de vote n'est pas en cours", async function () {
        const { voting } = await networkHelpers.loadFixture(proposalsRegistrationEndedFixture);

        await expect(
          voting.endVotingSession()
        )
          .to.be.revertedWithCustomError(voting, "InvalidWorkflowStatus")
          .withArgs(WorkflowStatus.VotingSessionStarted, WorkflowStatus.ProposalsRegistrationEnded);
      });
    });
  });

  // -------------------------------------------------------------
  // TESTS: Dépouillement des votes (tallyVotes)
  // -------------------------------------------------------------

  describe("Dépouillement des votes (tallyVotes)", function () {
    it("détermine correctement la proposition gagnante et change le statut en VotesTallied", async function () {
      const { voting } = await networkHelpers.loadFixture(votingSessionEndedFixture);

      await expect(voting.tallyVotes())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);

      expect(await voting.workflowStatus()).to.equal(WorkflowStatus.VotesTallied);
      // Proposal 1 a reçu 2 votes (voter1 et voter3), Proposal 2 en a reçu 1
      expect(await voting.winningProposalID()).to.equal(1n);
    });

    it("gère l'égalité en favorisant le plus petit ID de proposition", async function () {
      const { voting, voter1, voter2 } = await networkHelpers.loadFixture(votingSessionStartedFixture);

      // voter1 vote pour Proposal 1, voter2 vote pour Proposal 2
      await voting.connect(voter1).setVote(1);
      await voting.connect(voter2).setVote(2);

      await voting.endVotingSession();
      await voting.tallyVotes();

      // Égalité (1 vote chacune) -> Proposal 1 l'emporte car id 1 < id 2
      expect(await voting.winningProposalID()).to.equal(1n);
    });

    it("gère l'égalité quand un vote ultérieur crée l'égalité avec un ID inférieur", async function () {
      // Scénario : voter1 vote pour Proposal 2 d'abord, puis voter2 vote pour Proposal 1
      const { voting, voter1, voter2 } = await networkHelpers.loadFixture(votingSessionStartedFixture);

      // Proposal 2 prend la tête avec 1 vote
      await voting.connect(voter1).setVote(2);
      // Proposal 1 égalise avec 1 vote -> comme 1 < 2, Proposal 1 doit devenir le nouveau leader
      await voting.connect(voter2).setVote(1);

      await voting.endVotingSession();
      await voting.tallyVotes();

      expect(await voting.winningProposalID()).to.equal(1n);
    });

    it("permet à une proposition avec plus de votes de dépasser le leader initial", async function () {
      const { voting, voter1, voter2, voter3 } = await networkHelpers.loadFixture(votingSessionStartedFixture);

      // Proposal 1 prend la tête
      await voting.connect(voter1).setVote(1);
      // Proposal 2 égalise
      await voting.connect(voter2).setVote(2);
      // Proposal 2 dépasse Proposal 1 avec un 2e vote
      await voting.connect(voter3).setVote(2);

      await voting.endVotingSession();
      await voting.tallyVotes();

      expect(await voting.winningProposalID()).to.equal(2n);
    });

    it("laisse winningProposalID à 0 (GENESIS) si aucun vote n'a été émis", async function () {
      const { voting } = await networkHelpers.loadFixture(votingSessionStartedFixture);

      await voting.endVotingSession();
      await voting.tallyVotes();

      expect(await voting.winningProposalID()).to.equal(0n);
    });

    it("rejette le dépouillement par un non-owner", async function () {
      const { voting, voter1 } = await networkHelpers.loadFixture(votingSessionEndedFixture);

      await expect(
        voting.connect(voter1).tallyVotes()
      )
        .to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount")
        .withArgs(voter1.address);
    });

    it("rejette le dépouillement si la session de vote n'est pas terminée", async function () {
      const { voting } = await networkHelpers.loadFixture(votingSessionStartedFixture);

      await expect(
        voting.tallyVotes()
      )
        .to.be.revertedWithCustomError(voting, "InvalidWorkflowStatus")
        .withArgs(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotingSessionStarted);
    });

    it("rejette un deuxième dépouillement si le statut est déjà VotesTallied", async function () {
      const { voting } = await networkHelpers.loadFixture(votesTalliedFixture);

      await expect(
        voting.tallyVotes()
      )
        .to.be.revertedWithCustomError(voting, "InvalidWorkflowStatus")
        .withArgs(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    });
  });

  // -------------------------------------------------------------
  // TESTS: Getters et contrôle d'accès
  // -------------------------------------------------------------

  describe("Getters et contrôle d'accès", function () {
    describe("getVoter", function () {
      it("permet à un électeur d'obtenir les informations d'un autre électeur", async function () {
        const { voting, voter1, voter2 } = await networkHelpers.loadFixture(votersRegisteredFixture);

        const info = await voting.connect(voter1).getVoter(voter2.address);
        expect(info.isRegistered).to.equal(true);
        expect(info.hasVoted).to.equal(false);
      });

      it("retourne des valeurs par défaut pour une adresse non enregistrée consultée par un électeur", async function () {
        const { voting, voter1, nonVoter } = await networkHelpers.loadFixture(votersRegisteredFixture);

        const info = await voting.connect(voter1).getVoter(nonVoter.address);
        expect(info.isRegistered).to.equal(false);
        expect(info.hasVoted).to.equal(false);
        expect(info.votedProposalId).to.equal(0n);
      });

      it("rejette l'appel par une adresse non enregistrée", async function () {
        const { voting, voter1, nonVoter } = await networkHelpers.loadFixture(votersRegisteredFixture);

        await expect(
          voting.connect(nonVoter).getVoter(voter1.address)
        ).to.be.revertedWithCustomError(voting, "NotVoter");
      });
    });

    describe("getOneProposal", function () {
      it("permet à un électeur de consulter une proposition existante", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(proposalsSubmittedFixture);

        const proposal = await voting.connect(voter1).getOneProposal(1);
        expect(proposal.description).to.equal("Proposal 1");
        expect(proposal.voteCount).to.equal(0n);
      });

      it("rejette la consultation si l'ID de proposition n'existe pas", async function () {
        const { voting, voter1 } = await networkHelpers.loadFixture(proposalsSubmittedFixture);

        await expect(
          voting.connect(voter1).getOneProposal(42)
        ).to.be.revertedWithCustomError(voting, "ProposalNotFound");
      });

      it("rejette la consultation par une adresse non enregistrée", async function () {
        const { voting, nonVoter } = await networkHelpers.loadFixture(proposalsSubmittedFixture);

        await expect(
          voting.connect(nonVoter).getOneProposal(0)
        ).to.be.revertedWithCustomError(voting, "NotVoter");
      });
    });
  });

  // -------------------------------------------------------------
  // TESTS: Scénario complet bout-en-bout
  // -------------------------------------------------------------

  describe("Scénario complet bout-en-bout", function () {
    it("exécute le cycle complet d'une élection avec plusieurs électeurs et propositions", async function () {
      const { voting, owner, voter1, voter2, voter3 } = await networkHelpers.loadFixture(deployVotingFixture);

      // 1. Enregistrement des électeurs
      await expect(voting.addVoter(voter1.address)).to.emit(voting, "VoterRegistered").withArgs(voter1.address);
      await expect(voting.addVoter(voter2.address)).to.emit(voting, "VoterRegistered").withArgs(voter2.address);
      await expect(voting.addVoter(voter3.address)).to.emit(voting, "VoterRegistered").withArgs(voter3.address);

      // 2. Démarrage des propositions
      await expect(voting.startProposalsRegistering())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);

      // 3. Soumission des propositions
      await expect(voting.connect(voter1).addProposal("Construire un parc"))
        .to.emit(voting, "ProposalRegistered")
        .withArgs(1);
      await expect(voting.connect(voter2).addProposal("Rénover l'école"))
        .to.emit(voting, "ProposalRegistered")
        .withArgs(2);

      // 4. Fin des propositions
      await expect(voting.endProposalsRegistering())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);

      // 5. Début de la session de vote
      await expect(voting.startVotingSession())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);

      // 6. Votes : voter1 et voter2 votent pour "Rénover l'école" (id 2), voter3 pour "Construire un parc" (id 1)
      await expect(voting.connect(voter1).setVote(2)).to.emit(voting, "Voted").withArgs(voter1.address, 2);
      await expect(voting.connect(voter2).setVote(2)).to.emit(voting, "Voted").withArgs(voter2.address, 2);
      await expect(voting.connect(voter3).setVote(1)).to.emit(voting, "Voted").withArgs(voter3.address, 1);

      // 7. Clôture des votes
      await expect(voting.endVotingSession())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);

      // 8. Dépouillement
      await expect(voting.tallyVotes())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);

      // 9. Vérification finale
      expect(await voting.workflowStatus()).to.equal(WorkflowStatus.VotesTallied);
      expect(await voting.winningProposalID()).to.equal(2n);

      const winningProp = await voting.connect(voter1).getOneProposal(2);
      expect(winningProp.description).to.equal("Rénover l'école");
      expect(winningProp.voteCount).to.equal(2n);
    });
  });
});
