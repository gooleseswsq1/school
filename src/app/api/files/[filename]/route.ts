import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  
  // Security: only allow specific files
  const allowedFiles = [
    'mau-toan-10.docx',
    'mau-vat-ly-10.txt',
    'mau-hoa-hoc-10.txt',
    'mau-sinh-hoc-10.txt',
    'mau-ngu-van-10.txt',
    'mau-tieng-anh-10.txt'
  ];
  
  if (!allowedFiles.includes(filename)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  
  try {
    const filePath = join(process.cwd(), 'src', 'components', 'teacher', filename);
    
    if (!existsSync(filePath)) {
      // Create sample file content if not exists
      let content = '';
      let contentType = 'text/plain';
      
      if (filename.includes('toan')) {
        content = `Môn: Toán
Chương: Hàm số bậc nhất

Câu 1: Hàm số y = ax + b (a ≠ 0) có đồ thị là?
A. Đường thẳng song song trục hoành
B. Đường thẳng đi qua gốc tọa độ
C. Đường thẳng không song song với cả hai trục
D. Đường thẳng song song trục tung
Đáp án: C [Độ khó: 1] [Điểm: 0.5]

Câu 2 (TF): Hàm số y = 2x là hàm số bậc nhất.
Đáp án: Đúng [Độ khó: 1] [Điểm: 0.5]

Câu 3: Cho hàm số y = -3x + 6. Tìm tọa độ giao điểm của đồ thị với trục tung.
A. (0; 6)
B. (2; 0)
C. (0; -6)
D. (-2; 0)
Đáp án: A [Độ khó: 2] [Điểm: 0.5]`;
      } else if (filename.includes('vat-ly')) {
        content = `Môn: Vật lý
Chương: Động học

Câu 1: Vật chuyển động thẳng đều có đặc điểm gì?
A. Vận tốc thay đổi theo thời gian
B. Quãng đường đi được tỉ lệ với thời gian
C. Gia tốc khác 0
D. Vận tốc bằng 0
Đáp án: B [Độ khó: 1] [Điểm: 0.5]

Câu 2 (TF): Gia tốc của vật chuyển động thẳng đều bằng 0.
Đáp án: Đúng [Độ khó: 1] [Điểm: 0.5]

Câu 3: Một ô tô đi từ A đến B với vận tốc 60 km/h trong 2 giờ. Quãng đường AB dài bao nhiêu?
A. 30 km
B. 60 km
C. 120 km
D. 240 km
Đáp án: C [Độ khó: 1] [Điểm: 0.5]`;
      } else {
        content = `Môn: Mẫu
Chương: Chương mẫu

Câu 1: Đây là câu hỏi mẫu?
A. Đáp án A
B. Đáp án B
C. Đáp án C
D. Đáp án D
Đáp án: A [Độ khó: 1] [Điểm: 0.5]`;
      }
      
      return new NextResponse(content, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
    
    const fileBuffer = readFileSync(filePath);
    
    // Determine content type
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.txt')) {
      contentType = 'text/plain; charset=utf-8';
    } else if (filename.endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}