import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      invite: {
        title: 'Invite to Match',
        selectGame: 'Select Game',
        selectCurrency: 'Select Currency',
        selectBet: 'Select Bet Amount',
        send: 'Send Invite',
        waiting: 'Waiting for response...',
        accepted: 'Invite accepted! Redirecting...',
        declined: 'Invite declined.',
        timeout: 'Invite expired.',
        error: 'Error sending invite.',
        self: 'Cannot invite yourself.',
        duplicate: 'Invite already sent and pending.',
        insufficient: 'Insufficient balance.',
        success: 'Invite sent!'
      },
      friends: {
        invite: 'Invite',
        invitedYou: '{{user}} invited you to play {{game}}!'
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
        loading: 'Loading...'
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
        invite: 'Inviter',
        invitedYou: '{{user}} vous a invité à jouer à {{game}} !'
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
        invite: 'Envite',
        invitedYou: '{{user}} envite ou jwe {{game}}!'
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