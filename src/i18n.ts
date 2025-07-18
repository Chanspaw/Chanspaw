import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      invite: {
        title: 'Invite to Match',
        selectGame: 'Select game',
        selectCurrency: 'Select currency',
        selectBet: 'Select bet amount',
        send: 'Send invite',
        waiting: 'Waiting for response...',
        accepted: 'Invitation accepted! Redirecting you to the match...',
        declined: 'Invitation declined.',
        timeout: 'Invitation expired.',
        error: 'There was a problem sending your invitation. Please try again.',
        self: 'You cannot invite yourself.',
        duplicate: 'Invite already sent.',
        insufficient: 'You do not have enough balance to send this invite.',
        success: 'Your invitation has been sent!'
      },
      friends: {
        yourFriends: 'Your friends',
        friendRequests: 'Friend requests',
        findFriends: 'Find friends',
        invite: 'Invite',
        gameInvitation: 'Game Invitation',
        invitedYou: '{{user}} invited you to play {{game}}!',
        invitedYouToPlay: '{{user}} invited you to play {{game}}!',
        inviteReceived: 'You have received a new invitation.',
        inviteAccepted: 'Your invitation was accepted!',
        inviteDeclined: 'Your invitation was declined.',
        inviteTimeout: 'Your invitation has expired.',
        inviteFailed: 'Unable to send invite. Please try again.',
        invitePending: 'Invitation pending.',
        networkError: 'Network error. Please try again.',
        noFriendsYet: 'You have no friends yet.',
        startBySearching: 'Start by searching for new friends.',
        online: 'Online',
        offline: 'Offline',
        noPendingRequests: 'No pending requests.',
        allCaughtUp: 'You are all caught up!',
        selectGame: 'Select game'
      },
      games: {
        chess: 'Chess',
        connectFour: 'Connect Four',
        diamondHunt: 'Diamond Hunt',
        ticTacToe5x5: 'Tic Tac Toe 5x5',
        diceBattle: 'Dice Battle'
      },
      admin: {
        invites: 'Invites',
        matches: 'Matches',
        filter: 'Filter',
        cancel: 'Cancel',
        delete: 'Delete',
        refund: 'Refund',
        log: 'Log',
        status: 'Status',
        actions: 'Actions',
        user: 'User',
        game: 'Game',
        bet: 'Bet',
        currency: 'Currency',
        created: 'Created',
        expired: 'Expired',
        accepted: 'Accepted',
        declined: 'Declined',
        pending: 'Pending',
        completed: 'Completed',
        refunded: 'Refunded'
      },
      general: {
        accept: 'Accept',
        decline: 'Decline',
        close: 'Close',
        confirm: 'Confirm',
        cancel: 'Cancel',
        loading: 'Loading...',
        refresh: 'Refresh',
        search: 'Search',
        next: 'Next'
      }
    }
  },
  fr: {
    translation: {
      invite: {
        title: 'Inviter à un match',
        selectGame: 'Choisir le jeu',
        selectCurrency: 'Choisir la devise',
        selectBet: 'Choisir le montant du pari',
        send: 'Envoyer l\'invitation',
        waiting: 'En attente de réponse...',
        accepted: 'Invitation acceptée ! Redirection...',
        declined: 'Invitation refusée.',
        timeout: 'Invitation expirée.',
        error: 'Erreur lors de l\'envoi de l\'invitation.',
        self: 'Impossible de vous inviter vous-même.',
        duplicate: 'Invitation déjà envoyée et en attente.',
        insufficient: 'Solde insuffisant.',
        success: 'Invitation envoyée !'
      },
      friends: {
        yourFriends: 'Vos amis',
        friendRequests: 'Demandes d\'ami',
        findFriends: 'Trouver des amis',
        invite: 'Inviter',
        gameInvitation: 'Invitation de jeu',
        invitedYou: '{{user}} vous a invité à jouer à {{game}} !',
        invitedYouToPlay: '{{user}} vous a invité à jouer à {{game}} !',
        inviteReceived: 'Vous avez reçu une nouvelle invitation.',
        inviteAccepted: 'Votre invitation a été acceptée !',
        inviteDeclined: 'Votre invitation a été refusée.',
        inviteTimeout: 'Votre invitation a expiré.',
        inviteFailed: 'Impossible d\'envoyer l\'invitation. Veuillez réessayer.',
        invitePending: 'Invitation en attente.',
        networkError: 'Erreur réseau. Veuillez réessayer.',
        noFriendsYet: 'Vous n\'avez pas encore d\'amis.',
        startBySearching: 'Commencez par chercher de nouveaux amis.',
        online: 'En ligne',
        offline: 'Hors ligne',
        noPendingRequests: 'Aucune demande en attente.',
        allCaughtUp: 'Vous êtes à jour !',
        selectGame: 'Choisir le jeu'
      },
      admin: {
        invites: 'Invitations',
        matches: 'Matchs',
        filter: 'Filtrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        refund: 'Rembourser',
        log: 'Journal',
        status: 'Statut',
        actions: 'Actions',
        user: 'Utilisateur',
        game: 'Jeu',
        bet: 'Mise',
        currency: 'Devise',
        created: 'Créé',
        expired: 'Expiré',
        accepted: 'Accepté',
        declined: 'Refusé',
        pending: 'En attente',
        completed: 'Terminé',
        refunded: 'Remboursé'
      },
      general: {
        accept: 'Accepter',
        decline: 'Refuser',
        close: 'Fermer',
        confirm: 'Confirmer',
        cancel: 'Annuler',
        loading: 'Chargement...'
      }
    }
  },
  ht: {
    translation: {
      invite: {
        title: 'Envite pou yon match',
        selectGame: 'Chwazi jwèt la',
        selectCurrency: 'Chwazi lajan an',
        selectBet: 'Chwazi kantite parye a',
        send: 'Voye envitasyon',
        waiting: 'Ap tann repons...',
        accepted: 'Envitasyon aksepte! Nap redirije...',
        declined: 'Envitasyon refize.',
        timeout: 'Envitasyon ekspire.',
        error: 'Erè pandan ou voye envitasyon an.',
        self: 'Ou pa ka envite tèt ou.',
        duplicate: 'Envitasyon deja voye epi ap tann.',
        insufficient: 'Kantite lajan pa ase.',
        success: 'Envitasyon voye!'
      },
      friends: {
        yourFriends: 'Pwòp ou',
        friendRequests: 'Demande d\'ami',
        findFriends: 'Chwazi pwòp',
        invite: 'Envite',
        gameInvitation: 'Envitasyon jwèt',
        invitedYou: '{{user}} envite ou jwe {{game}}!',
        invitedYouToPlay: '{{user}} envite ou jwe {{game}}!',
        inviteReceived: 'Ou gen yon nouvo envitasyon.',
        inviteAccepted: 'Envitasyon ou a aksepte!',
        inviteDeclined: 'Envitasyon ou a refize.',
        inviteTimeout: 'Envitasyon ou a ekspire.',
        inviteFailed: 'Imposib pou voye envitasyon. Tanpri retyen.',
        invitePending: 'Envitasyon an atant.',
        networkError: 'Erè rezo. Tanpri retyen.',
        noFriendsYet: 'Ou pa gen pwòp ou ankò.',
        startBySearching: 'Kòmanse pa chwazi pwòp nouvo.',
        online: 'En ligne',
        offline: 'Hors ligne',
        noPendingRequests: 'Pa gen demande an atant.',
        allCaughtUp: 'Ou gen tout aksepte!',
        selectGame: 'Chwazi jwèt'
      },
      admin: {
        invites: 'Envitasyon',
        matches: 'Match',
        filter: 'Filtre',
        cancel: 'Anile',
        delete: 'Efase',
        refund: 'Ranmase',
        log: 'Jounal',
        status: 'Estati',
        actions: 'Aksyon',
        user: 'Itilizatè',
        game: 'Jwèt',
        bet: 'Pari',
        currency: 'Lajan',
        created: 'Kreye',
        expired: 'Ekspire',
        accepted: 'Aksepte',
        declined: 'Refize',
        pending: 'An atant',
        completed: 'Fini',
        refunded: 'Ranmase'
      },
      general: {
        accept: 'Aksepte',
        decline: 'Refize',
        close: 'Fèmen',
        confirm: 'Konfime',
        cancel: 'Anile',
        loading: 'Chaje...'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n; 