import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { compileLatexToPdf } from '@/lib/pdf-compiler';
import { supabase } from '@/lib/supabase';

/**
 * Generates a professional PDF from a cover letter text string.
 * Uses a clean LaTeX template — no AI calls needed.
 */

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, (m) => `\\${m}`)
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function generateCoverLetterLatex(letterText: string, candidateName: string): string {
  // Split into paragraphs
  const paragraphs = letterText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const bodyLatex = paragraphs
    .map((p) => escapeLatex(p))
    .join('\n\n\\vspace{0.5em}\n\n');

  return `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{fontenc}
\\usepackage{lmodern}
\\usepackage{setspace}
\\usepackage{parskip}
\\usepackage{xcolor}

\\pagestyle{empty}
\\setstretch{1.25}

\\begin{document}

${bodyLatex}

\\end{document}`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coverLetterText, candidateName } = await req.json();

    if (!coverLetterText || coverLetterText.trim().length < 50) {
      return NextResponse.json({ error: 'Cover letter text is required' }, { status: 400 });
    }

    const name = candidateName || 'Candidate';

    // Generate LaTeX
    const latexSource = generateCoverLetterLatex(coverLetterText, name);

    // Compile to PDF
    const pdfBuffer = await compileLatexToPdf(latexSource);

    // Upload to Supabase
    const fileName = `${session.user.id}/cover-letter-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Cover letter PDF upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
    }

    const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resumes/${fileName}`;

    return NextResponse.json({
      message: 'Cover letter PDF generated',
      pdfUrl,
    });
  } catch (error) {
    console.error('Cover letter PDF error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
