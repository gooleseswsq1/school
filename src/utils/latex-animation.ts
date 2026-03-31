export type AnimatedLikeObject = {
  __latexId?: string;
  opacity?: number;
};

export function resolveAnimationTargetOpacity(obj: AnimatedLikeObject): number {
  if (obj.__latexId) return 0;
  return typeof obj.opacity === 'number' ? obj.opacity : 1;
}

export function shouldAnimateLatexOverlay(obj: AnimatedLikeObject): boolean {
  return Boolean(obj.__latexId);
}
