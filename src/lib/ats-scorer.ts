/**
 * Deterministic ATS Scorer
 * 
 * This module provides a purely algorithmic, code-based ATS scoring engine.
 * It produces the EXACT same score for the EXACT same content every time,
 * eliminating the inconsistency of LLM-based scoring.
 * 
 * The AI is still used downstream for qualitative commentary (strengths,
 * issues, summary), but numeric scores are computed here.
 */

// ── Action Verb Dictionary ──────────────────────────────────────────────────
const STRONG_ACTION_VERBS = new Set([
  // Leadership & Strategy
  'spearheaded', 'orchestrated', 'pioneered', 'championed', 'directed',
  'oversaw', 'steered', 'helmed', 'mobilized', 'galvanized',
  // Engineering & Building
  'architected', 'engineered', 'developed', 'designed', 'built',
  'constructed', 'implemented', 'deployed', 'configured', 'integrated',
  'automated', 'programmed', 'coded', 'created', 'crafted',
  // Optimization & Improvement
  'optimized', 'streamlined', 'enhanced', 'accelerated', 'refined',
  'revamped', 'modernized', 'upgraded', 'transformed', 'restructured',
  'consolidated', 'simplified', 'improved', 'boosted', 'elevated',
  // Analysis & Research
  'analyzed', 'evaluated', 'assessed', 'investigated', 'researched',
  'diagnosed', 'audited', 'benchmarked', 'surveyed', 'examined',
  'identified', 'discovered', 'uncovered', 'mapped', 'profiled',
  // Delivery & Execution
  'delivered', 'executed', 'launched', 'shipped', 'released',
  'completed', 'accomplished', 'achieved', 'attained', 'fulfilled',
  'finalized', 'produced', 'generated', 'established', 'instituted',
  // Collaboration & Communication
  'collaborated', 'coordinated', 'facilitated', 'mentored', 'trained',
  'coached', 'presented', 'communicated', 'liaised', 'partnered',
  'negotiated', 'advocated', 'consulted', 'advised', 'guided',
  // Management & Operations
  'managed', 'supervised', 'administered', 'maintained', 'monitored',
  'tracked', 'scheduled', 'organized', 'prioritized', 'allocated',
  'delegated', 'governed', 'regulated', 'enforced', 'controlled',
  // Growth & Revenue
  'increased', 'grew', 'expanded', 'scaled', 'maximized',
  'drove', 'generated', 'captured', 'secured', 'acquired',
  'won', 'earned', 'saved', 'reduced', 'cut', 'minimized',
  // Technical specific
  'migrated', 'refactored', 'debugged', 'tested', 'validated',
  'provisioned', 'containerized', 'dockerized', 'instrumented',
  'leveraged', 'utilized', 'adopted', 'formulated', 'devised',
  'conceptualized', 'prototyped', 'iterated', 'documented',
]);

const WEAK_VERBS = new Set([
  'helped', 'assisted', 'worked', 'did', 'made', 'got', 'was',
  'had', 'used', 'tried', 'went', 'put', 'ran', 'saw', 'took',
]);

// ── Hard Skills / Tools Dictionary ──────────────────────────────────────────
// These are matched case-insensitively against the resume text
const HARD_SKILLS_PATTERNS: RegExp[] = [
  // Programming Languages
  /\b(python|java|javascript|typescript|c\+\+|c#|ruby|go|golang|rust|swift|kotlin|scala|perl|r|matlab|php|dart|lua|haskell|elixir)\b/gi,
  // Web Frameworks & Libraries
  /\b(react|angular|vue|next\.?js|nuxt|svelte|express|django|flask|fastapi|spring|laravel|rails|asp\.net|gatsby|remix)\b/gi,
  // Cloud & DevOps
  /\b(aws|azure|gcp|google cloud|docker|kubernetes|k8s|terraform|ansible|jenkins|ci\/cd|circleci|github actions|gitlab ci|helm|argocd)\b/gi,
  // Databases
  /\b(sql|mysql|postgresql|postgres|mongodb|redis|elasticsearch|dynamodb|cassandra|oracle|sqlite|firestore|supabase|neo4j|graphql)\b/gi,
  // Data & ML
  /\b(machine learning|deep learning|tensorflow|pytorch|scikit-learn|pandas|numpy|spark|hadoop|kafka|airflow|mlflow|nlp|computer vision|data science|big data)\b/gi,
  // Mobile
  /\b(ios|android|react native|flutter|swiftui|jetpack compose|xamarin)\b/gi,
  // Tools & Platforms
  /\b(git|github|gitlab|bitbucket|jira|confluence|slack|figma|postman|swagger|linux|unix|bash|powershell|nginx|apache)\b/gi,
  // Methodologies & Concepts
  /\b(agile|scrum|kanban|devops|microservices|rest|restful|api|sdk|saas|oauth|jwt|sso|rbac|oop|solid|design patterns|tdd|bdd)\b/gi,
  // Data Visualization & BI
  /\b(tableau|power bi|looker|grafana|kibana|matplotlib|d3\.js|plotly)\b/gi,
  // Security & Networking
  /\b(cybersecurity|penetration testing|firewall|encryption|ssl|tls|vpn|siem|soc|owasp|vulnerability|compliance)\b/gi,
];

// ── Section Headers to detect ───────────────────────────────────────────────
const SECTION_PATTERNS = {
  summary: /\b(summary|professional\s*summary|profile|objective|about)\b/i,
  experience: /\b(experience|employment|work\s*history|professional\s*experience)\b/i,
  education: /\b(education|academic|qualification|degree)\b/i,
  skills: /\b(skills|technical\s*skills|technologies|competencies|proficiencies|expertise)\b/i,
};

// ── Metric patterns (numbers, percentages, dollar amounts) ──────────────────
const METRIC_PATTERNS = [
  /\d+%/g,                        // 25%, 100%
  /\$[\d,.]+[KkMmBb]?/g,         // $1.2M, $500K
  /\d+[xX]\s/g,                   // 3x, 10X
  /\d+\+?\s*(users|clients|customers|employees|team|people|members|projects|applications|servers|requests|transactions)/gi,
  /\d+\s*(million|billion|thousand)/gi,
  /reduced\s.*?\d/gi,
  /increased\s.*?\d/gi,
  /improved\s.*?\d/gi,
  /saved\s.*?\d/gi,
  /grew\s.*?\d/gi,
];

// ── Result/Impact phrases (no numbers needed) ───────────────────────────────
const IMPACT_PHRASES = [
  /resulting in/gi,
  /leading to/gi,
  /which (led|resulted|drove|enabled|improved)/gi,
  /thereby (reducing|increasing|improving|enhancing|enabling|driving)/gi,
  /contributing to/gi,
  /achieving/gi,
  /enabling/gi,
  /driving/gi,
  /across\s+\d+/gi,
  /company-wide/gi,
  /organization-wide/gi,
  /enterprise/gi,
  /at scale/gi,
  /high-impact/gi,
  /mission-critical/gi,
  /production/gi,
];

// ── Core Scoring Functions ──────────────────────────────────────────────────

export interface ATSBreakdown {
  keyword_density: { score: number; max: number; comment: string };
  action_verb_usage: { score: number; max: number; comment: string };
  impact_accomplishments: { score: number; max: number; comment: string };
  formatting_structure: { score: number; max: number; comment: string };
  section_completeness: { score: number; max: number; comment: string };
}

export interface ATSScoreResult {
  overall_score: number;
  breakdown: ATSBreakdown;
}

/** Normalize text for consistent matching */
function normalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/ {2,}/g, ' ')
    .replace(/•/g, '• ')
    .trim();
}

/** Count distinct hard skills found in the text */
function countHardSkills(text: string): { count: number; found: string[] } {
  const lowerText = text.toLowerCase();
  const foundSkills = new Set<string>();

  for (const pattern of HARD_SKILLS_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(lowerText)) !== null) {
      foundSkills.add(match[1]?.toLowerCase() || match[0].toLowerCase());
    }
  }

  return { count: foundSkills.size, found: Array.from(foundSkills) };
}

/** Extract all bullet-like lines from text */
function extractBullets(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const bullets: string[] = [];

  for (const line of lines) {
    // Bullets typically start with: •, -, *, >, or after a bullet unicode char
    // Also consider sentences that look like resume bullets (start with capital verb after header text)
    if (/^[•\-\*\>▪▸◦]/.test(line)) {
      bullets.push(line.replace(/^[•\-\*\>▪▸◦]\s*/, '').trim());
    } else if (/^[A-Z][a-z]+ed\b/.test(line) || /^[A-Z][a-z]+ing\b/.test(line)) {
      // Lines starting with action verbs (past tense or gerund)
      bullets.push(line);
    }
  }

  // If we found very few bullets, be more aggressive — treat any sentence-like line > 40 chars as a potential bullet
  if (bullets.length < 3) {
    for (const line of lines) {
      if (line.length > 40 && !bullets.includes(line) && !/^[A-Z\s]+$/.test(line)) {
        bullets.push(line);
      }
    }
  }

  return bullets;
}

/** Score keyword density (30% weight) */
function scoreKeywordDensity(text: string): { score: number; comment: string; skills: string[] } {
  const { count, found } = countHardSkills(text);

  let score: number;
  let comment: string;

  if (count >= 15) {
    score = 10;
    comment = `Excellent keyword density: ${count} distinct technical skills detected.`;
  } else if (count >= 12) {
    score = 9.5;
    comment = `Very strong keyword density: ${count} distinct technical skills detected.`;
  } else if (count >= 10) {
    score = 9;
    comment = `Strong keyword density: ${count} distinct technical skills detected.`;
  } else if (count >= 8) {
    score = 8.5;
    comment = `Good keyword density: ${count} technical skills found. Consider adding more contextual keywords.`;
  } else if (count >= 6) {
    score = 7.5;
    comment = `Moderate keyword density: ${count} technical skills found. More industry keywords would improve ATS matching.`;
  } else if (count >= 4) {
    score = 6.5;
    comment = `Below average: Only ${count} technical skills detected. Significant keyword gaps.`;
  } else {
    score = 5;
    comment = `Poor keyword density: Only ${count} technical skills found. Resume lacks critical industry keywords.`;
  }

  return { score, comment, skills: found };
}

/** Score action verb usage (25% weight) */
function scoreActionVerbs(text: string): { score: number; comment: string } {
  const bullets = extractBullets(text);

  if (bullets.length === 0) {
    return { score: 5, comment: 'No bullet points detected. Unable to evaluate action verb usage.' };
  }

  let strongCount = 0;
  let weakCount = 0;

  for (const bullet of bullets) {
    const firstWord = bullet.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
    if (STRONG_ACTION_VERBS.has(firstWord)) {
      strongCount++;
    } else if (WEAK_VERBS.has(firstWord)) {
      weakCount++;
    }
    // Words not in either set are neutral (e.g., industry-specific verbs we didn't list)
  }

  const strongRatio = strongCount / bullets.length;
  const weakRatio = weakCount / bullets.length;

  let score: number;
  let comment: string;

  if (strongRatio >= 0.85 && weakRatio === 0) {
    score = 10;
    comment = `Excellent: ${strongCount}/${bullets.length} bullets use strong action verbs with zero weak verbs.`;
  } else if (strongRatio >= 0.7 && weakRatio <= 0.05) {
    score = 9.5;
    comment = `Very strong: ${strongCount}/${bullets.length} bullets use strong action verbs.`;
  } else if (strongRatio >= 0.6) {
    score = 9;
    comment = `Strong action verb usage: ${strongCount}/${bullets.length} bullets start with power verbs.`;
  } else if (strongRatio >= 0.45) {
    score = 8;
    comment = `Good verb usage: ${strongCount}/${bullets.length} strong verbs. Some bullets could use stronger openers.`;
  } else if (strongRatio >= 0.3) {
    score = 7;
    comment = `Moderate: Only ${strongCount}/${bullets.length} bullets start with strong verbs. ${weakCount} use weak verbs.`;
  } else {
    score = 5.5;
    comment = `Weak: Only ${strongCount}/${bullets.length} strong action verbs detected. ${weakCount} weak verbs found.`;
  }

  return { score, comment };
}

/** Score impact & accomplishments (20% weight) */
function scoreImpact(text: string): { score: number; comment: string } {
  // Count hard metrics
  let metricCount = 0;
  for (const pattern of METRIC_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) metricCount += matches.length;
  }

  // Count impact phrases
  let impactPhraseCount = 0;
  for (const pattern of IMPACT_PHRASES) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) impactPhraseCount += matches.length;
  }

  // Combined impact signal
  const totalImpact = metricCount + Math.floor(impactPhraseCount / 2);

  let score: number;
  let comment: string;

  if (totalImpact >= 8) {
    score = 10;
    comment = `Excellent: ${metricCount} quantified metrics and ${impactPhraseCount} impact phrases found.`;
  } else if (totalImpact >= 6) {
    score = 9;
    comment = `Strong impact: ${metricCount} metrics and ${impactPhraseCount} impact-oriented phrases detected.`;
  } else if (totalImpact >= 4) {
    score = 8;
    comment = `Good: ${metricCount} metrics found. Adding more quantified results would strengthen impact.`;
  } else if (totalImpact >= 2) {
    score = 7;
    comment = `Moderate: Only ${metricCount} metrics found. Bullets read more task-based than achievement-based.`;
  } else {
    score = 5.5;
    comment = `Weak: Almost no quantified achievements. Resume appears purely task-based.`;
  }

  return { score, comment };
}

/** Score formatting & structure (15% weight) */
function scoreFormatting(text: string): { score: number; comment: string } {
  const normalizedText = normalize(text);
  let sectionsFound = 0;
  const missingSections: string[] = [];

  for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.test(normalizedText)) {
      sectionsFound++;
    } else {
      missingSections.push(name);
    }
  }

  // Check if bullets are present
  const hasBullets = /[•\-\*▪▸]/.test(normalizedText);

  let score: number;
  let comment: string;

  if (sectionsFound === 4 && hasBullets) {
    score = 10;
    comment = 'Perfect structure: All 4 standard sections detected with proper bullet formatting.';
  } else if (sectionsFound === 4) {
    score = 9.5;
    comment = 'All sections present. Consider using bullet points for better ATS parsing.';
  } else if (sectionsFound >= 3 && hasBullets) {
    score = 9;
    comment = `Good structure: ${sectionsFound}/4 sections detected. Missing: ${missingSections.join(', ')}.`;
  } else if (sectionsFound >= 3) {
    score = 8;
    comment = `${sectionsFound}/4 sections found. Missing: ${missingSections.join(', ')}. Add bullets for clarity.`;
  } else if (sectionsFound >= 2) {
    score = 6.5;
    comment = `Only ${sectionsFound}/4 sections detected. Missing: ${missingSections.join(', ')}.`;
  } else {
    score = 4;
    comment = `Poor formatting: Only ${sectionsFound}/4 standard sections found. Missing: ${missingSections.join(', ')}.`;
  }

  return { score, comment };
}

/** Score section completeness (10% weight) */
function scoreSectionCompleteness(text: string): { score: number; comment: string } {
  const normalizedText = normalize(text);
  let present = 0;
  const missing: string[] = [];

  for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.test(normalizedText)) {
      present++;
    } else {
      missing.push(name);
    }
  }

  // Also check if there's substantial content (not just headers)
  const hasSubstantialContent = normalizedText.length > 300;

  let score: number;
  let comment: string;

  if (present === 4 && hasSubstantialContent) {
    score = 10;
    comment = 'All 4 core sections present with substantial content.';
  } else if (present === 4) {
    score = 9;
    comment = 'All sections present but content appears thin.';
  } else if (present === 3) {
    score = 8;
    comment = `3/4 sections complete. Missing: ${missing.join(', ')}.`;
  } else if (present === 2) {
    score = 6;
    comment = `Only 2/4 sections found. Missing: ${missing.join(', ')}.`;
  } else {
    score = 4;
    comment = `Severely incomplete: Only ${present}/4 sections detected.`;
  }

  return { score, comment };
}

// ── Main Scoring Function ───────────────────────────────────────────────────

/**
 * Calculate a deterministic ATS score for any resume text.
 * 
 * This function always returns the exact same score for the exact same
 * input text, eliminating LLM randomness.
 * 
 * Weights: keyword_density=30%, action_verb_usage=25%, 
 *          impact_accomplishments=20%, formatting_structure=15%, 
 *          section_completeness=10%
 */
export function calculateATSScore(resumeText: string): ATSScoreResult {
  const text = normalize(resumeText);

  const keywordResult = scoreKeywordDensity(text);
  const actionVerbResult = scoreActionVerbs(text);
  const impactResult = scoreImpact(text);
  const formattingResult = scoreFormatting(text);
  const completenessResult = scoreSectionCompleteness(text);

  // Weighted average (30% + 25% + 20% + 15% + 10%)
  const rawScore =
    keywordResult.score * 0.30 +
    actionVerbResult.score * 0.25 +
    impactResult.score * 0.20 +
    formattingResult.score * 0.15 +
    completenessResult.score * 0.10;

  // Round to 1 decimal
  const overall_score = Math.round(rawScore * 10) / 10;

  return {
    overall_score,
    breakdown: {
      keyword_density: { score: keywordResult.score, max: 10, comment: keywordResult.comment },
      action_verb_usage: { score: actionVerbResult.score, max: 10, comment: actionVerbResult.comment },
      impact_accomplishments: { score: impactResult.score, max: 10, comment: impactResult.comment },
      formatting_structure: { score: formattingResult.score, max: 10, comment: formattingResult.comment },
      section_completeness: { score: completenessResult.score, max: 10, comment: completenessResult.comment },
    },
  };
}
