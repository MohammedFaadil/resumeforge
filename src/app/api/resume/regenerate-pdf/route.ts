import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateLatexFromJSON } from '@/lib/latex-generator';
import { compileLatexToPdf } from '@/lib/pdf-compiler';
import prisma from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

/**
 * Re-generates the PDF from already-stored optimizedText JSON.
 * Does NOT call the AI again — just re-runs the LaTeX generator + compiler.
 * Useful when the LaTeX template has been fixed and old PDFs need refreshing.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resumeId } = await req.json();
    if (!resumeId) {
      return NextResponse.json({ error: 'Resume ID is required' }, { status: 400 });
    }

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId, userId: session.user.id },
    });

    if (!resume?.optimizedText) {
      return NextResponse.json(
        { error: 'No optimized data found. Please run optimization first.' },
        { status: 404 }
      );
    }

    const optimizedData = JSON.parse(resume.optimizedText);

    // 1. Re-generate LaTeX with the fixed template
    const latexSource = generateLatexFromJSON(optimizedData);

    // 2. Compile via online LaTeX service
    const pdfBuffer = await compileLatexToPdf(latexSource);

    // 3. Upload new PDF to Supabase (overwrite slot)
    const fileName = `${session.user.id}/optimized-${resumeId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,           // overwrite existing file
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
    }

    const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resumes/${fileName}`;

    // 4. Update DB record
    await prisma.resume.update({
      where: { id: resumeId },
      data: { optimizedPdfUrl: pdfUrl, latexSource },
    });

    return NextResponse.json({
      message: 'PDF regenerated successfully',
      pdfUrl,
    });
  } catch (error) {
    console.error('Regenerate PDF error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
