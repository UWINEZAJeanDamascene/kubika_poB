/**
 * Applies French translations for newly added locale sections.
 * Run: npx tsx scripts/patch-fr-translations.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fr from '../src/i18n/locales/fr.ts';
import { deepMerge } from '../src/i18n/utils/deepMerge.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const frOverrides = {
  landing: {
    home: {
      brandTagline: "le meilleur choix pour votre entreprise",
      nav: {
        platform: "Plateforme",
        operations: "Opérations",
        security: "Sécurité",
        pricing: "Tarifs",
      },
      ai: {
        open: "Ouvrir l'assistant Stacy AI",
        close: "Fermer l'assistant Stacy AI",
        label: "IA",
      },
      backToDashboard: "Retour au tableau de bord",
      logIn: "Se connecter",
      startNow: "Commencer",
      createWorkspace: "Créer un espace",
      branchOnline: "Agence {{city}} en ligne",
      badge: "Inventaire, finance et paie — conçu pour les entreprises rwandaises",
      heroTitle: "Gérez toute votre entreprise depuis un seul système.",
      heroSubtitle:
        "KUBIKA system gère le stock, les ventes, les achats, la comptabilité, la paie et les rapports en un seul endroit. Conçu pour les équipes avec plusieurs succursales, entrepôts ou entreprises.",
      signedIn: "Connecté{{name}}. Votre espace est prêt.",
      signedInAs: " en tant que {{name}}",
      returnToDashboard: "Retour au tableau de bord",
      startFreeTrial: "Essai gratuit",
      signIn: "Se connecter",
      badges: {
        multiBranch: "Multi-succursales",
        rraReady: "Rapports RRA",
        payrollIncluded: "Paie incluse",
        worksOffline: "Fonctionne hors ligne",
      },
      preview: {
        businessOverview: "Vue d'ensemble",
        liveDashboard: "Tableau de bord en direct",
        live: "En direct",
        netCash: "Trésorerie nette",
        sales: "Ventes",
        monthEnd: "Fin de mois",
        onTrack: "Dans les temps",
        itemsPending: "{{count}} éléments en attente",
        operatingSignals: "Signaux opérationnels",
        controlMesh: "Réseau de contrôle",
      },
      metrics: {
        modules: {
          value: "18+",
          label: "Modules métier",
          detail: "Inventaire, ventes, achats, finance, paie, rapports et plus — tout connecté.",
        },
        platform: {
          value: "Une",
          label: "Plateforme unifiée",
          detail: "Fini de basculer entre tableurs et différentes applications.",
        },
        reports: {
          value: "Quotidien",
          label: "Rapports prêts",
          detail: "De la trésorerie quotidienne aux états financiers annuels et déclarations RRA.",
        },
        company: {
          value: "Multi",
          label: "Multi-entreprise",
          detail: "Gérez plusieurs succursales ou entreprises depuis un seul compte.",
        },
      },
      signals: {
        cashRunway: { label: "Trésorerie disponible", status: "Sain" },
        stockValue: { label: "Valeur du stock", status: "Surveillé" },
        paidSuppliers: { label: "Payé aux fournisseurs", status: "Dans les temps" },
        payrollVariance: { label: "Écart de paie", status: "Contrôlé" },
      },
      platform: {
        eyebrow: "Une plateforme, chaque département",
        title: "Votre entrepôt, votre production et votre bureau s'accordent enfin sur les chiffres.",
        subtitle:
          "Arrêtez de basculer entre tableurs et applications. KUBIKA system connecte inventaire, ventes, achats, finance et paie pour une source unique de vérité.",
        seeModule: "Voir le module",
      },
      modules: {
        inventory: {
          name: "Inventaire & Stock",
          copy: "Suivez le stock en direct, les lots, numéros de série, transferts et alertes de réapprovisionnement.",
        },
        sales: {
          name: "Ventes & Facturation",
          copy: "Créez devis, factures, bons de livraison, avoirs et suivez les paiements clients.",
        },
        purchasing: {
          name: "Achats & Fournisseurs",
          copy: "Gérez bons de commande, GRN, retours, performance fournisseurs et dépenses engagées.",
        },
        finance: {
          name: "Finance & Comptabilité",
          copy: "Banque, créances, dettes, journaux, balance, P&L et bilan.",
        },
        hr: {
          name: "RH & Paie",
          copy: "Dossiers employés, paie, bulletins et coûts de main-d'œuvre.",
        },
        admin: {
          name: "Admin & Sécurité",
          copy: "Rôles, permissions, pistes d'audit, sauvegardes et workflows d'approbation.",
        },
      },
      operations: {
        eyebrow: "Comment ça marche",
        title: "Des transactions quotidiennes aux décisions claires.",
        subtitle:
          "Enregistrez une vente une fois. Le stock se met à jour. Les factures se génèrent. Les rapports sont prêts quand vous en avez besoin.",
        timeline: {
          record: {
            title: "Enregistrer",
            copy: "Consignez mouvements de stock, ventes, achats, dépenses et paie en un seul endroit.",
          },
          connect: {
            title: "Connecter",
            copy: "Vos données opérationnelles alimentent automatiquement les grands livres, budgets et rapports.",
          },
          decide: {
            title: "Décider",
            copy: "Connaissez votre trésorerie, niveaux de stock et obligations fiscales avant la clôture.",
          },
        },
        priorities: {
          title: "Priorités du jour",
          items: {
            approvePo: { title: "Approuver PO-1048", copy: "Arrivée de stock attendue" },
            lowStock: { title: "Alerte stock bas", copy: "14 articles sous le minimum" },
            payroll: { title: "Lancer la paie mensuelle", copy: "42 employés prêts" },
            reconcile: { title: "Rapprocher la banque", copy: "92% rapprochés automatiquement" },
          },
        },
        cashUnlocked: "Trésorerie libérée par des encaissements plus rapides",
        fewerStockouts: "Moins de ruptures grâce aux alertes intelligentes",
      },
      security: {
        title: "Sécurité et contrôle intégrés dès le premier jour.",
        subtitle:
          "Accès par rôle, pistes d'audit, sauvegardes automatiques et workflows d'approbation protègent vos données.",
        features: {
          multiCompany: "Multi-entreprise",
          multiBranch: "Multi-succursales",
          auditReporting: "Rapports auditables",
          bankControls: "Contrôles banque et caisse",
          budgetTracking: "Suivi budgétaire",
          roleAccess: "Accès par rôle",
        },
      },
      pricing: {
        eyebrow: "Tarification simple",
        title: "Des tarifs adaptés à la taille de votre entreprise.",
        subtitle:
          "Plans Starter, Business et Pro. Support local, Mobile Money et rapports TVA RRA inclus.",
        seeDashboard: "Voir le tableau de bord",
        builtForRwanda: "Conçu pour les entreprises rwandaises",
        builtForRwandaCopy:
          "Des boutiques à Kigali aux distributeurs à Musanze. Gérez le stock, payez les employés et déclarez vos impôts sans stress.",
        features: {
          mobileDashboard: "Tableau de bord mobile",
          stockAlerts: "Alertes stock en temps réel",
          vatReports: "Rapports TVA conformes RRA",
          whatsappSupport: "Support local via WhatsApp",
        },
      },
      footer: {
        tagline:
          "Stock, ventes, achats, comptabilité, paie et rapports — pour les entreprises rwandaises, conforme RRA.",
        login: "Connexion",
        copyright: "© {{year}} KUBIKA SYSTEM. Tous droits réservés.",
        builtInRwanda: "Fièrement conçu au Rwanda.",
      },
    },
  },
  dashboard: {
    executive: {
      commandCenter: "Centre de commande exécutif",
      liveData: "Données en direct",
      strong: "Solide",
      watch: "À surveiller",
      critical: "Critique",
      title: "Tableau de bord exécutif",
      subtitle:
        "Vue de direction sur la dynamique des revenus, la rentabilité, la trésorerie, les créances et l'activité financière.",
      newInvoice: "Nouvelle facture",
      finance: "Finance",
      refresh: "Actualiser",
      retry: "Réessayer",
      executiveScore: "Score exécutif",
      profitMargin: "Marge bénéficiaire",
      profitOnRevenue: "{{profit}} de bénéfice sur {{revenue}} de revenus",
      cashToRevenue: "Trésorerie / revenus",
      availableLiquidity: "{{amount}} de liquidités disponibles",
      momentumCurve: "Courbe de momentum",
      thisMonth: "Ce mois",
      lastMonth: "Mois dernier",
      revenueThisMonth: "Revenus ce mois",
      expensesThisMonth: "Dépenses ce mois",
      netProfit: "Bénéfice net",
      cashBalance: "Solde de trésorerie",
      boardKpiMatrix: "Matrice KPI du conseil",
      boardKpiSubtitle: "Indicateurs de santé normalisés en une vue comparable",
      profitability: "Rentabilité",
      collectionQuality: "Qualité de recouvrement",
      collectionCurrent: "{{percent}} à jour",
      debtCoverage: "Couverture de la dette",
      profitBridge: "Pont de profitabilité",
      profitBridgeSubtitle: "Revenus, charge de dépenses et contribution au profit",
      receivablesRisk: "Risque créances",
      receivablesSubtitle: "Exposition au recouvrement et concentration des impayés",
      noReceivables: "Aucune créance en cours",
      debtWatch: "Surveillance de la dette",
      debtWatchSubtitle: "Échéances de dette et couverture de liquidité",
      cashAlertTitle: "Alerte trésorerie critique : solde négatif de {{amount}}",
      cashAlertMessage: "Action immédiate requise. Accélérez les encaissements ou examinez le financement court terme.",
      collectReceivables: "Encaisser les créances",
      viewCashFlow: "Voir le flux de trésorerie",
      journal: "Journal",
      revenue: "Revenus",
      expenses: "Dépenses",
      profit: "Profit",
      netProfitLabel: "Bénéfice net",
      current: "À jour",
      overdue: "En retard",
      executiveScoreLabel: "Score exécutif",
      profitMarginLabel: "Marge bénéficiaire",
      arCurrent: "Créances à jour",
      debtCoverageLabel: "Couverture dette",
      cashRevenueRatio: "Trésorerie/Revenus",
      recentActivity: "Activité financière récente",
      recentActivitySubtitle: "Derniers mouvements comptables de votre vue exécutive",
      noActivity: "Aucune activité financière récente",
      viewAll: "View all",
      noComparison: "Pas de comparaison",
      vsLastMonth: "vs mois dernier",
      netPerformance: "Performance nette",
      outstanding: "En cours",
      invoicesCount: "{{count}} factures",
      currentCollectionStatus: "{{percent}} statut de recouvrement à jour",
      executiveActivityFeed: "Flux d'activité exécutif",
      executiveActivitySubtitle: "Derniers événements comptables publiés",
      boardSnapshot: "Aperçu du conseil",
      boardSnapshotSubtitle: "Indicateurs dérivés pour revue exécutive rapide",
      noJournalEntries: "Aucune écriture comptable",
      noDebtPayments: "Aucun paiement de dette dû dans les 30 prochains jours",
    },
  },
};

function serialize(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return JSON.stringify(obj);
  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';
  const lines = entries.map(([key, value]) => {
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return `${padInner}${safeKey}: ${serialize(value, indent + 1)},`;
    }
    return `${padInner}${safeKey}: ${JSON.stringify(value)},`;
  });
  return `{\n${lines.join('\n')}\n${pad}}`;
}

const merged = deepMerge(structuredClone(fr), frOverrides);
const output = `const fr = ${serialize(merged)} as const;\n\nexport default fr;\n`;
fs.writeFileSync(path.join(__dirname, '../src/i18n/locales/fr.ts'), output, 'utf8');
console.log('Patched French translations');
