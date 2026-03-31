import { describe, expect, it } from 'vitest';
import { resolveAnimationTargetOpacity, shouldAnimateLatexOverlay } from './latex-animation';

describe('latex-animation guards', () => {
  it('keeps latex fabric object hidden during animation', () => {
    expect(resolveAnimationTargetOpacity({ __latexId: 'latex-1', opacity: 1 })).toBe(0);
  });

  it('preserves non-latex object opacity', () => {
    expect(resolveAnimationTargetOpacity({ opacity: 0.35 })).toBe(0.35);
    expect(resolveAnimationTargetOpacity({})).toBe(1);
  });

  it('flags latex overlays for dedicated animation path', () => {
    expect(shouldAnimateLatexOverlay({ __latexId: 'latex-1' })).toBe(true);
    expect(shouldAnimateLatexOverlay({})).toBe(false);
  });
});
