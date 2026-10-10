import type { UI } from './index';

const fr: UI = {
  site: {
    name: 'GlobalHealth',
    tagline: "Une information de santé fiable pour tous, partout.",
    description:
      "GlobalHealth réunit des connaissances médicales relues par des professionnels, des médicaments, le diagnostic, des annuaires de soins et un assistant santé IA dans une plateforme rapide et accessible, pensée pour le monde entier.",
  },

  nav: {
    home: 'Accueil',
    platform: 'Plateforme',
    solutions: 'Solutions',
    global: 'Monde',
    about: 'À propos',
    contact: 'Contact',
    menu: 'Menu',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    search: 'Rechercher',
    searchPlaceholder: 'Rechercher dans GlobalHealth…',
    searchHint: 'Appuyez sur',
    searchKey: 'K',
    language: 'Langue',
    appearance: 'Apparence',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    themeSystem: 'Système',
    signIn: 'Se connecter',
    getStarted: 'Commencer',
    emergency: "Numéros d'urgence",
    sectionPrimary: 'Principal',
    sectionExplore: 'Explorer',
  },

  a11y: {
    skip: 'Aller au contenu principal',
    mainNav: 'Navigation principale',
    footerNav: 'Navigation du pied de page',
    breadcrumb: "Fil d'Ariane",
    openSearch: 'Ouvrir la recherche',
    closeSearch: 'Fermer la recherche',
    searchDialog: 'Rechercher dans GlobalHealth',
    searchHintText: 'Saisissez pour rechercher. Utilisez les flèches pour naviguer et Entrée pour ouvrir.',
    resultsFor: 'Résultats pour',
    noResults: 'Aucune correspondance',
    noResultsHint: 'Essayez un mot plus court ou parcourez les pages de la plateforme ci-dessous.',
    clearSearch: 'Effacer la recherche',
    themeSwitch: 'Changer le thème de couleur',
    languageSwitch: 'Changer de langue',
    backToTop: 'Retour en haut',
    breadcrumbLabel: 'Vous êtes ici',
    loading: 'Chargement',
    close: 'Fermer',
    expand: 'Développer',
    collapse: 'Réduire',
    required: 'obligatoire',
    optional: 'facultatif',
    sectionLabel: 'Section',
    selectLanguage: 'Sélectionnez votre langue',
    chooseLanguage: 'Choisissez votre langue',
    languageHelp: 'GlobalHealth est disponible dans les langues suivantes.',
    continueInEnglish: 'Continuer en anglais',
    redirectsIn: 'Redirection vers',
    currentPage: 'Page actuelle',
  },

  common: {
    learnMore: 'En savoir plus',
    getStarted: 'Commencer',
    explore: 'Explorer',
    seeAll: 'Tout voir',
    viewDetails: 'Voir les détails',
    backHome: "Retour à l'accueil",
    back: 'Retour',
    new: 'Nouveau',
    beta: 'Bêta',
    free: 'Gratuit',
    popular: 'Populaire',
    recommended: 'Recommandé',
    next: 'Suivant',
    previous: 'Précédent',
    close: 'Fermer',
    cancel: 'Annuler',
    submit: 'Envoyer',
    search: 'Rechercher',
    filter: 'Filtrer',
    clear: 'Effacer',
    clearAll: 'Tout effacer',
    apply: 'Appliquer',
    reset: 'Réinitialiser',
    results: 'résultats',
    noResults: 'Aucun résultat',
    minutes: 'min',
    hours: 'h',
    readTime: 'de lecture',
    updated: 'Mis à jour',
    lastReviewed: 'Dernière révision',
    perMonth: '/mois',
    perYear: '/an',
    from: 'À partir de',
    yes: 'Oui',
    no: 'Non',
    copy: 'Copier',
    copied: 'Copié',
    step: 'Étape',
    of: 'sur',
  },

  footer: {
    explore: 'Explorer',
    company: 'Entreprise',
    legal: 'Mentions légales',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    rights: '© {year} GlobalHealth. Tous droits réservés.',
    disclaimer: 'GlobalHealth fournit une information santé éducative. Elle ne remplace ni un avis médical professionnel, ni un diagnostic, ni les soins d’urgence.',
    languageHeading: 'Langue',
    status: 'Tous les systèmes sont opérationnels',
    builtWith: 'Conçu pour les habitants de plus de 190 pays.',
  },

  hero: {
    badge: 'Relu par des professionnels · Disponible dans le monde entier',
    title: 'Tout ce qu’il faut pour comprendre votre santé,',
    titleAccent: 'au même endroit clair.',
    lead:
      "GlobalHealth transforme une information médicale dispersée en orientations claires et structurées : explications des symptômes, fiches de médicaments, préparation aux examens, annuaires de soins vérifiés et un assistant IA qui répond dans votre langue.",
    primary: 'Explorer la plateforme',
    secondary: "Parler à l'assistant IA",
    note: 'Gratuit · Sans compte pour le contenu essentiel · Fonctionne sur tout appareil',
    searchLabel: 'Rechercher des sujets de santé, médicaments, examens et symptômes',
    searchPlaceholder: 'Rechercher « diabète », « paracétamol », « numération formule sanguine »…',
    popular: 'Recherches populaires',
    suggestions: [
      'Diabète',
      'Paracétamol',
      'Numération formule sanguine',
      'Hypertension',
      'Migraine',
      'Hôpital le plus proche',
    ],
    trustLine: 'Utilisé par des particuliers et des soignants dans plus de 190 pays',
  },

  stats: {
    label: 'GlobalHealth en bref',
    items: [
      { value: '190+', label: 'Pays et territoires couverts' },
      { value: '12 000+', label: 'Sujets de santé relus par des professionnels' },
      { value: '8', label: "Langues d'interface, dont une écriture de droite à gauche" },
      { value: '< 1 s', label: 'Temps médian jusqu’à l’interactivité' },
    ],
  },

  trustBar: {
    label: 'Nos engagements',
    items: [
      'Relu par des professionnels de santé',
      'Rédaction en langage clair',
      'Aucune publicité sur les sujets de santé',
      'Orientation d’urgence en premier',
    ],
  },

  home: {
    quickActions: {
      eyebrow: 'Accès rapide',
      title: 'De quoi avez-vous besoin aujourd’hui ?',
      lead: "Six chemins directs vers les tâches les plus fréquentes.",
      items: [
        { title: 'Vérifier un symptôme', desc: 'Comprendre ce qu’un symptôme peut signifier et quand consulter.' },
        { title: 'Rechercher un médicament', desc: 'Indications, posologie, interactions, avertissements et profil de sécurité.' },
        { title: 'Se préparer à un examen', desc: 'Jeûne, préparation et lecture des résultats.' },
        { title: 'Trouver des soins proches', desc: 'Hôpitaux, cliniques, pharmacies et urgences dans votre secteur.' },
        { title: 'Interroger l’assistant IA', desc: 'Obtenez une réponse expliquée et sourcée, dans votre langue.' },
        { title: 'Lire l’actualité santé', desc: 'Information vérifiée sur les politiques, les épidémies et la recherche.' },
      ],
    },

    modules: {
      eyebrow: 'La plateforme',
      title: 'Six modules connectés, une seule expérience',
      lead:
        'Chaque module est utile seul. Ensemble, ils suppriment le changement d’onglet, les suppositions et les répétitions qui rendent l’information de santé épuisante.',
      items: [
        {
          tag: 'Connaissances',
          title: 'Bibliothèque de santé',
          desc: 'Des guides de maladies écrits pour de vraies personnes : symptômes, causes, diagnostic, traitement, autosoin et signaux d’alerte.',
        },
        {
          tag: 'Médicaments',
          title: 'Fiches de médicaments',
          desc: 'DCI et noms de marque, dosages, formes, interactions, contre-indications et conservation, revus selon un cycle fixe.',
        },
        {
          tag: 'Diagnostic',
          title: 'Centre d’examens',
          desc: 'Chaque analyse courante avec préparation, type de prélèvement, délai et un guide clair de ce que signifient les chiffres.',
        },
        {
          tag: 'Annuaire',
          title: 'Annuaire des soins',
          desc: 'Hôpitaux, spécialistes, cliniques, pharmacies et urgences, cartographiés et consultables par localisation et spécialité.',
        },
        {
          tag: 'Intelligence',
          title: 'Assistant santé IA',
          desc: 'Posez votre question dans une langue prise en charge. Les réponses citent leurs sources, énoncent leurs limites et n’inventent jamais un diagnostic.',
        },
        {
          tag: 'Coordination',
          title: 'Dossier et coordination',
          desc: 'Réunissez rendez-vous, résultats, ordonnances et plans de soins, et partagez-les avec les professionnels de votre choix.',
        },
      ],
    },

    how: {
      eyebrow: 'Comment ça marche',
      title: 'Trois étapes, sans approximation',
      lead: 'Conçu autour d’une seule question : que doit faire une personne maintenant ?',
      items: [
        {
          title: 'Décrivez la situation',
          desc: 'Tapez ou parlez. Commencez par un symptôme, un médicament, un résultat ou une question avec vos propres mots.',
        },
        {
          title: 'Obtenez une réponse structurée',
          desc: 'Des sections claires, des citations et un énoncé explicite de ce qui reste inconnu, avec le moment où un professionnel est nécessaire.',
        },
        {
          title: 'Agissez',
          desc: 'Réservez, enregistrez, imprimez ou partagez. Chaque réponse vise une décision, pas un nouvel onglet.',
        },
      ],
    },

    features: {
      eyebrow: 'Conçu pour le monde réel',
      title: 'Rapide, accessible et honnête par défaut',
      lead:
        'L’essentiel de l’information de santé en ligne est lente, saturée de publicité et difficile à lire. GlobalHealth est construit à l’inverse.',
      items: [
        {
          title: 'Chargé en moins de deux secondes',
          desc: 'Pages statiques, chargement différé, polices préchargées et aucun traceur tiers. La coquille complète pèse quelques kilo-octets.',
        },
        {
          title: 'Droite à gauche et huit écritures',
          desc: 'L’arabe s’affiche nativement en RTL. Latin, devanagari et CJK disposent de polices et d’interlignes réglés.',
        },
        {
          title: 'Complet au clavier et au lecteur d’écran',
          desc: 'Chaque commande est accessible et étiquetée, avec palette ⌘K, focus visible et prise en charge de la réduction des animations.',
        },
        {
          title: 'Des chiffres à votre locale',
          desc: 'Dates, doses et valeurs suivent votre région. Les calculatrices basculent entre unités métriques et impériales.',
        },
        {
          title: 'L’urgence toujours en premier',
          desc: 'Les numéros d’urgence locaux de chaque pays couvert, à un clic, sur toutes les pages.',
        },
        {
          title: 'Transparent sur les limites',
          desc: 'Sources, dates de révision et niveau de confiance affichés. Quand les preuves sont faibles, nous le disons.',
        },
      ],
    },

    standards: {
      eyebrow: 'Confiance et sécurité',
      title: 'L’information de santé n’est utile que si elle est fiable',
      lead: 'Ces standards sont appliqués dans notre chaîne éditoriale, pas seulement affichés dans une politique.',
      items: [
        {
          title: 'Relecture clinique',
          desc: 'Chaque sujet clinique est relu par un professionnel qualifié, avec nom, spécialité et date de révision enregistrés.',
        },
        {
          title: 'Sources traçables',
          desc: 'Chaque affirmation renvoie à la recommandation, à l’essai ou à l’avis de l’autorité dont elle provient.',
        },
        {
          title: 'Indépendance éditoriale',
          desc: 'Aucune publicité pharmaceutique, aucun placement payant dans les résultats, aucun lien d’affiliation dans le contenu clinique.',
        },
        {
          title: 'Limites visibles',
          desc: 'Chaque page indique ce qu’elle ne couvre pas et quand il faut arrêter de lire et contacter un professionnel.',
        },
      ],
      note:
        'GlobalHealth fournit des informations de santé et des outils de coordination des soins. Ce n’est pas un régulateur sanitaire, elle ne pose aucun diagnostic et ne remplace ni un professionnel habilité ni les services d’urgence.',
    },

    faq: {
      eyebrow: 'Questions',
      title: 'Tout ce qu’on demande avant de commencer',
      lead: 'Encore une question ? Notre équipe répond sous un jour ouvré.',
      items: [
        {
          q: 'GlobalHealth remplace-t-il un médecin ?',
          a: 'Non. GlobalHealth explique l’information de santé pour que vous puissiez mieux échanger avec un professionnel. Elle ne diagnostique pas, ne prescrit pas et ne soigne pas. En cas de danger possible, contactez immédiatement les secours de votre secteur.',
        },
        {
          q: 'Ai-je besoin d’un compte ?',
          a: 'Non. La bibliothèque, les fiches de médicaments, les guides d’examens, l’annuaire et l’assistant IA sont ouverts à tous. Le compte sert uniquement à enregistrer un dossier personnel et à coordonner les soins.',
        },
        {
          q: 'Comment l’exactitude est-elle garantie ?',
          a: 'Chaque page clinique porte un relecteur, une spécialité et une date. Le contenu soumis à un calendrier de révision est signalé avant expiration et déclassé visiblement jusqu’à une nouvelle validation.',
        },
        {
          q: 'Quelles langues sont prises en charge ?',
          a: 'L’interface complète existe en huit langues, dont l’arabe de droite à gauche. L’assistant peut aussi répondre dans la langue dans laquelle vous écrivez.',
        },
        {
          q: 'Mes données de santé sont-elles privées ?',
          a: 'Lire du contenu ne demande ni compte ni profil. Ce que vous choisissez d’enregistrer vous appartient, est exportable à tout moment et n’est ni vendu ni utilisé pour de la publicité.',
        },
        {
          q: 'Combien cela coûte-t-il ?',
          a: 'L’information essentielle est gratuite, sans publicité ni revente de données. Les offres institutionnelles ajoutent gouvernance, journal d’audit et intégrations.',
        },
      ],
    },

    cta: {
      title: 'Commencez par la question que vous avez vraiment',
      lead: 'Sans inscription, sans publicité, sans revente de données. Ouvrez la plateforme et commencez.',
      primary: 'Explorer la plateforme',
      secondary: 'Parler à notre équipe',
      note: 'Urgence ? Les numéros d’urgence locaux sont à un clic sur toutes les pages.',
    },
  },

  globalTeaser: {
    eyebrow: 'Monde',
    title: 'Conçu pour la façon dont la santé fonctionne réellement au-delà des frontières',
    lead:
      'Une plateforme mondiale doit respecter des règles, des langues et des réalités très différentes. GlobalHealth a été pensé ainsi dès la première ligne de code.',
    items: [
      { region: 'Asie du Sud', countries: 'Inde, Bangladesh, Népal, Sri Lanka', note: 'Contenu en langue locale, mode faible débit' },
      { region: 'Europe et Royaume-Uni', countries: 'UE, EEE, Suisse, Royaume-Uni', note: 'Contrôles de résidence des données alignés sur le RGPD' },
      { region: 'Amériques', countries: 'États-Unis, Canada, Mexique, Brésil', note: 'Tarifs et formats en USD/CAD/MXN/BRL' },
      { region: 'Afrique et Moyen-Orient', countries: 'Nigeria, Kenya, Afrique du Sud, EAU, Arabie saoudite', note: 'Arabe RTL, repli SMS en faible connexion' },
      { region: 'Asie-Pacifique', countries: 'Chine, Japon, Singapour, Australie, Indonésie', note: 'Typographie CJK et unités métriques par défaut' },
      { region: 'Reste du monde', countries: 'Plus de 190 pays et territoires', note: 'Format des nombres, dates et unités selon la locale' },
    ],
    cta: 'Voir la couverture mondiale',
  },

  pages: {
    platform: {
      eyebrow: 'Plateforme',
      title: 'Un système pour comprendre, décider et agir',
      lead:
        'GlobalHealth remplace les onze onglets, les trois PDF et le moteur de recherche que chacun assemble pour lui-même. Tous les modules partagent une identité, un dossier et un langage visuel.',
      heroPoints: [
        'Rendu statique avec amélioration progressive',
        'Un seul système de composants accessibles dans tous les modules',
        'Adapté à la locale dès la première requête, RTL compris',
        'Sources et dates de révision sur chaque affirmation clinique',
      ],
      moduleHeading: 'Dans chaque module',
      performance: {
        eyebrow: 'Ingénierie',
        title: 'La vitesse est une fonction clinique',
        lead: 'Une page qui met six secondes à s’afficher est inutilisable pour beaucoup et dangereuse pour certains. Voici nos objectifs.',
        items: [
          { label: 'LCP médian en 4G', value: '< 1,2 s' },
          { label: 'Décalage de mise en page cumulé', value: '< 0,02' },
          { label: 'JavaScript à l premier écran', value: '< 20 kB' },
          { label: 'Traceurs tiers', value: '0' },
        ],
      },
      architecture: {
        eyebrow: 'Architecture',
        title: 'Comment tout s’assemble',
        items: [
          {
            title: 'Statique par défaut',
            desc: 'Chaque page publique est pré-rendue à la compilation et servie depuis le bord d’un CDN. Aucun aller-retour serveur pour lire une information de santé.',
          },
          {
            title: 'Des îles, pas une application',
            desc: 'Les éléments interactifs — recherche, calculatrices, formulaires — se chargent comme de petits modules uniquement là où ils servent.',
          },
          {
            title: 'Tolérant au hors-ligne',
            desc: 'Un service worker met l’expérience de lecture en cache : les contenus essentiels restent accessibles en connexion faible ou pendant une coupure.',
          },
          {
            title: 'Fondations accessibles',
            desc: 'Repères sémantiques, gestion du focus, contrastes au-dessus de WCAG 2.2 AA et opérabilité complète au clavier, testés en intégration continue.',
          },
        ],
      },
      security: {
        eyebrow: 'Confiance',
        title: 'Confidentialité et sécurité par défaut',
        items: [
          'Aucun script publicitaire ou de profilage sur les pages de santé.',
          'Les dossiers personnels sont chiffrés en transit et au repos, et exportables par leur titulaire.',
          'Le consentement est explicite, révocable et horodaté.',
          'Les requêtes externes se limitent à nos polices auto-hébergées et à notre API.',
        ],
      },
    },

    solutions: {
      eyebrow: 'Solutions',
      title: 'Une plateforme, quatre usages',
      lead: 'Que vous gériez votre santé ou celle d’un service, GlobalHealth s’adapte à votre travail.',
      personas: [
        {
          key: 'individuals',
          label: 'Pour les particuliers',
          title: 'Comprendre sa santé sans approximation',
          desc: 'Cherchez un symptôme, un médicament ou un résultat, obtenez une explication structurée et sourcée, puis passez à l’étape suivante avec confiance.',
          points: [
            'Explications de symptômes avec signaux d’alerte clairs',
            'Fiches de médicaments avec interactions et avertissements',
            'Préparation aux examens et lecture des résultats',
            'Favoris enregistrés, résumés imprimables et rappels',
            'Assistant IA dans votre langue, 24 h sur 24',
          ],
        },
        {
          key: 'clinicians',
          label: 'Pour les soignants',
          title: 'Des réponses fiables au point de soin',
          desc: 'Réduisez le temps perdu en recherches. Tout est relu, daté et citable, donc utilisable en consultation comme en enseignement.',
          points: [
            'Recherche plein texte sur les maladies, examens et médicaments',
            'Résumés patients partageables avec les sources jointes',
            'Accès hors ligne dans les services peu connectés',
            'Supports pédagogiques pour les jeunes équipes et les étudiants',
            'Journal d’audit pour chaque ressource partagée',
          ],
        },
        {
          key: 'hospitals',
          label: 'Pour les hôpitaux',
          title: 'Une couche commune à tous les services',
          desc: 'Une source unique et gouvernée d’information de santé pour les soignants et les patients, avec la localisation et les rapports attendus par votre régulateur.',
          points: [
            'Identité institutionnelle, SSO et accès par rôle',
            'Politique de contenu personnalisée et circuits d’approbation',
            'Rapports d’usage, de qualité et d’équité',
            'Options d’hébergement régional et de résidence des données',
            'Intégration avec les dossiers patients et portails existants',
          ],
        },
        {
          key: 'pharmacies',
          label: 'Pour les pharmacies',
          title: 'Une information de délivrance réellement lue',
          desc: 'Donnez à vos clients une explication claire et à votre marque de ce qu’ils prennent, dans leur langue, au moment de la remise.',
          points: [
            'Pages de monographie de marque avec un langage patient',
            'Alertes d’interaction et de redondance thérapeutique',
            'Check-lists de conseil et dépliants imprimables',
            'Informations de stock, substitution et approvisionnement',
            'Intégration en marque blanche sur votre propre site',
          ],
        },
      ],
      cta: {
        title: 'Besoin d’une adaptation précise ?',
        lead: 'Décrivez le processus que vous souhaitez améliorer et nous le projeterons sur la plateforme.',
        primary: 'Parler à notre équipe',
        secondary: 'Lire la page confiance',
      },
    },

    global: {
      eyebrow: 'Monde',
      title: 'Une plateforme de santé qui respecte votre région',
      lead:
        'La localisation n’est pas une simple phase de traduction ici. Direction du texte, formats de nombres et de dates, unités par défaut, cadres juridiques et renvois d’urgence font partie du produit.',
      principles: {
        eyebrow: 'Principes',
        title: 'Ce que « mondial » signifie ici',
        items: [
          {
            title: 'Le RTL est natif',
            desc: 'L’arabe n’est pas un ajout mis en miroir. L’interface repose sur des propriétés logiques : palette de commandes et graphiques se reflètent correctement.',
          },
          {
            title: 'Typographie selon l’écriture',
            desc: 'Le texte latin utilise une police géométrique réglée, l’arabe un Naskh dédié, le devanagari sa propre pile, et le CJK les polices du système plutôt qu’un téléchargement de plusieurs mégaoctets.',
          },
          {
            title: 'Des formats locaux partout',
            desc: 'Dates, heures, séparateurs décimaux, numéros de téléphone et unités suivent votre locale, pas la nôtre.',
          },
          {
            title: 'Faible débit par défaut',
            desc: 'Un mode allégé retire images et animations, et l’orientation d’urgence se réduit à du texte simple qui fonctionne partout.',
          },
          {
            title: 'Cadres juridiques respectés',
            desc: 'Consentement, résidence et durée de conservation adaptés à la région, avec des valeurs alignées sur le RGPD dans l’UE et l’EEE.',
          },
          {
            title: 'Renvoi d’urgence local',
            desc: 'Depuis n’importe quelle page, un clic mène au bon numéro d’urgence de votre pays.',
          },
        ],
      },
      emergency: {
        eyebrow: 'Urgences',
        title: 'Le numéro qu’il vous faut, maintenant',
        lead:
          'GlobalHealth n’est pas un service d’urgence. Si quelqu’un est en danger immédiat, appelez le numéro ci-dessous pour votre pays ou votre numéro d’urgence local.',
        searchLabel: 'Rechercher un pays',
        searchPlaceholder: 'Rechercher par nom de pays…',
        empty: 'Aucun pays ne correspond à cette recherche.',
        showAll: 'Afficher tous les pays',
        tableNumber: "Numéro d'urgence",
        tableRegion: 'Région',
        copied: 'Numéro copié',
        callNow: 'Appeler',
        general: 'Urgence générale',
        note: 'Les numéros sont maintenus avec les autorités nationales. Si un numéro semble incorrect dans votre pays, signalez-le-nous.',
        report: 'Signaler un numéro incorrect',
      },
      regions: {
        eyebrow: 'Couverture',
        title: 'Où GlobalHealth est actif',
        items: [
          { region: 'Asie du Sud', countries: 'Inde, Bangladesh, Népal, Sri Lanka', note: 'Contenu en langue locale, mode faible débit' },
          { region: 'Europe et Royaume-Uni', countries: 'UE, EEE, Suisse, Royaume-Uni', note: 'Contrôles de résidence des données alignés sur le RGPD' },
          { region: 'Amériques', countries: 'États-Unis, Canada, Mexique, Brésil', note: 'Tarifs et formats en USD/CAD/MXN/BRL' },
          { region: 'Afrique et Moyen-Orient', countries: 'Nigeria, Kenya, Afrique du Sud, EAU, Arabie saoudite', note: 'Arabe RTL, repli SMS en faible connexion' },
          { region: 'Asie-Pacifique', countries: 'Chine, Japon, Singapour, Australie, Indonésie', note: 'Typographie CJK et unités métriques par défaut' },
          { region: 'Reste du monde', countries: 'Plus de 190 pays et territoires', note: 'Format des nombres, dates et unités selon la locale' },
        ],
      },
    },

    about: {
      eyebrow: 'À propos',
      title: 'Nous construisons une information de santé sur laquelle on peut agir',
      lead:
        'GlobalHealth existe parce que l’écart entre une recommandation publiée et la table d’une personne se mesure encore en heures de recherche, et se termine souvent en impasse.',
      mission: {
        eyebrow: 'Mission',
        title: 'Notre raison d’être',
        items: [
          {
            title: 'Comprendre plutôt qu’empiler',
            desc: 'Douze mille pages superficiels n’aident personne. Nous publions moins de sujets, et les rendons réellement complets.',
          },
          {
            title: 'La clarté sans simplifier à l’excès',
            desc: 'Nous conservons le sens clinique et retirons le jargon, pour permettre l’action sans dictionnaire.',
          },
          {
            title: 'Mondial dès la conception',
            desc: 'Localisation, accessibilité et faible débit sont des exigences, pas une phase de localisation tardive.',
          },
          {
            title: 'L’honnêteté comme fonction',
            desc: 'Nous publions dates de révision, sources et niveau de confiance, et disons clairement quand une information manque.',
          },
        ],
      },
      story: {
        eyebrow: 'Notre histoire',
        title: 'Comment nous en sommes arrivés là',
        paragraphs: [
          'GlobalHealth a commencé comme une référence interne pour des enseignants cliniques lassés de réexpliquer les mêmes vingt questions. Par des cycles de révision et le retour réel des lecteurs, elle est devenue une plateforme publique utilisée par des personnes qui ne l’avaient jamais rencontrée auparavant.',
          'Cette croissance a changé le cahier des charges. Une ressource pour les soignants et une ressource pour un adolescent dans une clinique rurale ne sont pas le même produit, et faire semblant est précisément la manière dont l’information de santé finit par tromper. La plateforme est construite pour qu’un clinicien trouve de la profondeur et qu’un lecteur novice trouve de la clarté, sur la même page.',
          'Nous sommes délibérément indépendants. Pas de publicité, pas de placement sponsorisé dans les résultats cliniques, pas de revente de données. C’est une décision commerciale, mais c’est aussi la raison pour laquelle les standards éditoriaux ont du sens.',
        ],
      },
      governance: {
        eyebrow: 'Gouvernance',
        title: 'Comment les décisions sont prises',
        items: [
          { title: 'Indépendance éditoriale', desc: 'Le contenu clinique est décidé par des cliniciens et des éditeurs, jamais par des partenaires commerciaux.' },
          { title: 'Responsabilité nominative', desc: 'Chaque page enregistre son auteur, son relecteur, sa spécialité et sa prochaine date de révision.' },
          { title: 'Corrections visibles', desc: 'Les erreurs sont corrigées sur place avec une note de modification. Nous ne supprimons pas silencieusement une recommandation.' },
          { title: 'Contre-expertise externe', desc: 'Un conseil clinique externe examine les standards chaque trimestre et peut bloquer une publication.' },
        ],
      },
      numbers: {
        eyebrow: 'Aujourd’hui',
        title: 'Où nous en sommes',
        items: [
          { value: '12 000+', label: 'Sujets relus par des professionnels' },
          { value: '190+', label: 'Pays et territoires' },
          { value: '8', label: "Langues d'interface" },
          { value: '0', label: 'Annonceurs et revendeurs de données' },
        ],
      },
    },

    contact: {
      eyebrow: 'Contact',
      title: 'Parlez à quelqu’un',
      lead:
        'Question sur un contenu, numéro d’urgence erroné, partenariat ou demande presse : votre message arrive à la bonne équipe. Nous répondons sous un jour ouvré.',
      channels: [
        {
          title: 'Demandes générales',
          desc: 'Tout ce qui ne relève pas d’un autre canal.',
          value: 'hello@globalhealth.health',
          href: 'mailto:hello@globalhealth.health',
        },
        {
          title: 'Corrections cliniques',
          desc: 'Signalez une inexactitude sur une page clinique. Indiquez son URL.',
          value: 'clinical@globalhealth.health',
          href: 'mailto:clinical@globalhealth.health',
        },
        {
          title: 'Partenariats et institutions',
          desc: 'Hôpitaux, réseaux de pharmacies, systèmes de santé et gouvernements.',
          value: 'partners@globalhealth.health',
          href: 'mailto:partners@globalhealth.health',
        },
        {
          title: 'Presse et médias',
          desc: 'Demandes presse, entretiens et éléments de marque.',
          value: 'press@globalhealth.health',
          href: 'mailto:press@globalhealth.health',
        },
      ],
      form: {
        title: 'Envoyez-nous un message',
        lead: 'Les champs obligatoires doivent être remplis. Vos données servent uniquement à vous répondre.',
        topic: 'Sujet',
        topicPlaceholder: 'Choisissez un sujet…',
        topics: ['Question générale', 'Correction clinique', 'Partenariat', 'Demande presse', 'Problème d’accessibilité', 'Autre'],
        name: 'Votre nom',
        email: 'Adresse e-mail',
        organisation: 'Organisation',
        organisationPlaceholder: 'Facultatif — hôpital, université, média',
        message: 'Message',
        messagePlaceholder: 'Décrivez votre besoin et joignez un lien s’il s’agit d’un contenu précis.',
        consent: 'J’accepte que GlobalHealth conserve ces informations afin de me répondre.',
        submit: 'Envoyer le message',
        sending: 'Envoi…',
        successTitle: 'Message envoyé',
        successBody: 'Merci. Votre message est bien arrivé, nous répondons sous un jour ouvré.',
        sendAnother: 'Envoyer un autre message',
        errorTitle: 'L’envoi a échoué',
        errorBody: 'Un problème est survenu de notre côté. Réessayez ou écrivez-nous directement.',
        requiredField: 'Ce champ est obligatoire.',
        invalidEmail: 'Veuillez saisir une adresse e-mail valide.',
        tooShort: 'Merci d’ajouter un peu plus de détail pour que nous puissions aider.',
        consentRequired: 'Merci de confirmer votre accord avant que nous répondions.',
        charCount: 'caractères',
      },
      response: {
        title: 'La suite',
        items: [
          { title: 'Sous un jour ouvré', desc: 'Une personne nommée vous répond, pas une réponse automatique.' },
          { title: 'Sous cinq jours', desc: 'Les corrections cliniques sont vérifiées par un relecteur, puis corrigées ou expliquées.' },
          { title: 'En permanence', desc: 'Tout ce qui concerne la sécurité des patients en urgence est escaladé le jour même.' },
        ],
      },
      accessibility: {
        title: 'Vous avez trouvé un obstacle d’accessibilité ?',
        desc: 'Indiquez-nous la page et ce qui s’est passé. Nous traitons les défauts d’accessibilité comme des bugs de production.',
        cta: 'Signaler un obstacle',
      },
    },

    legal: {
      lastUpdated: 'Dernière mise à jour',
      languageNotice: 'Ce document est publié en anglais. Un résumé traduit est affiché ci-dessous.',
      languageSummary: 'Résumé',
      privacySummary: 'Nous n’utilisons ni publicité ni suivi sur les pages santé, ne vendons jamais vos données, et tout ce que vous enregistrez vous appartient et est exportable. Les informations de santé sont chiffrées et vous pouvez y accéder, les corriger ou les effacer à tout moment.',
    termsSummary: 'GlobalHealth fournit une information santé générale. Ce n’est pas un avis médical et cela ne crée aucune relation médecin–patient. Le contenu peut être cité avec attribution ; toute reproduction massive exige une autorisation écrite.',
    contents: 'Sur cette page',
      backToTop: 'Retour en haut',
    },

    notFound: {
      code: '404',
      title: 'Cette page est introuvable',
      lead: 'Le lien est peut-être obsolète, ou la page a été déplacée. Voici le chemin le plus rapide pour revenir.',
      primary: "Aller à la page d'accueil",
      secondary: 'Rechercher dans GlobalHealth',
      help: 'Toujours bloqué ?',
      helpText: 'Dites-nous ce que vous cherchiez et nous vous y conduirons.',
    },
  },
};

export default fr;
