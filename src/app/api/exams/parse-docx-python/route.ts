import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    if (!filename.endsWith('.docx')) {
      return NextResponse.json({ error: 'Chỉ hỗ trợ file .docx' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tmpDir = join(process.cwd(), 'tmp');
    await mkdir(tmpDir, { recursive: true });
    const tmpFile = join(tmpDir, `upload_${Date.now()}.docx`);
    await writeFile(tmpFile, buffer);

    try {
      const scriptPath = join(process.cwd(), 'scripts', 'docx_parser.py');
      const { stdout, stderr } = await execAsync(
        `python "${scriptPath}" "${tmpFile}"`,
        {
          timeout: 30000,
          encoding: 'utf-8',
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        }
      );

      if (stderr && !stdout) {
        console.error('[parse-docx-python] stderr:', stderr);
        return NextResponse.json({ error: `Python parser error: ${stderr}` }, { status: 500 });
      }

      const result = JSON.parse(stdout);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      const questions = result.questions.map((q: any) => ({
        id: `q_${q.num}_${Date.now()}`,
        num: q.num,
        text: q.text,
        type: q.type,
        options: q.options || [],
        subItems: q.subItems?.length > 0 ? q.subItems : undefined,
        answer: q.answer,
        points: 1,
        difficulty: 1,
        images: [],
        inlineImages: [],
        status: q.status,
        warnMsg: q.warnMsg || undefined,
      }));

      return NextResponse.json({
        questions,
        matrix: result.matrix,
        total: result.total,
        okCount: questions.filter((q: any) => q.status === 'ok').length,
        warnCount: questions.filter((q: any) => q.status !== 'ok').length,
      });
    } finally {
      try { await unlink(tmpFile); } catch { /* ignore */ }
    }
  } catch (error: any) {
    console.error('[POST /api/exams/parse-docx-python]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}