import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractTextFromPdf } from '@/lib/pdf-extract';
import prisma from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload to Supabase Storage
    const fileName = `${session.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('resumes')
      .upload(fileName, buffer, {
        contentType: 'application/pdf',
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: `Failed to upload file to storage: ${uploadError.message}` }, { status: 500 });
    }

    const originalFileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resumes/${fileName}`;

    // 2. Extract text
    const extractedText = await extractTextFromPdf(buffer);

    if (!extractedText || extractedText.trim().length < 50) {
      // Remove the invalid file from storage to avoid clutter
      await supabase.storage.from('resumes').remove([fileName]);
      return NextResponse.json({ 
        error: 'Invalid resume format. We could not detect proper text. Please upload a correct format resume (text-based PDF, not a scanned image).' 
      }, { status: 400 });
    }

    // 3. Save to database
    const resume = await prisma.resume.create({
      data: {
        userId: session.user.id,
        originalFileUrl,
        extractedText,
      }
    });

    return NextResponse.json({ 
      message: 'Upload successful', 
      resumeId: resume.id,
      extractedText 
    });

  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
