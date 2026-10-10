import type { UI } from './index';

const de: UI = {
  site: {
    name: 'GlobalHealth',
    tagline: 'Verlässliche Gesundheitsinformation für alle, überall.',
    description:
      'GlobalHealth bündelt medizinisch geprüftes Wissen, Medikamente, Diagnostik, Versorgungsverzeichnisse und einen KI-Gesundheitsassistenten in einer schnellen, barrierearmen Plattform für die ganze Welt.',
  },

  nav: {
    home: 'Start',
    platform: 'Plattform',
    solutions: 'Lösungen',
    global: 'Global',
    about: 'Über uns',
    contact: 'Kontakt',
    menu: 'Menü',
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schließen',
    search: 'Suchen',
    searchPlaceholder: 'GlobalHealth durchsuchen…',
    searchHint: 'Drücke',
    searchKey: 'K',
    language: 'Sprache',
    appearance: 'Darstellung',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    themeSystem: 'System',
    signIn: 'Anmelden',
    getStarted: 'Loslegen',
    emergency: 'Notrufnummern',
    sectionPrimary: 'Haupt',
    sectionExplore: 'Entdecken',
  },

  a11y: {
    skip: 'Zum Hauptinhalt springen',
    mainNav: 'Hauptnavigation',
    footerNav: 'Fußzeilennavigation',
    breadcrumb: 'Brotkrümelnavigation',
    openSearch: 'Suche öffnen',
    closeSearch: 'Suche schließen',
    searchDialog: 'GlobalHealth durchsuchen',
    searchHintText: 'Tippe zum Suchen. Mit den Pfeiltasten navigieren, mit Enter öffnen.',
    resultsFor: 'Ergebnisse für',
    noResults: 'Keine Treffer',
    noResultsHint: 'Versuche ein kürzeres Wort oder entdecke die Plattformseiten unten.',
    clearSearch: 'Suche löschen',
    themeSwitch: 'Farbschema wechseln',
    languageSwitch: 'Sprache wechseln',
    backToTop: 'Nach oben',
    breadcrumbLabel: 'Sie befinden sich hier',
    loading: 'Wird geladen',
    close: 'Schließen',
    expand: 'Aufklappen',
    collapse: 'Zuklappen',
    required: 'Pflichtfeld',
    optional: 'optional',
    sectionLabel: 'Abschnitt',
    selectLanguage: 'Wähle deine Sprache',
    chooseLanguage: 'Wähle deine Sprache',
    languageHelp: 'GlobalHealth ist in den folgenden Sprachen verfügbar.',
    continueInEnglish: 'Auf Englisch fortfahren',
    redirectsIn: 'Weiterleitung zu',
    currentPage: 'Aktuelle Seite',
  },

  common: {
    learnMore: 'Mehr erfahren',
    getStarted: 'Loslegen',
    explore: 'Entdecken',
    seeAll: 'Alle ansehen',
    viewDetails: 'Details ansehen',
    backHome: 'Zur Startseite',
    back: 'Zurück',
    new: 'Neu',
    beta: 'Beta',
    free: 'Kostenlos',
    popular: 'Beliebt',
    recommended: 'Empfohlen',
    next: 'Weiter',
    previous: 'Zurück',
    close: 'Schließen',
    cancel: 'Abbrechen',
    submit: 'Senden',
    search: 'Suchen',
    filter: 'Filtern',
    clear: 'Löschen',
    clearAll: 'Alles löschen',
    apply: 'Anwenden',
    reset: 'Zurücksetzen',
    results: 'Ergebnisse',
    noResults: 'Keine Ergebnisse',
    minutes: 'Min.',
    hours: 'Std.',
    readTime: 'Lesezeit',
    updated: 'Aktualisiert',
    lastReviewed: 'Zuletzt geprüft',
    perMonth: '/Mon.',
    perYear: '/Jahr',
    from: 'Ab',
    yes: 'Ja',
    no: 'Nein',
    copy: 'Kopieren',
    copied: 'Kopiert',
    step: 'Schritt',
    of: 'von',
  },

  footer: {
    explore: 'Entdecken',
    company: 'Unternehmen',
    legal: 'Rechtliches',
    privacy: 'Datenschutz',
    terms: 'Nutzungsbedingungen',
    rights: '© {year} GlobalHealth. Alle Rechte vorbehalten.',
    disclaimer: 'GlobalHealth bietet Bildungsinhalte zu Gesundheitsthemen. Sie ersetzen weder ärztlichen Rat noch Diagnose oder Notfallversorgung.',
    languageHeading: 'Sprache',
    status: 'Alle Systeme betriebsbereit',
    builtWith: 'Gebaut für Menschen in über 190 Ländern.',
  },

  hero: {
    badge: 'Fachlich geprüft · Weltweit verfügbar',
    title: 'Alles, was du für ein Verständnis deiner Gesundheit brauchst,',
    titleAccent: 'an einem ruhigen Ort.',
    lead:
      'GlobalHealth macht verstreute medizinische Informationen klar und strukturiert verständlich: Symptome einordnen, Medikamente nachschlagen, Labortests vorbereiten, geprüfte Versorgungsverzeichnisse und ein KI-Assistent, der in deiner Sprache antwortet.',
    primary: 'Plattform entdecken',
    secondary: 'Mit dem KI-Assistenten sprechen',
    note: 'Kostenlos · Für Kerninhalte kein Konto nötig · Funktioniert auf jedem Gerät',
    searchLabel: 'Gesundheitsthemen, Medikamente, Tests und Symptome suchen',
    searchPlaceholder: 'Suche nach „Diabetes“, „Paracetamol“, „Blutbild“…',
    popular: 'Beliebte Suchen',
    suggestions: [
      'Diabetes',
      'Paracetamol',
      'Blutbild',
      'Bluthochdruck',
      'Migräne',
      'Nächstes Krankenhaus',
    ],
    trustLine: 'Genutzt von Menschen und Fachkräften in über 190 Ländern',
  },

  stats: {
    label: 'GlobalHealth auf einen Blick',
    items: [
      { value: '190+', label: 'Erreichte Länder und Regionen' },
      { value: '12.000+', label: 'Fachlich geprüfte Gesundheitsthemen' },
      { value: '8', label: 'Oberflächensprachen, inklusive Rechts-nach-links' },
      { value: '< 1 s', label: 'Median bis zur Interaktionsbereitschaft' },
    ],
  },

  trustBar: {
    label: 'Unsere Zusagen',
    items: [
      'Von Fachkräften geprüft',
      'Verständliche Sprache',
      'Keine Werbung bei Gesundheitsthemen',
      'Erste Hilfe immer zuerst',
    ],
  },

  home: {
    quickActions: {
      eyebrow: 'Schnellzugriff',
      title: 'Was brauchst du heute?',
      lead: 'Sechs direkte Wege zu den häufigsten Aufgaben.',
      items: [
        { title: 'Symptom einordnen', desc: 'Verstehe, was ein Symptom bedeuten kann und wann du Hilfe brauchst.' },
        { title: 'Medikament nachschlagen', desc: 'Anwendung, Dosierung, Wechselwirkungen, Warnhinweise und Sicherheitsprofil.' },
        { title: 'Test vorbereiten', desc: 'Nüchternheit, Vorbereitung und wie Ergebnisse gelesen werden.' },
        { title: 'Versorgung in der Nähe', desc: 'Kliniken, Praxen, Apotheken und Notfallversorgung in deiner Region.' },
        { title: 'KI-Assistenten fragen', desc: 'Erhalte eine erklärte, belegte Antwort in deiner Sprache.' },
        { title: 'Gesundheitsnews lesen', desc: 'Geprüfte Berichterstattung zu Politik, Ausbrüchen und Forschung.' },
      ],
    },

    modules: {
      eyebrow: 'Die Plattform',
      title: 'Sechs verbundene Module, ein Erlebnis',
      lead:
        'Jedes Modul ist für sich nützlich. Zusammen ersetzen sie das Tab-Wechseln, das Raten und die Wiederholung, die Gesundheitsinformationen so mühsam machen.',
      items: [
        {
          tag: 'Wissen',
          title: 'Gesundheitsbibliothek',
          desc: 'Krankheitsguides für echte Menschen geschrieben: Symptome, Ursachen, Diagnose, Behandlung, Selbsthilfe und die Warnzeichen, auf die es ankommt.',
        },
        {
          tag: 'Medikamente',
          title: 'Medikamentenmonografien',
          desc: 'Wirkstoff- und Handelsnamen, Stärken, Darreichungsformen, Wechselwirkungen, Gegenanzeigen und Lagerung – in festen Abständen geprüft.',
        },
        {
          tag: 'Diagnostik',
          title: 'Laborzentrum',
          desc: 'Jede gängige Untersuchung mit Vorbereitung, Probentyp, Bearbeitungszeit und einer verständlichen Erklärung der Werte.',
        },
        {
          tag: 'Verzeichnis',
          title: 'Versorgungsverzeichnis',
          desc: 'Kliniken, Fachärzte, Praxen, Apotheken und Notfallversorgung – kartiert und nach Ort und Fachgebiet durchsuchbar.',
        },
        {
          tag: 'Intelligenz',
          title: 'KI-Gesundheitsassistent',
          desc: 'Frage in jeder unterstützten Sprache. Antworten nennen ihre Quellen, benennen ihre Grenzen und erfinden niemals eine Diagnose.',
        },
        {
          tag: 'Koordination',
          title: 'Unterlagen & Koordination',
          desc: 'Termine, Befunde, Verordnungen und Behandlungspläne an einem Ort – teilbar mit den Fachkräften deiner Wahl.',
        },
      ],
    },

    how: {
      eyebrow: 'So funktioniert es',
      title: 'Drei Schritte, kein Rätselraten',
      lead: 'Entworfen rund um eine Frage: Was sollte ein Mensch als Nächstes tun?',
      items: [
        {
          title: 'Beschreibe, was los ist',
          desc: 'Tippe oder sprich. Beginne mit einem Symptom, einem Medikament, einem Befund oder einer Frage in eigenen Worten.',
        },
        {
          title: 'Erhalte eine strukturierte Antwort',
          desc: 'Klare Abschnitte, Quellenangaben und ein ausdrücklicher Hinweis auf das, was unbekannt ist – plus den Punkt, an dem professionelle Hilfe nötig wird.',
        },
        {
          title: 'Handle danach',
          desc: 'Terminieren, speichern, drucken oder teilen. Jede Antwort ist so gebaut, dass sie in einer Entscheidung endet.',
        },
      ],
    },

    features: {
      eyebrow: 'Für die echte Welt gebaut',
      title: 'Schnell, barrierearm und standardmäßig ehrlich',
      lead:
        'Die meisten Gesundheitsinhalte im Netz sind langsam, werbelastig und schwer lesbar. GlobalHealth ist umgekehrt gebaut.',
      items: [
        {
          title: 'Lädt in unter zwei Sekunden',
          desc: 'Statische Seiten, Code-Splitting, vorgeladene Schriften und keine Tracker von Dritten. Die gesamte Hülle wiegt nur wenige Kilobyte.',
        },
        {
          title: 'Rechts-nach-links und acht Schriften',
          desc: 'Arabisch wird nativ in RTL dargestellt. Lateinisch, Devanagari und CJK haben eigene, abgestimmte Schriftstapel und Zeilenhöhen.',
        },
        {
          title: 'Vollständig per Tastatur und Screenreader',
          desc: 'Jedes Bedienelement ist erreichbar und beschriftet – mit ⌘K-Palette, sichtbarem Fokus und Unterstützung für reduzierte Bewegung.',
        },
        {
          title: 'Zahlen im regionalen Format',
          desc: 'Daten, Dosierungen und Werte folgen deiner Region. Rechner lassen sich zwischen metrisch und imperial umschalten.',
        },
        {
          title: 'Notruf immer zuerst',
          desc: 'Lokale Notrufnummern für jedes abgedeckte Land – mit einem Tippen von jeder Seite aus erreichbar.',
        },
        {
          title: 'Transparent über Grenzen',
          desc: 'Quellen, Prüfdaten und Sicherheit sind sichtbar. Ist die Evidenz dünn, sagen wir das, statt zu raten.',
        },
      ],
    },

    standards: {
      eyebrow: 'Vertrauen & Sicherheit',
      title: 'Gesundheitsinformation hilft nur, wenn man ihr vertrauen kann',
      lead: 'Diese Standards werden in unserem Redaktionsprozess durchgesetzt, nicht nur in einer Richtlinie behauptet.',
      items: [
        {
          title: 'Fachliche Prüfung',
          desc: 'Jedes klinische Thema wird von einer qualifizierten Fachkraft mit dokumentiertem Namen, Fachgebiet und Prüfdatum geprüft.',
        },
        {
          title: 'Nachvollziehbare Quellen',
          desc: 'Aussagen verweisen auf die Guideline, die Studie oder die Behördenmitteilung, aus der sie stammen.',
        },
        {
          title: 'Redaktionelle Unabhängigkeit',
          desc: 'Keine Pharmawerbung, keine bezahlte Platzierung in Ergebnissen und keine Affiliate-Links in klinischen Inhalten.',
        },
        {
          title: 'Sichtbare Grenzen',
          desc: 'Jede Seite nennt, was sie nicht abdeckt, und wann man aufhören sollte zu lesen und eine Fachkraft zu kontaktieren.',
        },
      ],
      note:
        'GlobalHealth bietet Gesundheitsinformation und Werkzeuge für die Versorgungskoordination. Es ist keine medizinische Aufsichtsbehörde, stellt keine Diagnosen und ersetzt weder eine zugelassene Fachkraft noch den Rettungsdienst.',
    },

    faq: {
      eyebrow: 'Fragen',
      title: 'Alles, was man vor dem Start wissen will',
      lead: 'Noch unsicher? Unser Support antwortet innerhalb eines Werktags.',
      items: [
        {
          q: 'Ersetzt GlobalHealth eine Ärztin oder einen Arzt?',
          a: 'Nein. GlobalHealth erklärt Gesundheitsinformation, damit du bessere Gespräche mit Fachkräften führen kannst. Es diagnostiziert, verschreibt und behandelt nicht. Besteht Gefahr, wende dich sofort an den örtlichen Rettungsdienst.',
        },
        {
          q: 'Brauche ich ein Konto?',
          a: 'Nein. Bibliothek, Monografien, Testleitfäden, Verzeichnis und KI-Assistent sind frei zugänglich. Ein Konto brauchst du nur, um persönliche Unterlagen zu speichern und Versorgung zu koordinieren.',
        },
        {
          q: 'Wie bleibt der Inhalt aktuell?',
          a: 'Jede klinische Seite trägt Prüfer, Fachgebiet und Prüfdatum. Inhalte mit festem Prüfzyklus werden vor Ablauf markiert und sichtbar herabgestuft, bis sie erneut freigegeben werden.',
        },
        {
          q: 'Welche Sprachen werden unterstützt?',
          a: 'Die Oberfläche erscheint in acht Sprachen, darunter Rechts-nach-links-Arabisch. Der Assistent antwortet außerdem in der Sprache, in der du schreibst.',
        },
        {
          q: 'Sind meine Gesundheitsdaten privat?',
          a: 'Für das Lesen braucht es kein Konto und es entsteht kein Profil. Was du speicherst, gehört dir, ist jederzeit exportierbar und wird weder verkauft noch für Werbung genutzt.',
        },
        {
          q: 'Was kostet es?',
          a: 'Die Kerninhalte sind kostenlos, ohne Werbung und ohne Datenverkauf. Institutionelle Tarife ergänzen Governance, Audit-Protokolle und Integrationen.',
        },
      ],
    },

    cta: {
      title: 'Beginne mit der Frage, die du wirklich hast',
      lead: 'Keine Registrierung, keine Werbung, kein Datenverkauf. Öffne die Plattform und leg los.',
      primary: 'Plattform entdecken',
      secondary: 'Mit unserem Team sprechen',
      note: 'Notfall? Lokale Notrufnummern sind von jeder Seite aus mit einem Tippen erreichbar.',
    },
  },

  globalTeaser: {
    eyebrow: 'Global',
    title: 'Gebaut für die Realität von Gesundheitsversorgung über Grenzen hinweg',
    lead:
      'Eine globale Plattform muss sehr unterschiedliche Regeln, Sprachen und Realitäten respektieren. GlobalHealth ist von der ersten Zeile an so gebaut.',
    items: [
      { region: 'Südasien', countries: 'Indien, Bangladesch, Nepal, Sri Lanka', note: 'Lokalsprachige Inhalte, Modus für geringe Bandbreite' },
      { region: 'Europa & UK', countries: 'EU, EWR, Schweiz, Vereinigtes Königreich', note: 'DSGVO-konforme Steuerung der Datenresidenz' },
      { region: 'Amerika', countries: 'USA, Kanada, Mexiko, Brasilien', note: 'Preise und Formate in USD/CAD/MXN/BRL' },
      { region: 'Afrika & Nahost', countries: 'Nigeria, Kenia, Südafrika, VAE, Saudi-Arabien', note: 'Arabisch in RTL, SMS-Rückfall bei geringer Bandbreite' },
      { region: 'Asien-Pazifik', countries: 'China, Japan, Singapur, Australien, Indonesien', note: 'CJK-Typografie und metrische Voreinstellungen' },
      { region: 'Rest der Welt', countries: 'Über 190 Länder und Regionen', note: 'Lokalisierte Zahlen-, Datums- und Einheitenformate' },
    ],
    cta: 'Globale Abdeckung ansehen',
  },

  pages: {
    platform: {
      eyebrow: 'Plattform',
      title: 'Ein System für Verstehen, Entscheiden und Handeln',
      lead:
        'GlobalHealth ersetzt die elf Tabs, drei PDFs und eine Suchmaschine, die Menschen sonst selbst zusammensuchen. Alle Module teilen eine Identität, eine Akte und eine Gestaltungssprache.',
      heroPoints: [
        'Statisches Rendering mit progressiver Verbesserung',
        'Ein zugängliches Komponentensystem in jedem Modul',
        'Lokalisierung ab der ersten Anfrage, RTL eingeschlossen',
        'Quellenangaben und Prüfdaten zu jeder klinischen Aussage',
      ],
      moduleHeading: 'In jedem Modul',
      performance: {
        eyebrow: 'Technik',
        title: 'Geschwindigkeit ist eine klinische Funktion',
        lead: 'Eine Seite, die sechs Sekunden zum Erscheinen braucht, ist für viele unbenutzbar und für manche gefährlich. Das sind unsere Zielwerte.',
        items: [
          { label: 'Medianer LCP im 4G', value: '< 1,2 s' },
          { label: 'Kumulative Layoutverschiebung', value: '< 0,02' },
          { label: 'JavaScript im ersten View', value: '< 20 kB' },
          { label: 'Tracker von Drittanbietern', value: '0' },
        ],
      },
      architecture: {
        eyebrow: 'Architektur',
        title: 'Wie alles zusammenspielt',
        items: [
          {
            title: 'Statisch als Standard',
            desc: 'Jede öffentliche Seite wird zur Bauzeit vorgerendert und vom CDN-Rand ausgeliefert. Kein Server-Roundtrip, um Gesundheitsinformation zu lesen.',
          },
          {
            title: 'Inseln statt App-Shell',
            desc: 'Interaktive Teile – Suche, Rechner, Formulare – laden als kleine eigenständige Module nur dort, wo sie gebraucht werden.',
          },
          {
            title: 'Offline-tauglich',
            desc: 'Ein Service Worker cacht das Leseerlebnis, damit zentrale Inhalte auch bei schwacher Verbindung oder Stromausfall verfügbar bleiben.',
          },
          {
            title: 'Barrierefreie Grundlage',
            desc: 'Semantische Bereiche, Fokussteuerung, Kontraste über WCAG 2.2 AA und volle Tastaturbedienung werden in der CI geprüft.',
          },
        ],
      },
      security: {
        eyebrow: 'Vertrauen',
        title: 'Datenschutz und Sicherheit als Standard',
        items: [
          'Keine Werbe- oder Profil-Skripte auf irgendeiner Gesundheitsseite.',
          'Persönliche Unterlagen sind bei Übertragung und Speicherung verschlüsselt und von ihrer Eigentümerin exportierbar.',
          'Einwilligung ist ausdrücklich, widerrufbar und mit Zeitstempel protokolliert.',
          'Anfragen an Dritte beschränken sich auf selbst gehostete Schriften und unsere eigene API.',
        ],
      },
    },

    solutions: {
      eyebrow: 'Lösungen',
      title: 'Eine Plattform, vier Einsatzbereiche',
      lead: 'Ob du auf deine eigene Gesundheit achtest oder eine Station leitest – GlobalHealth trifft dich dort, wo die Arbeit passiert.',
      personas: [
        {
          key: 'individuals',
          label: 'Für Menschen',
          title: 'Die eigene Gesundheit ohne Rätselraten verstehen',
          desc: 'Suche ein Symptom, ein Medikament oder einen Befund, erhalte eine strukturierte, belegte Erklärung – und gehst mit Zuversicht den nächsten Schritt.',
          points: [
            'Symptomerklärungen mit klaren Warnzeichen',
            'Monografien mit Wechselwirkungen und Warnhinweisen',
            'Testvorbereitung und Befundinterpretation',
            'Gespeicherte Favoriten, druckbare Zusammenfassungen, Erinnerungen',
            'KI-Assistent in deiner Sprache, rund um die Uhr',
          ],
        },
        {
          key: 'clinicians',
          label: 'Für Fachkräfte',
          title: 'Verlässliche Antworten am Point of Care',
          desc: 'Spart Zeit, die in Nachschlagen verloren geht. Alles ist geprüft, datiert und zitierfähig – tragfähig in der Sprechstunde wie in der Lehre.',
          points: [
            'Volltextsuche über Krankheiten, Tests und Medikamente',
            'Teilbare Patienten-Zusammenfassungen mit Quellen',
            'Offline-Zugriff auf Stationen mit schwacher Verbindung',
            'Lehrmaterial für junge Teams und Studierende',
            'Audit-Protokoll für jede geteilte Ressource',
          ],
        },
        {
          key: 'hospitals',
          label: 'Für Kliniken',
          title: 'Eine gemeinsame Ebene für alle Abteilungen',
          desc: 'Eine einzige, gesteuerte Quelle für Mitarbeitende und Patienten – mit der Lokalisierung, Governance und Berichtswesen, die deine Aufsicht erwartet.',
          points: [
            'Institutionelle Identität, SSO und rollenbasierter Zugriff',
            'Eigene Inhaltsrichtlinien und Freigabeprozesse',
            'Berichte zu Nutzung, Qualität und Chancengerechtigkeit',
            'Regionales Hosting und Optionen für Datenresidenz',
            'Anbindung an bestehende KIS- und Portallösungen',
          ],
        },
        {
          key: 'pharmacies',
          label: 'Für Apotheken',
          title: 'Abgabeinformationen, die Menschen wirklich lesen',
          desc: 'Gib deinen Kundinnen und Kunden eine klare Erklärung in deiner Marke – in ihrer Sprache, in dem Moment der Übergabe.',
          points: [
            'Monografieseiten in patientenfreundlicher Sprache',
            'Warnungen zu Wechselwirkungen und Doppelmedikation',
            'Beratungs-Checklisten und druckbare Handzettel',
            'Informationen zu Bestand, Substitution und Lieferfähigkeit',
            'White-Label-Einbettung in deiner eigenen Website',
          ],
        },
      ],
      cta: {
        title: 'Brauchst du etwas ganz Bestimmtes?',
        lead: 'Beschreibe uns den Ablauf, den du verbessern willst – wir bilden ihn auf der Plattform ab.',
        primary: 'Mit unserem Team sprechen',
        secondary: 'Über Vertrauen lesen',
      },
    },

    global: {
      eyebrow: 'Global',
      title: 'Eine Gesundheitsplattform, die respektiert, wo du bist',
      lead:
        'Lokalisierung ist hier keine Übersetzungsetappe. Schreibrichtung, Zahlen- und Datumsformate, Einheitenvoreinstellungen, Rechtsrahmen und Notfallweiterleitung sind Teil des Produkts.',
      principles: {
        eyebrow: 'Grundsätze',
        title: 'Was „global“ hier bedeutet',
        items: [
          {
            title: 'Rechts-nach-links ist nativ',
            desc: 'Arabisch ist kein gespiegelter Nachbau. Das Layout nutzt logische Eigenschaften, sodass sich die gesamte Oberfläche – inklusive Befehlspalette und Diagrammen – korrekt spiegelt.',
          },
          {
            title: 'Schriftgerechte Typografie',
            desc: 'Latein nutzt eine abgestimmte geometrische Schrift, Arabisch eine eigene Naskh, Devanagari einen eigenen Stapel, CJK dagegen Systemschriften statt eines mehrfachen Megabyte-Downloads.',
          },
          {
            title: 'Lokale Formate überall',
            desc: 'Daten, Uhrzeiten, Dezimaltrenner, Telefonnummern und Maßeinheiten folgen deinem Gebietsschema, nicht unserem.',
          },
          {
            title: 'Für geringe Bandbreite gebaut',
            desc: 'Ein reduzierter Modus entfernt Bilder und Animationen, und Notfallhinweise fallen auf reinen Text zurück, der überall funktioniert.',
          },
          {
            title: 'Rechtsrahmen werden respektiert',
            desc: 'Regionale Einwilligung, Datenresidenz und Aufbewahrung – mit DSGVO-konformen Voreinstellungen in EU und EWR.',
          },
          {
            title: 'Lokale Notfallweiterleitung',
            desc: 'Von jeder Seite mit einem Tippen zur richtigen Notrufnummer deines Landes.',
          },
        ],
      },
      emergency: {
        eyebrow: 'Notfälle',
        title: 'Die Nummer, die du jetzt brauchst',
        lead:
          'GlobalHealth ist kein Notdienst. Ist jemand in akuter Gefahr, ruf die Nummer unten für dein Land oder deine lokale Notrufnummer an.',
        searchLabel: 'Land suchen',
        searchPlaceholder: 'Nach Landnamen suchen…',
        empty: 'Kein Land passt zu dieser Suche.',
        showAll: 'Alle Länder anzeigen',
        tableNumber: 'Notrufnummer',
        tableRegion: 'Region',
        copied: 'Nummer kopiert',
        callNow: 'Anrufen',
        general: 'Allgemeiner Notruf',
        note: 'Die Nummern werden mit den nationalen Behörden abgeglichen. Sieht eine Nummer in deinem Land falsch aus, sag es uns bitte.',
        report: 'Falsche Nummer melden',
      },
      regions: {
        eyebrow: 'Abdeckung',
        title: 'Wo GlobalHealth aktiv ist',
        items: [
          { region: 'Südasien', countries: 'Indien, Bangladesch, Nepal, Sri Lanka', note: 'Lokalsprachige Inhalte, Modus für geringe Bandbreite' },
          { region: 'Europa & UK', countries: 'EU, EWR, Schweiz, Vereinigtes Königreich', note: 'DSGVO-konforme Steuerung der Datenresidenz' },
          { region: 'Amerika', countries: 'USA, Kanada, Mexiko, Brasilien', note: 'Preise und Formate in USD/CAD/MXN/BRL' },
          { region: 'Afrika & Nahost', countries: 'Nigeria, Kenia, Südafrika, VAE, Saudi-Arabien', note: 'Arabisch in RTL, SMS-Rückfall bei geringer Bandbreite' },
          { region: 'Asien-Pazifik', countries: 'China, Japan, Singapur, Australien, Indonesien', note: 'CJK-Typografie und metrische Voreinstellungen' },
          { region: 'Rest der Welt', countries: 'Über 190 Länder und Regionen', note: 'Lokalisierte Zahlen-, Datums- und Einheitenformate' },
        ],
      },
    },

    about: {
      eyebrow: 'Über uns',
      title: 'Wir bauen Gesundheitsinformation, auf die man handeln kann',
      lead:
        'GlobalHealth gibt es, weil die Lücke zwischen einer veröffentlichten Leitlinie und dem Küchentisch einer Person immer noch in Stunden Suche gemessen wird – und oft in einer Sackgasse endet.',
      mission: {
        eyebrow: 'Mission',
        title: 'Wofür wir das tun',
        items: [
          {
            title: 'Verstehen vor Umfang',
            desc: 'Zwölftausend oberflächliche Seiten helfen niemandem. Wir veröffentlichen weniger Themen und machen jedes wirklich vollständig.',
          },
          {
            title: 'Klarheit ohne Vereinfachung',
            desc: 'Wir behalten die klinische Bedeutung bei und streichen das Fachjargon, damit Menschen ohne Wörterbuch handeln können.',
          },
          {
            title: 'Global von Grund auf',
            desc: 'Lokalisierung, Barrierefreiheit und geringe Bandbreite sind Anforderungen, kein späterer Lokalisierungs-Sprint.',
          },
          {
            title: 'Ehrlichkeit als Funktion',
            desc: 'Wir veröffentlichen Prüfdaten, Quellen und Sicherheit – und sagen klar, wenn etwas nicht bekannt ist.',
          },
        ],
      },
      story: {
        eyebrow: 'Unsere Geschichte',
        title: 'Wie wir hierhergekommen sind',
        paragraphs: [
          'GlobalHealth begann als interne Referenz für klinische Lehrende, die müde waren, dieselben zwanzig Fragen immer wieder zu erklären. Über Prüfzyklen und echtes Leserfeedback wurde sie zu einer öffentlichen Plattform, die Menschen nutzen, die ihr vorher nie begegnet waren.',
          'Dieses Wachstum hat den Auftrag verändert. Eine Ressource für Fachkräfte und eine für einen Vierzehnjährigen in einer Dorfklinik sind nicht dasselbe Produkt – so zu tun ist genau der Weg, auf dem Gesundheitsinformation in die Irre führt. Die Plattform ist so gebaut, dass Fachkräfte Tiefe finden und Einsteiger Klarheit – auf derselben Seite.',
          'Wir sind bewusst unabhängig. Keine Werbung, keine gesponserten Platzierungen in klinischen Ergebnissen, kein Datenverkauf. Das ist eine geschäftliche Entscheidung – aber auch der Grund, warum die redaktionellen Standards etwas bedeuten.',
        ],
      },
      governance: {
        eyebrow: 'Governance',
        title: 'Wie Entscheidungen entstehen',
        items: [
          { title: 'Redaktionelle Unabhängigkeit', desc: 'Klinische Inhalte entscheiden Fachkräfte und Redaktionen, nie Geschäftspartner.' },
          { title: 'Namentliche Verantwortung', desc: 'Jede Seite führt Autor, prüfende Fachkraft, Fachgebiet und nächsten Prüftermin.' },
          { title: 'Offene Korrekturen', desc: 'Fehler werden vor Ort mit sichtbarem Änderungsvermerk korrigiert. Wir löschen keine Empfehlungen stillschweigend.' },
          { title: 'Unabhängige Kritik', desc: 'Ein externer klinischer Beirat prüft quartalsweise die Standards und kann ein Release stoppen.' },
        ],
      },
      numbers: {
        eyebrow: 'Heute',
        title: 'Wo wir stehen',
        items: [
          { value: '12.000+', label: 'Fachlich geprüfte Themen' },
          { value: '190+', label: 'Länder und Regionen' },
          { value: '8', label: 'Oberflächensprachen' },
          { value: '0', label: 'Werbetreibende und Datenhändler' },
        ],
      },
    },

    contact: {
      eyebrow: 'Kontakt',
      title: 'Mit einem Menschen sprechen',
      lead:
        'Fragen zu Inhalten, eine falsche Notrufnummer, eine Partnerschaft oder eine Presseanfrage – hier erreicht das richtige Team. Wir antworten innerhalb eines Werktags.',
      channels: [
        {
          title: 'Allgemeine Anfragen',
          desc: 'Alles, was zu keinem anderen Kanal passt.',
          value: 'hello@globalhealth.health',
          href: 'mailto:hello@globalhealth.health',
        },
        {
          title: 'Klinische Korrekturen',
          desc: 'Melde eine Unrichtigkeit auf einer klinischen Seite. Bitte mit Seiten-URL.',
          value: 'clinical@globalhealth.health',
          href: 'mailto:clinical@globalhealth.health',
        },
        {
          title: 'Partnerschaften & Institutionen',
          desc: 'Kliniken, Apothekenketten, Gesundheitssysteme und Regierungen.',
          value: 'partners@globalhealth.health',
          href: 'mailto:partners@globalhealth.health',
        },
        {
          title: 'Presse & Medien',
          desc: 'Presseanfragen, Interviews und Markenmaterial.',
          value: 'press@globalhealth.health',
          href: 'mailto:press@globalhealth.health',
        },
      ],
      form: {
        title: 'Schreib uns eine Nachricht',
        lead: 'Pflichtfelder müssen ausgefüllt werden. Wir nutzen deine Angaben nur, um dir zu antworten.',
        topic: 'Thema',
        topicPlaceholder: 'Thema wählen…',
        topics: ['Allgemeine Frage', 'Klinische Korrektur', 'Partnerschaft', 'Presseanfrage', 'Barrierefreiheitsproblem', 'Etwas anderes'],
        name: 'Dein Name',
        email: 'E-Mail-Adresse',
        organisation: 'Organisation',
        organisationPlaceholder: 'Optional – Klinik, Universität, Medium',
        message: 'Nachricht',
        messagePlaceholder: 'Beschreibe, was du brauchst, und ergänze einen Link, wenn es um bestimmte Inhalte geht.',
        consent: 'Ich bin damit einverstanden, dass GlobalHealth diese Angaben zur Beantwortung speichert.',
        submit: 'Nachricht senden',
        sending: 'Wird gesendet…',
        successTitle: 'Nachricht gesendet',
        successBody: 'Danke. Deine Nachricht ist angekommen, wir antworten innerhalb eines Werktags.',
        sendAnother: 'Weitere Nachricht senden',
        errorTitle: 'Das hat nicht geklappt',
        errorBody: 'Bei uns ist etwas schiefgelaufen. Bitte versuche es erneut oder schreibe uns direkt.',
        requiredField: 'Dieses Feld ist erforderlich.',
        invalidEmail: 'Bitte gib eine gültige E-Mail-Adresse ein.',
        tooShort: 'Bitte ergänze ein paar Details, damit wir helfen können.',
        consentRequired: 'Bitte bestätige deine Zustimmung, bevor wir antworten.',
        charCount: 'Zeichen',
      },
      response: {
        title: 'Was als Nächstes passiert',
        items: [
          { title: 'Innerhalb eines Werktags', desc: 'Eine namentlich genannte Person antwortet dir – kein Autoresponder.' },
          { title: 'Innerhalb von fünf Tagen', desc: 'Klinische Korrekturen werden mit einer prüfenden Fachkraft verifiziert und korrigiert oder erklärt.' },
          { title: 'Immer', desc: 'Alles zur Patientensicherheit wird am selben Tag eskaliert.' },
        ],
      },
      accessibility: {
        title: 'Barriere gefunden?',
        desc: 'Sag uns die Seite und was passiert ist. Barrierefreiheitsfehler behandeln wir wie Produktionsfehler.',
        cta: 'Barriere melden',
      },
    },

    legal: {
      lastUpdated: 'Zuletzt aktualisiert',
      languageNotice: 'Dieses Dokument wird auf Englisch veröffentlicht. Unten folgt eine übersetzte Zusammenfassung.',
      languageSummary: 'Zusammenfassung',
      privacySummary: 'Wir verwenden auf Gesundheitsseiten keine Werbung und kein Tracking, verkaufen niemals Daten, und alles, was du speicherst, gehört dir und ist exportierbar. Gesundheitsdaten werden verschlüsselt und du kannst jederzeit darauf zugreifen, sie berichtigen oder löschen.',
    termsSummary: 'GlobalHealth liefert allgemeine Gesundheitsinformation. Sie ist keine ärztliche Beratung und begründet kein Arzt-Patienten-Verhältnis. Inhalte dürfen mit Quellenangabe zitiert werden; eine Vervielfältigung im Umfang erfordert eine schriftliche Erlaubnis.',
    contents: 'Auf dieser Seite',
      backToTop: 'Nach oben',
    },

    notFound: {
      code: '404',
      title: 'Diese Seite konnten wir nicht finden',
      lead: 'Der Link ist möglicherweise veraltet oder die Seite wurde verschoben. Hier ist der schnellste Weg zurück.',
      primary: 'Zur Startseite',
      secondary: 'GlobalHealth durchsuchen',
      help: 'Noch immer feststeckt?',
      helpText: 'Sag uns, wonach du gesucht hast, und wir führen dich hin.',
    },
  },
};

export default de;
