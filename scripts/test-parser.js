// Test the new HTML-based parser logic
const mammoth = require('mammoth');
const fs = require('fs');

async function main() {
  const buf = fs.readFileSync('public/Mau-Thu-K12-Online.docx');
  
  // Extract HTML
  const imageUrls = [];
  const htmlResult = await mammoth.convertToHtml({buffer: buf}, {
    convertImage: mammoth.images.imgElement(async (image) => {
      const base64 = await image.read('base64');
      const src = `data:${image.contentType};base64,${base64.slice(0, 30)}`;
      imageUrls.push(src);
      return { src };
    }),
  });

  console.log('Images found:', imageUrls.length);

  // tokenizeHtml
  function tokenizeHtml(html) {
    const tokens = [];
    let cleaned = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n');
    const imgRegex = /<img\s+[^>]*src\s*=\s*"([^"]+)"[^>]*>/gi;
    let lastIndex = 0, match;
    while ((match = imgRegex.exec(cleaned)) !== null) {
      const before = cleaned.slice(lastIndex, match.index).replace(/<[^>]*>/g, '');
      if (before.trim()) tokens.push({ type: 'text', value: before });
      tokens.push({ type: 'img', value: match[1] });
      lastIndex = match.index + match[0].length;
    }
    const rest = cleaned.slice(lastIndex).replace(/<[^>]*>/g, '');
    if (rest.trim()) tokens.push({ type: 'text', value: rest });
    return tokens;
  }

  function tokensToAnnotatedLines(tokens) {
    const imageMap = new Map();
    let imgCounter = 0, combined = '';
    for (const tok of tokens) {
      if (tok.type === 'img') {
        imageMap.set(imgCounter, tok.value);
        combined += `{{IMG:${imgCounter}}}`;
        imgCounter++;
      } else {
        combined += tok.value;
      }
    }
    const lines = combined
      .replace(/\u00A0/g, ' ')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    return { lines, imageMap };
  }

  const tokens = tokenizeHtml(htmlResult.value);
  const { lines, imageMap } = tokensToAnnotatedLines(tokens);
  
  console.log('Total lines:', lines.length);
  console.log('Images in map:', imageMap.size);

  // Test question detection
  const qRegex = /^Câu\s*(\d+)\s*[:.)\-]?\s*(?:\[(TF4|TF|SAQ|TL|MCQ)\]\s*)?(.*)$/i;
  const qRegexAlt = /^Câu\s*(\d+)\s*\((TF4|TF|SAQ|TL|MCQ)\)\s*[:.)\-]?\s*(.*)$/i;
  const optionRegex = /^([A-D])\.\s*(.+)$/i;
  const answerLineRegex = /^Đáp\s*án\s*(?:đúng)?\s*[:\-]?\s*(.*)$/i;
  
  let qCount = 0;
  let types = { mcq: 0, tf: 0, tf4: 0, essay: 0, saq: 0 };
  
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(qRegexAlt) || lines[i].match(qRegex);
    if (!m) { i++; continue; }
    
    const num = parseInt(m[1], 10);
    const hint = (m[2] || '').toUpperCase();
    const text = m[3] || '';
    const options = [];
    let answer = '';
    
    i++;
    while (i < lines.length) {
      const line = lines[i];
      if (qRegex.test(line) || qRegexAlt.test(line) || /^PH[ẦA]N\s*\d+/i.test(line)) break;
      
      const optMatch = line.match(optionRegex);
      if (optMatch) { options.push(optMatch[0]); i++; continue; }
      
      const ansMatch = line.match(answerLineRegex);
      if (ansMatch) { answer = ansMatch[1].trim().replace(/\[.*$/, '').trim(); i++; continue; }
      
      i++;
    }
    
    let type = hint === 'TF4' ? 'tf4' : hint === 'SAQ' ? 'saq' : hint === 'TL' ? 'essay' : hint === 'TF' ? 'tf' : options.length >= 2 ? 'mcq' : /^(Đúng|Sai)$/i.test(answer) ? 'tf' : 'essay';
    types[type]++;
    qCount++;
    console.log(`Q${num} [${type}] options=${options.length} answer="${answer.slice(0,20)}" text="${text.slice(0,50)}"`);
  }
  
  console.log('\n--- MATRIX ---');
  console.log('MCQ:', types.mcq);
  console.log('TF:', types.tf);
  console.log('TF4:', types.tf4);
  console.log('SAQ:', types.saq);
  console.log('Essay:', types.essay);
  console.log('Total:', qCount);
}

main().catch(console.error);
