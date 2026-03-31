export type TF4SubItem = {
  label: string;
  text: string;
  answer?: string;
  isUnderlined?: boolean;
};

export function hasUnderlinedToken(text: string): boolean {
  return /\[\[UL\]\].*?\[\[\/UL\]\]/i.test(text);
}

export function stripParserTokens(text: string): string {
  return text
    // Preserve image position markers as [img:N] for inline rendering
    .replace(/\{\{IMG:(\d+)\}\}/g, '[img:$1]')
    .replace(/\[\[UL\]\]|\[\[\/UL\]\]/g, '')
    // Resolve [[LATEX:...]] markers to their LaTeX content
    .replace(/\[\[LATEX:(.*?)\]\]/g, (_m, latex: string) => latex.trim())
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferMcqAnswerFromUnderline(options: string[]): string {
  const indexes = options
    .map((opt, idx) => ({ idx, underlined: hasUnderlinedToken(opt) }))
    .filter((x) => x.underlined)
    .map((x) => x.idx);

  if (indexes.length === 1) return String.fromCharCode(65 + indexes[0]);
  return '';
}

export function inferTF4AnswersFromUnderline(subItems: TF4SubItem[]): TF4SubItem[] {
  return subItems.map((s) => ({
    ...s,
    answer: s.answer || (s.isUnderlined ? 'Đúng' : 'Sai'),
  }));
}

export function formatTF4AnswerString(subItems: TF4SubItem[]): string {
  return subItems
    .map((s) => `${s.label}-${s.answer === 'Đúng' ? 'Đ' : 'S'}`)
    .join(' ');
}
