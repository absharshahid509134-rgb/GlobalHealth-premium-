/**
 * GlobalHealth — English string catalogue.
 *
 * This file is the reference shape. Every other locale is typed as
 * `const x: UI = {…}` against it, so a missing or renamed key is a build
 * error rather than a blank label at runtime.
 */
const en = {
  site: {
    name: 'GlobalHealth',
    tagline: 'Trusted health knowledge for everyone, everywhere.',
    description:
      'GlobalHealth brings clinician-reviewed health knowledge, medicines, diagnostics, care directories and an AI health assistant together in one fast, accessible platform built for the whole world.',
  },

  nav: {
    home: 'Home',
    platform: 'Platform',
    solutions: 'Solutions',
    global: 'Global',
    about: 'About',
    contact: 'Contact',
    menu: 'Menu',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    search: 'Search',
    searchPlaceholder: 'Search GlobalHealth…',
    searchHint: 'Press',
    searchKey: 'K',
    language: 'Language',
    appearance: 'Appearance',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    signIn: 'Sign in',
    getStarted: 'Get started',
    emergency: 'Emergency numbers',
    sectionPrimary: 'Primary',
    sectionExplore: 'Explore',
  },

  a11y: {
    skip: 'Skip to main content',
    mainNav: 'Primary navigation',
    footerNav: 'Footer navigation',
    breadcrumb: 'Breadcrumb',
    openSearch: 'Open search',
    closeSearch: 'Close search',
    searchDialog: 'Search GlobalHealth',
    searchHintText: 'Type to search. Use the arrow keys to move and Enter to open.',
    resultsFor: 'Results for',
    noResults: 'No matches',
    noResultsHint: 'Try a shorter word, or browse the platform pages below.',
    clearSearch: 'Clear search',
    themeSwitch: 'Switch colour theme',
    languageSwitch: 'Change language',
    backToTop: 'Back to top',
    breadcrumbLabel: 'You are here',
    loading: 'Loading',
    close: 'Close',
    expand: 'Expand',
    collapse: 'Collapse',
    required: 'required',
    optional: 'optional',
    sectionLabel: 'Section',
    selectLanguage: 'Select your language',
    chooseLanguage: 'Choose your language',
    languageHelp: 'GlobalHealth is available in the languages below.',
    continueInEnglish: 'Continue in English',
    redirectsIn: 'Taking you to',
    currentPage: 'Current page',
  },

  common: {
    learnMore: 'Learn more',
    getStarted: 'Get started',
    explore: 'Explore',
    seeAll: 'See all',
    viewDetails: 'View details',
    backHome: 'Back to home',
    back: 'Back',
    new: 'New',
    beta: 'Beta',
    free: 'Free',
    popular: 'Popular',
    recommended: 'Recommended',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    cancel: 'Cancel',
    submit: 'Submit',
    search: 'Search',
    filter: 'Filter',
    clear: 'Clear',
    clearAll: 'Clear all',
    apply: 'Apply',
    reset: 'Reset',
    results: 'results',
    noResults: 'No results',
    minutes: 'min',
    hours: 'h',
    readTime: 'read',
    updated: 'Updated',
    lastReviewed: 'Last reviewed',
    perMonth: '/mo',
    perYear: '/yr',
    from: 'From',
    yes: 'Yes',
    no: 'No',
    copy: 'Copy',
    copied: 'Copied',
    step: 'Step',
    of: 'of',
  },

  footer: {
    explore: 'Explore',
    company: 'Company',
    legal: 'Legal',
    privacy: 'Privacy',
    terms: 'Terms',
    rights: '© {year} GlobalHealth. All rights reserved.',
    disclaimer: 'GlobalHealth provides educational health information. It is not a substitute for professional medical advice, diagnosis or emergency care.',
    languageHeading: 'Language',
    status: 'All systems operational',
    builtWith: 'Built for people in 190+ countries.',
  },

  hero: {
    badge: 'Clinician-reviewed · Available worldwide',
    title: 'Everything you need to understand your health,',
    titleAccent: 'in one calm place.',
    lead:
      'GlobalHealth turns scattered medical information into clear, structured guidance — symptom explainers, medicine monographs, lab-test preparation, verified care directories and an AI assistant that answers in your language.',
    primary: 'Explore the platform',
    secondary: 'Talk to the AI assistant',
    note: 'Free to use · No account needed for core content · Works on any device',
    searchLabel: 'Search health topics, medicines, tests and conditions',
    searchPlaceholder: 'Search “diabetes”, “paracetamol”, “full blood count”…',
    popular: 'Popular searches',
    suggestions: [
      'Diabetes',
      'Paracetamol',
      'Full blood count',
      'Hypertension',
      'Migraine',
      'Nearest hospital',
    ],
    trustLine: 'Used by people and clinicians in 190+ countries',
  },

  stats: {
    label: 'GlobalHealth at a glance',
    items: [
      { value: '190+', label: 'Countries and territories reached' },
      { value: '12,000+', label: 'Clinician-reviewed health topics' },
      { value: '8', label: 'Interface languages, including RTL' },
      { value: '< 1s', label: 'Median time to interactive' },
    ],
  },

  trustBar: {
    label: 'Our commitments',
    items: [
      'Reviewed by clinicians',
      'Plain-language writing',
      'No advertising on health topics',
      'Emergency signposting first',
    ],
  },

  home: {
    quickActions: {
      eyebrow: 'Quick access',
      title: 'What do you need today?',
      lead: 'Six direct paths to the most common jobs people come here to do.',
      items: [
        { title: 'Check a symptom', desc: 'Understand what a symptom can mean and when to seek care.' },
        { title: 'Look up a medicine', desc: 'Uses, dosage, interactions, warnings and safety profile.' },
        { title: 'Prepare for a test', desc: 'Fasting rules, preparation and how results are read.' },
        { title: 'Find care nearby', desc: 'Hospitals, clinics, pharmacies and urgent care directories.' },
        { title: 'Ask the AI assistant', desc: 'Get an explained, sourced answer in your own language.' },
        { title: 'Read health news', desc: 'Verified reporting on policy, outbreaks and research.' },
      ],
    },

    modules: {
      eyebrow: 'The platform',
      title: 'Six connected modules, one experience',
      lead:
        'Each module is useful on its own. Together they remove the tab-switching, guesswork and repetition that make healthcare information exhausting.',
      items: [
        {
          tag: 'Knowledge',
          title: 'Health knowledge library',
          desc: 'Condition guides written for real people: symptoms, causes, diagnosis, treatment, self-care and the red flags that matter.',
        },
        {
          tag: 'Medicine',
          title: 'Medicine monographs',
          desc: 'Generic and brand names, strengths, dosage forms, interactions, contraindications and storage — reviewed on a fixed cycle.',
        },
        {
          tag: 'Diagnostics',
          title: 'Lab test centre',
          desc: 'Every common investigation with preparation, sample type, turnaround and a plain-language guide to what the numbers mean.',
        },
        {
          tag: 'Directory',
          title: 'Care directory',
          desc: 'Hospitals, specialists, clinics, pharmacies and urgent care, mapped and searchable by location and speciality.',
        },
        {
          tag: 'Intelligence',
          title: 'AI health assistant',
          desc: 'Ask in any supported language. Answers cite their sources, state their limits and never invent a diagnosis.',
        },
        {
          tag: 'Coordination',
          title: 'Records & coordination',
          desc: 'Keep appointments, results, prescriptions and care plans together, and share them with the professionals you choose.',
        },
      ],
    },

    how: {
      eyebrow: 'How it works',
      title: 'Three steps, no guesswork',
      lead: 'Designed around one question: what should a person do next?',
      items: [
        {
          title: 'Describe what is happening',
          desc: 'Type or speak. Start with a symptom, a medicine name, a test result or a question in plain words.',
        },
        {
          title: 'Get a structured answer',
          desc: 'Clear sections, citations, and an explicit statement of what is not known — plus the point at which professional care is needed.',
        },
        {
          title: 'Act on it',
          desc: 'Book, save, print or share. Every answer is designed to end in a decision, not another open tab.',
        },
      ],
    },

    features: {
      eyebrow: 'Built for the real world',
      title: 'Fast, accessible and honest by default',
      lead:
        'Most health content online is slow, ad-heavy and hard to read. GlobalHealth is engineered the other way round.',
      items: [
        {
          title: 'Reads in under two seconds',
          desc: 'Static-first pages, code-splitting, preloaded fonts and no third-party trackers. The whole shell is a few kilobytes.',
        },
        {
          title: 'Right-to-left and eight scripts',
          desc: 'Arabic renders natively in RTL. Latin, Devanagari and CJK all have tuned font stacks and line-height.',
        },
        {
          title: 'Keyboard and screen-reader complete',
          desc: 'Every control is reachable and labelled. A ⌘K palette, visible focus rings and reduced-motion support throughout.',
        },
        {
          title: 'Numbers that match your locale',
          desc: 'Dates, doses and figures format to your region. Metric and imperial units toggle on the calculators.',
        },
        {
          title: 'Emergency signposting first',
          desc: 'Local emergency numbers for every covered country, one tap away, on every page.',
        },
        {
          title: 'Transparent about limits',
          desc: 'Sources, review dates and confidence are shown. Where evidence is thin, we say so instead of guessing.',
        },
      ],
    },

    standards: {
      eyebrow: 'Trust & safety',
      title: 'Healthcare information only helps if it can be trusted',
      lead: 'These standards are enforced in our publishing pipeline, not just stated in a policy.',
      items: [
        {
          title: 'Clinician review',
          desc: 'Every clinical topic is reviewed by a qualified professional with a recorded name, speciality and review date.',
        },
        {
          title: 'Traceable sources',
          desc: 'Claims link to the guideline, trial or regulator notice they came from. Unsourced claims do not ship.',
        },
        {
          title: 'Editorial independence',
          desc: 'No pharma advertising, no paid placement in results, and no affiliate links inside clinical content.',
        },
        {
          title: 'Visible limitations',
          desc: 'Each page states what it does not cover and when a person should stop reading and contact a clinician.',
        },
      ],
      note:
        'GlobalHealth provides health information and care-coordination tools. It is not a medical regulator, does not diagnose, and does not replace a licensed clinician or emergency services.',
    },

    faq: {
      eyebrow: 'Questions',
      title: 'Everything people ask before they start',
      lead: 'Still unsure about something? Our support team answers within one business day.',
      items: [
        {
          q: 'Is GlobalHealth a substitute for a doctor?',
          a: 'No. GlobalHealth explains health information so you can have better conversations with a clinician. It does not diagnose, prescribe or treat. If you may be in danger, contact your local emergency services immediately.',
        },
        {
          q: 'Do I need an account to use it?',
          a: 'No. The knowledge library, medicine monographs, test guides, care directory and AI assistant are open to everyone. An account is only needed to save personal records and coordinate care.',
        },
        {
          q: 'How is the content kept accurate?',
          a: 'Each clinical page carries a named reviewer, a speciality and a review date. Content on a fixed re-review schedule is flagged before it expires, and expired pages are visibly downgraded until a reviewer signs them off again.',
        },
        {
          q: 'Which languages are supported?',
          a: 'The full interface ships in eight languages, including right-to-left Arabic. The assistant can also answer in the language you type in, even when the interface itself is not yet translated into it.',
        },
        {
          q: 'Is my health data private?',
          a: 'Reading content requires no account and creates no profile. Anything you choose to store is yours, exportable at any time, and never sold or used for advertising. We do not track you across other websites.',
        },
        {
          q: 'How much does it cost?',
          a: 'Core health information is free, with no advertising and no data resale. Institutional plans add shared governance, audit logs and integration — see the Solutions page.',
        },
      ],
    },

    cta: {
      title: 'Start with the question you actually have',
      lead: 'No sign-up wall, no advertising, no data sold. Open the platform and begin.',
      primary: 'Explore the platform',
      secondary: 'Talk to our team',
      note: 'Emergency? Local emergency numbers are one tap away on every page.',
    },
  },

  globalTeaser: {
    eyebrow: 'Worldwide',
    title: 'Built for how healthcare actually works across borders',
    lead:
      'A single global platform has to respect very different rules, languages and realities. GlobalHealth is designed for that from the first line of code.',
    items: [
      { region: 'South Asia', countries: 'India, Bangladesh, Nepal, Sri Lanka', note: 'Local-language content, low-bandwidth mode' },
      { region: 'Europe & UK', countries: 'EU, EEA, Switzerland, United Kingdom', note: 'GDPR-aligned data residency controls' },
      { region: 'Americas', countries: 'USA, Canada, Mexico, Brazil', note: 'USD/CAD/MXN/BRL pricing and formats' },
      { region: 'Africa & Middle East', countries: 'Nigeria, Kenya, South Africa, UAE, Saudi Arabia', note: 'RTL Arabic, SMS fallback for low bandwidth' },
      { region: 'Asia-Pacific', countries: 'China, Japan, Singapore, Australia, Indonesia', note: 'CJK typography and metric defaults' },
      { region: 'Rest of world', countries: '190+ countries and territories', note: 'Locale-aware number, date and unit formatting' },
    ],
    cta: 'See global coverage',
  },

  pages: {
    platform: {
      eyebrow: 'Platform',
      title: 'One system for understanding, deciding and acting',
      lead:
        'GlobalHealth replaces the eleven tabs, three PDFs and one search engine people normally assemble for themselves. Every module shares one identity, one record and one design language.',
      heroPoints: [
        'Static-first rendering with progressive enhancement',
        'One accessible component system across every module',
        'Locale-aware from the first request, including RTL',
        'Source citations and review dates on every clinical claim',
      ],
      moduleHeading: 'Inside each module',
      performance: {
        eyebrow: 'Engineering',
        title: 'Speed is a clinical feature',
        lead: 'A page that takes six seconds to appear is unusable for a lot of people and dangerous for some. These are the numbers we hold ourselves to.',
        items: [
          { label: 'Median LCP on 4G', value: '< 1.2 s' },
          { label: 'Cumulative layout shift', value: '< 0.02' },
          { label: 'JavaScript on first view', value: '< 20 kB' },
          { label: 'Third-party trackers', value: '0' },
        ],
      },
      architecture: {
        eyebrow: 'Architecture',
        title: 'How it fits together',
        items: [
          {
            title: 'Static by default',
            desc: 'Every public page is pre-rendered at build time and served from a CDN edge. There is no server round-trip for reading health information.',
          },
          {
            title: 'Islands, not an app shell',
            desc: 'Interactive pieces — search, calculators, forms — load as small standalone modules only where they are used. Everything else is inert HTML.',
          },
          {
            title: 'Offline-tolerant',
            desc: 'A service worker caches the reading experience, so core guidance keeps working on a poor connection or during an outage.',
          },
          {
            title: 'Accessible foundations',
            desc: 'Semantic landmarks, focus management, contrast ratios above WCAG 2.2 AA and full keyboard operability are tested in CI, not audited at the end.',
          },
        ],
      },
      security: {
        eyebrow: 'Trust',
        title: 'Privacy and security by default',
        items: [
          'No advertising or profiling scripts on any health page.',
          'Personal records are encrypted in transit and at rest, and exportable by the person who owns them.',
          'Consent is explicit, revocable and recorded with a timestamp.',
          'Third-party requests are limited to self-hosted fonts and our own API — nothing is shared with third parties.',
        ],
      },
    },

    solutions: {
      eyebrow: 'Solutions',
      title: 'One platform, four ways of using it',
      lead: 'Whether you are looking after your own health or running a ward, GlobalHealth meets you where the work happens.',
      personas: [
        {
          key: 'individuals',
          label: 'For people',
          title: 'Understand your health without the guesswork',
          desc: 'Search a symptom, a medicine or a test result and get a structured, sourced explanation — then take the next step with confidence.',
          points: [
            'Symptom explainers with clear red flags',
            'Medicine monographs with interactions and warnings',
            'Lab-test preparation and result interpretation',
            'Saved favourites, printable summaries and reminders',
            'AI assistant in your own language, 24/7',
          ],
        },
        {
          key: 'clinicians',
          label: 'For clinicians',
          title: 'Trusted answers, ready at the point of care',
          desc: 'Reduce the time lost to lookups. Everything is reviewed, dated and citable, so it stands up in a consultation or a teaching file.',
          points: [
            'Full-text search across conditions, tests and medicines',
            'Shareable patient summaries with sources attached',
            'Offline access in low-connectivity wards',
            'Teaching material for junior teams and students',
            'Audit trail for every shared resource',
          ],
        },
        {
          key: 'hospitals',
          label: 'For hospitals',
          title: 'A shared layer across departments',
          desc: 'A single, governed source of health information for staff and patients, with the localisation, governance and reporting your regulator expects.',
          points: [
            'Institutional identity, SSO and role-based access',
            'Custom content policy and approval workflows',
            'Usage, quality and equity reporting',
            'Regional hosting and data residency options',
            'Integration with existing HIS and portal stacks',
          ],
        },
        {
          key: 'pharmacies',
          label: 'For pharmacies',
          title: 'Dispensing information people actually read',
          desc: 'Give customers a clear, branded explanation of what they are taking, in their language, at the moment of handover.',
          points: [
            'Branded monograph pages with patient-friendly wording',
            'Interaction and duplicate-therapy warnings',
            'Counselling checklists and printable handouts',
            'Stock, substitution and supply information',
            'White-label embedding in your own site',
          ],
        },
      ],
      cta: {
        title: 'Need something specific?',
        lead: 'Tell us the workflow you are trying to improve and we will map it to the platform.',
        primary: 'Talk to our team',
        secondary: 'Read about trust',
      },
    },

    global: {
      eyebrow: 'Global',
      title: 'A health platform that respects where you are',
      lead:
        'Localisation is not a translation pass here. Script direction, number and date formats, unit defaults, legal frameworks and emergency routing are all part of the product.',
      principles: {
        eyebrow: 'Principles',
        title: 'What “worldwide” means here',
        items: [
          {
            title: 'Right-to-left is native',
            desc: 'Arabic is not a mirrored afterthought. The layout is built on logical properties, so the whole interface — including the command palette and charts — mirrors correctly.',
          },
          {
            title: 'Script-aware typography',
            desc: 'Latin text uses a tuned geometric face, Arabic a dedicated Naskh, Devanagari its own stack, and CJK relies on native system fonts instead of a multi-megabyte download.',
          },
          {
            title: 'Local formats everywhere',
            desc: 'Dates, times, decimal separators, phone numbers and measurement units follow your locale, not ours.',
          },
          {
            title: 'Low-bandwidth by default',
            desc: 'A reduced mode strips imagery and animation, and emergency guidance falls back to plain text that works anywhere.',
          },
          {
            title: 'Legal frameworks respected',
            desc: 'Region-appropriate consent, data residency and retention settings, with GDPR-aligned defaults in the EU and EEA.',
          },
          {
            title: 'Local emergency routing',
            desc: 'One tap from any page to the correct emergency number for the country you are in.',
          },
        ],
      },
      emergency: {
        eyebrow: 'Emergencies',
        title: 'The number you need, right now',
        lead:
          'GlobalHealth is not an emergency service. If someone is in immediate danger, call the number below for your country or your local emergency number.',
        searchLabel: 'Search a country',
        searchPlaceholder: 'Search by country name…',
        empty: 'No country matches that search.',
        showAll: 'Show all countries',
        tableNumber: 'Emergency number',
        tableRegion: 'Region',
        copied: 'Number copied',
        callNow: 'Call',
        general: 'General emergency',
        note: 'Numbers are maintained with national authorities. If a number looks wrong in your country, please tell us so we can correct it.',
        report: 'Report an incorrect number',
      },
      regions: {
        eyebrow: 'Coverage',
        title: 'Where GlobalHealth is live',
        items: [
          { region: 'South Asia', countries: 'India, Bangladesh, Nepal, Sri Lanka', note: 'Local-language content, low-bandwidth mode' },
          { region: 'Europe & UK', countries: 'EU, EEA, Switzerland, United Kingdom', note: 'GDPR-aligned data residency controls' },
          { region: 'Americas', countries: 'USA, Canada, Mexico, Brazil', note: 'USD/CAD/MXN/BRL pricing and formats' },
          { region: 'Africa & Middle East', countries: 'Nigeria, Kenya, South Africa, UAE, Saudi Arabia', note: 'RTL Arabic, SMS fallback for low bandwidth' },
          { region: 'Asia-Pacific', countries: 'China, Japan, Singapore, Australia, Indonesia', note: 'CJK typography and metric defaults' },
          { region: 'Rest of world', countries: '190+ countries and territories', note: 'Locale-aware number, date and unit formatting' },
        ],
      },
    },

    about: {
      eyebrow: 'About',
      title: 'We build health information people can act on',
      lead:
        'GlobalHealth exists because the gap between a published guideline and a person’s kitchen table is still measured in hours of searching, and often ends in a dead end.',
      mission: {
        eyebrow: 'Mission',
        title: 'What we are for',
        items: [
          {
            title: 'Comprehension over volume',
            desc: 'Twelve thousand shallow pages help nobody. We publish fewer topics, and make each one genuinely complete.',
          },
          {
            title: 'Clarity without simplification',
            desc: 'We keep the clinical meaning and drop the jargon, so a reader can act without a dictionary.',
          },
          {
            title: 'Global by construction',
            desc: 'Localisation, accessibility and low bandwidth are requirements, not a later localisation sprint.',
          },
          {
            title: 'Honesty as a feature',
            desc: 'We publish review dates, sources and confidence, and we say plainly when something is not known.',
          },
        ],
      },
      story: {
        eyebrow: 'Our story',
        title: 'How we got here',
        paragraphs: [
          'GlobalHealth began as an internal reference for clinical educators who were tired of re-explaining the same twenty questions. It grew, through review cycles and real reader feedback, into a public platform used by people who had never encountered it before.',
          'That growth changed the brief. A resource for clinicians and a resource for a fourteen-year-old in a village clinic are not the same product, and pretending otherwise is how health information ends up misleading. The platform is now built so that a clinician finds depth and a first-time reader finds clarity, from the same page.',
          'We are deliberately independent. There is no advertising, no sponsored placement in clinical results and no data resale. That is a commercial decision, but it is also the reason the editorial standards mean anything.',
        ],
      },
      governance: {
        eyebrow: 'Governance',
        title: 'How decisions are made',
        items: [
          { title: 'Editorial independence', desc: 'Clinical content is decided by clinicians and editors, never by commercial partners.' },
          { title: 'Named accountability', desc: 'Every page records its author, reviewer, speciality and next review date.' },
          { title: 'Open corrections', desc: 'Errors are corrected in place with a visible change note. We do not quietly delete guidance.' },
          { title: 'Independent challenge', desc: 'An external clinical advisory board reviews standards quarterly and can block a release.' },
        ],
      },
      numbers: {
        eyebrow: 'Today',
        title: 'Where we are',
        items: [
          { value: '12,000+', label: 'Clinician-reviewed topics' },
          { value: '190+', label: 'Countries and territories' },
          { value: '8', label: 'Interface languages' },
          { value: '0', label: 'Advertisers and data resellers' },
        ],
      },
    },

    contact: {
      eyebrow: 'Contact',
      title: 'Talk to a human',
      lead:
        'Questions about content, an incorrect emergency number, a partnership or a press enquiry — this reaches the right team. We answer within one business day.',
      channels: [
        {
          title: 'General enquiries',
          desc: 'Anything that does not fit another channel.',
          value: 'hello@globalhealth.health',
          href: 'mailto:hello@globalhealth.health',
        },
        {
          title: 'Clinical corrections',
          desc: 'Report an inaccuracy in a clinical page. Include the page URL.',
          value: 'clinical@globalhealth.health',
          href: 'mailto:clinical@globalhealth.health',
        },
        {
          title: 'Partnerships & institutions',
          desc: 'Hospitals, pharmacy chains, health systems and governments.',
          value: 'partners@globalhealth.health',
          href: 'mailto:partners@globalhealth.health',
        },
        {
          title: 'Press & media',
          desc: 'Media enquiries, interviews and brand assets.',
          value: 'press@globalhealth.health',
          href: 'mailto:press@globalhealth.health',
        },
      ],
      form: {
        title: 'Send us a message',
        lead: 'Fields marked required must be completed. We only use your details to answer you.',
        topic: 'Topic',
        topicPlaceholder: 'Choose a topic…',
        topics: ['General question', 'Clinical correction', 'Partnership', 'Press enquiry', 'Accessibility issue', 'Something else'],
        name: 'Your name',
        email: 'Email address',
        organisation: 'Organisation',
        organisationPlaceholder: 'Optional — hospital, university, media outlet',
        message: 'Message',
        messagePlaceholder: 'Tell us what you need, and include a link to the page if this is about specific content.',
        consent: 'I agree that GlobalHealth may store these details in order to reply to me.',
        submit: 'Send message',
        sending: 'Sending…',
        successTitle: 'Message sent',
        successBody: 'Thank you. We have your message and will reply within one business day.',
        sendAnother: 'Send another message',
        errorTitle: 'We could not send that',
        errorBody: 'Something went wrong on our side. Please try again, or email us directly.',
        requiredField: 'This field is required.',
        invalidEmail: 'Please enter a valid email address.',
        tooShort: 'Please add a little more detail so we can help.',
        consentRequired: 'Please confirm you agree before we reply.',
        charCount: 'characters',
      },
      response: {
        title: 'What happens next',
        items: [
          { title: 'Within one business day', desc: 'A named person replies to you, not an autoresponder.' },
          { title: 'Within five days', desc: 'Clinical corrections are verified with a reviewer and either fixed or explained.' },
          { title: 'Always', desc: 'Anything urgent about patient safety is escalated the same day.' },
        ],
      },
      accessibility: {
        title: 'Found an accessibility barrier?',
        desc: 'Tell us the page and what happened. We treat accessibility defects as production bugs and fix them on the same schedule.',
        cta: 'Report a barrier',
      },
    },

    legal: {
      lastUpdated: 'Last updated',
      languageNotice: 'This document is published in English. A translated summary is shown below.',
      languageSummary: 'Summary',
      privacySummary: 'We do not use advertising or tracking on health pages, we never sell data, and everything you store is yours and exportable. Health information is encrypted, and you can access, correct or erase it at any time.',
    termsSummary: 'GlobalHealth provides general health information. It is not medical advice, and it does not create a clinician–patient relationship. Content is licensed for quotation with attribution; bulk reproduction requires written permission.',
    contents: 'On this page',
      backToTop: 'Back to top',
    },

    notFound: {
      code: '404',
      title: 'We could not find that page',
      lead: 'The link may be out of date, or the page may have moved. Here is the fastest way back.',
      primary: 'Go to the homepage',
      secondary: 'Search GlobalHealth',
      help: 'Still stuck?',
      helpText: 'Tell us what you were looking for and we will point you to it.',
    },
  },
};

export default en;
