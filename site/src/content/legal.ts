/**
 * Long-form policy documents.
 *
 * Rendered from structured data so the table of contents, anchors and print
 * styles all come for free. The body text is English; each locale shows a
 * translated summary and a notice above it, which is how most multilingual
 * publishers handle binding legal text honestly.
 */

export interface LegalSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDoc {
  key: 'privacy' | 'terms';
  updated: string;
  sections: LegalSection[];
}

export const PRIVACY: LegalDoc = {
  key: 'privacy',
  updated: '2026-01-14',
  sections: [
    {
      id: 'plain-language',
      heading: '1. The short version',
      paragraphs: [
        'Reading anything on GlobalHealth requires no account, creates no profile, and involves no advertising or analytics trackers on health pages.',
        'If you create an account, we store the information you give us in order to provide the feature you asked for. We never sell it, we never rent it, and we do not use it to target advertising anywhere.',
        'We do not place third-party cookies on this site. Fonts are served from our own infrastructure rather than a third-party CDN, specifically so that reading a page does not disclose your visit to another company.',
      ],
    },
    {
      id: 'what-we-collect',
      heading: '2. What we collect, and when',
      paragraphs: ['We collect the minimum needed to run each feature. Concretely:'],
      bullets: [
        'Reading content: nothing. No identifier is created and no request is sent to an advertising or measurement service.',
        'Interface preferences (colour theme, chosen language): stored in your browser only, on your device. They are not transmitted to us.',
        'An account: the email address you provide, a display name, and an optional organisation.',
        'Health records you choose to save: the data you enter, scoped to your account and exportable by you at any time.',
        'Messages you send us: the contents of the message, so that we can reply.',
        'Server logs: IP address, timestamp, requested path and user agent, retained for 30 days for security and abuse investigation, then deleted.',
      ],
    },
    {
      id: 'legal-bases',
      heading: '3. Why we are allowed to process it',
      paragraphs: [
        'Under the UK and EU General Data Protection Regulation, processing must have a lawful basis. GlobalHealth relies on three:',
      ],
      bullets: [
        'Consent, for anything optional such as a newsletter or an analytics cookie — which you can withdraw at any time without losing functionality.',
        'Contract, for the account and the features you have signed up for. Without this data we cannot provide the service.',
        'Legitimate interests, for operating and securing the service, such as rate limiting and abuse prevention. This is always balanced against your rights, and never used for marketing.',
      ],
    },
    {
      id: 'health-data',
      heading: '4. Health information and your rights',
      paragraphs: [
        'Special-category data — health information — receives additional protection. Where you store records in your account, we treat them as belonging to you alone: encrypted in transit and at rest, never used for advertising, model training or analytics, and never shared with a third party.',
        'You may access, correct, export or erase your data at any time from within the platform, and we action such requests within 30 days. Erasure propagates to backups within 90 days, after which the data is unrecoverable by design.',
        'If you are in the EU or EEA, you additionally have the right to lodge a complaint with your national supervisory authority, and the right to data portability in a machine-readable format.',
      ],
    },
    {
      id: 'ai-assistant',
      heading: '5. The AI assistant',
      paragraphs: [
        'The assistant produces educational explanations, not medical advice. It cites the sources it used and states its limits, but it is not a clinician and it must not be used to diagnose, prescribe or treat.',
        'Prompts you type may be processed by our infrastructure to produce an answer. We do not use your prompts to train third-party models, we do not sell them, and we do not attach advertising identifiers to them. Operational logs of a conversation are retained for 14 days for abuse prevention.',
        'Never enter information that could identify another person into the assistant.',
      ],
    },
    {
      id: 'international',
      heading: '6. International transfers and data residency',
      paragraphs: [
        'GlobalHealth is operated internationally. Institutional customers can select a data residency region — for example, the European Union, India or Australia — and personal data for those accounts is stored and processed in that region.',
        'Where data must cross a border, transfers rely on adequacy decisions where they exist, and Standard Contractual Clauses approved by the European Commission where they do not. A current list of sub-processors is available on request.',
      ],
    },
    {
      id: 'retention',
      heading: '7. Retention',
      paragraphs: ['We keep data only as long as it has a purpose:'],
      bullets: [
        'Accounts: until you close them, then 30 days of recovery, then deletion.',
        'Health records: until you delete them or close your account.',
        'Support messages: two years, so we can see the history of an issue.',
        'Server logs: 30 days.',
        'Backup snapshots: 90 days, rolling.',
      ],
    },
    {
      id: 'children',
      heading: '8. Children',
      paragraphs: [
        'GlobalHealth is a general-audience information service and is not directed at children under 13, or at the relevant minimum age where that is higher. We do not knowingly collect personal information from children. If you believe a child has given us personal information, contact us and we will delete it.',
      ],
    },
    {
      id: 'your-rights',
      heading: '9. Exercising your rights',
      paragraphs: [
        'Write to privacy@globalhealth.health from the address associated with your account. We will verify your identity before disclosing anything, and we will respond within 30 days. You may also ask us to transfer you to a different region, restrict processing, or object to processing based on legitimate interests.',
        'If we decline a request, we will explain why and tell you how to complain to a supervisory authority.',
      ],
    },
    {
      id: 'changes',
      heading: '10. Changes to this policy',
      paragraphs: [
        'When this policy changes materially, we update the date at the top of this page and notify account holders by email at least 30 days before the change takes effect. Continuing to use the service after that date constitutes acceptance of the revised policy.',
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  key: 'terms',
  updated: '2026-01-14',
  sections: [
    {
      id: 'acceptance',
      heading: '1. Acceptance of these terms',
      paragraphs: [
        'By accessing or using GlobalHealth you agree to these terms. If you do not agree, please do not use the service. If you are accepting on behalf of an organisation, you confirm that you have authority to bind that organisation, and "you" refers to it.',
        'These terms are between you and GlobalHealth. They do not create a clinician–patient relationship, and they do not create any relationship with a third party who links to or from the service.',
      ],
    },
    {
      id: 'not-medical-advice',
      heading: '2. Not medical advice',
      paragraphs: [
        'GlobalHealth publishes general health information for education. It does not provide medical advice, diagnosis, treatment or prescription. It is not a substitute for consultation with a qualified clinician.',
        'In an emergency, contact your local emergency services immediately. A list of national emergency numbers is available on the Global page, and you should not wait for any information on this site before seeking urgent help.',
        'Information on the service reflects the sources available at the time of review. Clinical practice, guidelines and product availability change. Always check the review date shown on any clinical page.',
      ],
    },
    {
      id: 'accounts',
      heading: '3. Accounts',
      paragraphs: [
        'Some features require an account. You must be at least 13 years old, or the age of digital consent where that is higher in your country. You are responsible for keeping your credentials confidential and for all activity under your account.',
        'Accounts are for individuals unless an institutional agreement says otherwise. Sharing an account, or creating an account on behalf of someone else without their authority, is not permitted.',
        'We may suspend or close an account that is used to abuse the service, to attack it, or to violate the law, with notice where practical and an opportunity to export data first.',
      ],
    },
    {
      id: 'acceptable-use',
      heading: '4. Acceptable use',
      paragraphs: ['You agree not to:'],
      bullets: [
        'Use the service to diagnose, treat or prescribe for yourself or anyone else, or to make a clinical decision on its basis alone.',
        'Upload or submit another person’s personal health information without their authority.',
        'Scrape, bulk-download, resell or republish the content, except where a separate written licence permits it.',
        'Attempt to gain unauthorised access to any account, system or data, or to circumvent rate limits.',
        'Use the AI assistant to produce content that impersonates a clinician or a medical organisation.',
        'Interfere with the service, including through automated load, denial-of-service traffic or malicious code.',
      ],
    },
    {
      id: 'intellectual-property',
      heading: '5. Intellectual property',
      paragraphs: [
        'The GlobalHealth name, logo, interface, and the original editorial content on this site are owned by GlobalHealth or its licensors, and are protected by copyright and trade mark law. Clinical content is additionally protected where a national scheme such as CC BY-NC applies; the licence for each item is shown on the item itself.',
        'You may quote short extracts with clear attribution and a link to the source. You may not reproduce whole pages, or use the content to train a model, without written permission.',
      ],
    },
    {
      id: 'third-party',
      heading: '6. Third-party links and content',
      paragraphs: [
        'Where we link out, we do so because the destination is useful. We do not control third-party sites and we are not responsible for their content, accuracy, availability or privacy practices. A link is not an endorsement.',
      ],
    },
    {
      id: 'availability',
      heading: '7. Availability and changes',
      paragraphs: [
        'We work to keep the service available, but we do not guarantee uninterrupted access. We may change, suspend or discontinue features, and we will give reasonable notice for material changes that affect you.',
        'We may correct, update or remove content at any time, including where a source is withdrawn or a review expires. We are not liable for reliance on content that has been superseded.',
      ],
    },
    {
      id: 'liability',
      heading: '8. Limitation of liability',
      paragraphs: [
        'To the maximum extent permitted by law, GlobalHealth excludes all implied warranties, and is not liable for indirect or consequential loss, loss of profit, loss of data, or any loss arising from reliance on general information published here.',
        'Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be limited. Some jurisdictions do not allow certain exclusions, and in those jurisdictions the exclusion applies only to the extent permitted.',
        'Nothing in these terms affects your statutory rights as a consumer.',
      ],
    },
    {
      id: 'termination',
      heading: '9. Termination',
      paragraphs: [
        'You may stop using the service and close your account at any time. We may terminate or suspend access where these terms are breached, where required by law, or where continued operation would present a security or legal risk.',
        'Provisions that by their nature should survive termination — including ownership, disclaimers, limitation of liability and governing law — survive.',
      ],
    },
    {
      id: 'law',
      heading: '10. Governing law and disputes',
      paragraphs: [
        'These terms are governed by the laws of England and Wales, without prejudice to any mandatory consumer protections available to you where you live. If you are a consumer, you keep the benefit of any mandatory protections of your country of residence.',
        'Before litigation, please raise the issue with us — most disputes are resolved quickly by email. Courts of England and Wales have exclusive jurisdiction, save that we may seek injunctive relief in any competent jurisdiction.',
      ],
    },
    {
      id: 'contact',
      heading: '11. Contact',
      paragraphs: [
        'Questions about these terms can be sent to legal@globalhealth.health, or by post to GlobalHealth, Attn. Legal, London, United Kingdom.',
      ],
    },
  ],
};

export const LEGAL_DOCS: Record<'privacy' | 'terms', LegalDoc> = {
  privacy: PRIVACY,
  terms: TERMS,
};
