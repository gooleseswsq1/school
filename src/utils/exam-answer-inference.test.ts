import { describe, expect, it } from 'vitest';
import {
  formatTF4AnswerString,
  hasUnderlinedToken,
  inferMcqAnswerFromUnderline,
  inferTF4AnswersFromUnderline,
  stripParserTokens,
} from './exam-answer-inference';

describe('exam-answer-inference', () => {
  it('detects underline markers', () => {
    expect(hasUnderlinedToken('A. [[UL]]2x+1[[/UL]]')).toBe(true);
    expect(hasUnderlinedToken('A. 2x+1')).toBe(false);
  });

  it('strips parser markers from display text', () => {
    expect(stripParserTokens('Câu [[UL]]1[[/UL]] {{IMG:0}}')).toBe('Câu 1 [img:0]');
  });

  it('infers MCQ answer from single underlined option', () => {
    const answer = inferMcqAnswerFromUnderline([
      'A. 1',
      'B. [[UL]]2[[/UL]]',
      'C. 3',
      'D. 4',
    ]);
    expect(answer).toBe('B');
  });

  it('does not infer MCQ answer when underline is ambiguous', () => {
    expect(inferMcqAnswerFromUnderline(['A. [[UL]]1[[/UL]]', 'B. [[UL]]2[[/UL]]'])).toBe('');
  });

  it('infers TF4 answers from underline map', () => {
    const inferred = inferTF4AnswersFromUnderline([
      { label: 'a', text: '...', isUnderlined: true },
      { label: 'b', text: '...', isUnderlined: false },
    ]);
    expect(inferred[0].answer).toBe('Đúng');
    expect(inferred[1].answer).toBe('Sai');
    expect(formatTF4AnswerString(inferred)).toBe('a-Đ b-S');
  });
});
