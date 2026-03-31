#!/usr/bin/env node
/**
 * Node.js wrapper for Python DOCX parser
 * Called by Next.js API route to parse DOCX files with underline detection
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node parse_docx_node.js <file.docx>');
  process.exit(1);
}

const filePath = args[0];

if (!fs.existsSync(filePath)) {
  console.error(JSON.stringify({ error: `File not found: ${filePath}` }));
  process.exit(1);
}

try {
  const scriptPath = path.join(__dirname, 'docx_parser.py');
  const result = execSync(`python "${scriptPath}" "${filePath}"`, {
    timeout: 30000,
    encoding: 'utf-8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  
  console.log(result);
} catch (err) {
  console.error(JSON.stringify({ error: err.message || 'Python parser failed' }));
  process.exit(1);
}