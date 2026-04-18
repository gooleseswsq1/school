'use client';

/**
 * ProductionMathRenderer — Production-ready math formula renderer for Vercel
 * 
 * This component intelligently chooses between:
 * 1. KaTeX (fast, local rendering) if CSS is loaded
 * 2. SafeMathRenderer (image-based fallback) if KaTeX fails
 * 
 * Solves the issue of math formulas not displaying on Vercel by providing
 * automatic fallback to image rendering.
 */

import React, { useEffect, useState } from 'react';
import LaTeXRenderer from '@/components/latex/LaTeXRenderer';
import SafeMathRenderer from '@/components/latex/SafeMathRenderer';

interface ProductionMathRendererProps {
  content: string;
  isBlock?: boolean;
  className?: string;
  forceImage?: boolean; // Force image rendering (for Vercel)
}

/**
 * Check if KaTeX CSS is loaded
 */
function isKatexLoaded(): boolean {
  if (typeof document === 'undefined') return false;
  
  // Check if KaTeX stylesheet is in DOM
  const katexSheets = Array.from(document.styleSheets)
    .filter(sheet => {
      try {
        return sheet.href?.includes('katex') ?? false;
      } catch {
        return false;
      }
    });
  
  return katexSheets.length > 0;
}

const ProductionMathRenderer: React.FC<ProductionMathRendererProps> = ({
  content,
  isBlock,
  className,
  forceImage = false,
}) => {
  const [useImage, setUseImage] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // On Vercel production, force image rendering after timeout
    // This prevents blank math from displaying while waiting for KaTeX
    if (forceImage) {
      setUseImage(true);
      return;
    }
    
    // Check if KaTeX is available within reasonable time
    const timeoutId = setTimeout(() => {
      if (!isKatexLoaded()) {
        console.warn('[ProductionMathRenderer] KaTeX CSS not loaded, falling back to SafeMathRenderer');
        setUseImage(true);
      }
    }, 500); // 500ms timeout for KaTeX to load
    
    return () => clearTimeout(timeoutId);
  }, [forceImage]);

  // Server-side rendering: use SafeMathRenderer by default
  if (!mounted) {
    return <SafeMathRenderer content={content} className={className} />;
  }

  // If forced or KaTeX failed, use image-based renderer
  if (useImage) {
    return <SafeMathRenderer content={content} className={className} />;
  }

  // Otherwise use fast KaTeX renderer
  return (
    <LaTeXRenderer
      content={content}
      isBlock={isBlock}
      className={className}
    />
  );
};

export default ProductionMathRenderer;
