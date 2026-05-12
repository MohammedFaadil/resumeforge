/**
 * Clean, battle-tested LaTeX resume generator.
 * Targets 1.5 pages minimum — optimized margins and spacing.
 * Avoids titlesec/tabularx bugs. Uses only core LaTeX packages.
 */
export function generateLatexFromJSON(data: any): string {
  if (!data) return '';

  // ── Escape user data only (never LaTeX commands) ──────────────────────────
  const esc = (str: string | null | undefined): string => {
    if (!str) return '';
    return String(str)
      .replace(/\\/g,  '\\textbackslash{}')
      .replace(/&/g,   '\\&')
      .replace(/%/g,   '\\%')
      .replace(/\$/g,  '\\$')
      .replace(/#/g,   '\\#')
      .replace(/_/g,   '\\_')
      .replace(/\{/g,  '\\{')
      .replace(/\}/g,  '\\}')
      .replace(/~/g,   '\\textasciitilde{}')
      .replace(/\^/g,  '\\textasciicircum{}')
      .replace(/</g,   '\\textless{}')
      .replace(/>/g,   '\\textgreater{}')
      // Strip any residual AI placeholders and textbullets
      .replace(/\[SUGGESTED:[^\]]*\]/gi, '')
      .replace(/\[NUMBER\]/gi,           '')
      .replace(/\[X%\]/gi,               '')
      .replace(/\[METRIC\]/gi,           '')
      .replace(/\\{}textbullet\\{}\}/gi, ' ')
      .replace(/\{\}textbullet\{\}/gi,   ' ')
      .replace(/textbullet/gi,           '')
      .replace(/\s{2,}/g,               ' ')
      .trim();
  };

  // Join skill strings with comma separator
  const joinSkills = (arr: string[]): string =>
    (arr || []).filter(Boolean).map(esc).join(', ');

  const { contact, summary, experience, education, skills, certifications } = data;

  // ── Contact header ────────────────────────────────────────────────────────
  const parts: string[] = [];
  if (contact?.phone)    parts.push(esc(contact.phone));
  if (contact?.email)    parts.push(`\\href{mailto:${esc(contact.email)}}{${esc(contact.email)}}`);
  if (contact?.location) parts.push(esc(contact.location));
  if (contact?.linkedin) {
    const lnRaw  = String(contact.linkedin).replace(/^https?:\/\//i, '');
    const lnEsc  = esc(lnRaw);
    parts.push(`\\href{https://${lnEsc}}{${lnEsc}}`);
  }
  if (contact?.github) {
    const ghRaw  = String(contact.github).replace(/^https?:\/\//i, '');
    const ghEsc  = esc(ghRaw);
    parts.push(`\\href{https://${ghEsc}}{${ghEsc}}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const summaryTex = summary
    ? `\\resumesection{Professional Summary}\n\\noindent ${esc(summary)}\n`
    : '';

  // ── Experience ────────────────────────────────────────────────────────────
  let experienceTex = '';
  if (Array.isArray(experience) && experience.length > 0) {
    const blocks = experience.map((exp: any) => {
      const bullets = (Array.isArray(exp.bullets) ? exp.bullets : [])
        .filter((b: string) => b && b.trim().length > 3)
        .map((b: string) => `  \\item ${esc(b)}`)
        .join('\n');
      const endDate = exp.end === 'Present' ? 'Present' : esc(exp.end);
      return [
        `\\noindent\\textbf{${esc(exp.title)}}\\hfill\\textit{${esc(exp.start)} -- ${endDate}}\\\\`,
        `\\textit{${esc(exp.company)}}${exp.location ? `,\\ ${esc(exp.location)}` : ''}`,
        `\\begin{itemize}[leftmargin=1.5em,topsep=2pt,itemsep=2pt,parsep=0pt,partopsep=0pt]`,
        bullets,
        `\\end{itemize}`,
      ].join('\n');
    });
    experienceTex = `\\resumesection{Experience}\n${blocks.join('\n\\vspace{8pt}\n')}\n`;
  }

  // ── Education ─────────────────────────────────────────────────────────────
  let educationTex = '';
  if (Array.isArray(education) && education.length > 0) {
    const blocks = education.map((edu: any) => {
      const gpa = edu.gpa ? `\\textbf{GPA: ${esc(edu.gpa)}}` : '';
      const locationStr = edu.location ? `, ${esc(edu.location)}` : '';
      // Two-column row: left = institution + degree + location; right = year (right-aligned)
      // Using \parbox so long institution names wrap cleanly without breaking \hfill
      return [
        `\\noindent`,
        `\\begin{minipage}[t]{0.72\\linewidth}`,
        `  \\textbf{${esc(edu.institution)}}${locationStr}\\\\`,
        `  \\textit{${esc(edu.degree)}}${gpa ? `\\\\ ${gpa}` : ''}`,
        `\\end{minipage}%`,
        `\\hfill`,
        `\\begin{minipage}[t]{0.25\\linewidth}`,
        `  \\raggedleft\\textit{${esc(edu.year)}}`,
        `\\end{minipage}`,
      ].join('\n');
    });
    educationTex = `\\resumesection{Education}\n${blocks.join('\n\\vspace{8pt}\n')}\n`;
  }

  // ── Skills ────────────────────────────────────────────────────────────────
  // Label column is 4.2cm — wide enough for "Tools & Platforms:" without wrapping.
  // Content column fills the rest of \linewidth.
  const LABEL_W = '4.2cm';
  const LABEL_GAP = '0.25cm';
  let skillsTex = '';
  const skillRows: string[] = [];
  if (Array.isArray(skills?.technical) && skills.technical.length > 0)
    skillRows.push(`  \\textbf{Technical:} & ${joinSkills(skills.technical)} \\\\[3pt]`);
  if (Array.isArray(skills?.tools) && skills.tools.length > 0)
    skillRows.push(`  \\textbf{Tools \\& Platforms:} & ${joinSkills(skills.tools)} \\\\[3pt]`);
  if (Array.isArray(skills?.soft) && skills.soft.length > 0)
    skillRows.push(`  \\textbf{Professional:} & ${joinSkills(skills.soft)} \\\\`);

  if (skillRows.length > 0) {
    skillsTex = `\\resumesection{Skills}
\\begin{tabular}{@{}p{${LABEL_W}}@{\\hspace{${LABEL_GAP}}}p{\\dimexpr\\linewidth-${LABEL_W}-${LABEL_GAP}\\relax}@{}}
${skillRows.join('\n')}
\\end{tabular}\n`;
  }

  // ── Certifications ────────────────────────────────────────────────────────
  let certsTex = '';
  const realCerts = (Array.isArray(certifications) ? certifications : [])
    .filter((c: any) => c?.name && String(c.name).trim().length > 1);
  if (realCerts.length > 0) {
    const items = realCerts
      .map((c: any) =>
        `  \\item \\textbf{${esc(c.name)}}` +
        (c.issuer ? ` -- ${esc(c.issuer)}` : '') +
        (c.year   ? ` (${esc(c.year)})`    : '')
      )
      .join('\n');
    certsTex = `\\resumesection{Certifications}
\\begin{itemize}[leftmargin=1.5em,topsep=2pt,itemsep=1pt,parsep=0pt]
${items}
\\end{itemize}\n`;
  }

  // ── Full document ─────────────────────────────────────────────────────────
  return `% !TEX program = pdflatex
\\documentclass[10.5pt,a4paper]{article}

% ---------- packages ----------
\\usepackage[top=0.65in,bottom=0.65in,left=0.75in,right=0.75in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\usepackage{microtype}
\\usepackage[hidelinks]{hyperref}
\\usepackage{enumitem}
\\usepackage{array}
\\usepackage{calc}        % for \\dimexpr
\\usepackage{setspace}

% ---------- layout ----------
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setstretch{1.05}

% ---------- custom section command ----------
% Prints: BOLD UPPERCASE label + full-width rule underneath
\\newcommand{\\resumesection}[1]{%
  \\vspace{10pt}%
  {\\large\\bfseries\\MakeUppercase{#1}}%
  \\vspace{2pt}\\\\%
  \\noindent\\rule{\\linewidth}{0.8pt}%
  \\vspace{5pt}%
}

% ---------- document ----------
\\begin{document}

% ===== HEADER =====
\\begin{center}
  {\\LARGE\\bfseries ${esc(contact?.name)}}\\\\[4pt]
  {\\small ${parts.join(' \\enspace|\\enspace ')}}
\\end{center}

\\vspace{2pt}
\\noindent\\rule{\\linewidth}{1pt}
\\vspace{2pt}

${summaryTex}
${experienceTex}
${educationTex}
${skillsTex}
${certsTex}
\\end{document}
`;
}
