// Example: How to integrate Mini Canva button into your existing pages

import Link from 'next/link';
import { Palette, Sparkles, ArrowRight } from 'lucide-react';

/**
 * Example 1: Add button to dashboard
 * File: src/app/dashboard/page.tsx or src/app/page.tsx
 */

export function MiniCanvaButtonSmall() {
  return (
    <Link href="/canva">
      <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 text-white hover:shadow-lg transition-all hover:scale-105 cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Palette size={32} />
            <div>
              <h3 className="font-bold text-lg">Mini Canva</h3>
              <p className="text-sm opacity-90">Create beautiful slides</p>
            </div>
          </div>
          <ArrowRight size={24} />
        </div>
      </div>
    </Link>
  );
}

/**
 * Example 2: Grid layout for multiple tools
 */

export function ToolsGrid() {
  const tools = [
    {
      icon: Palette,
      name: 'Mini Canva',
      desc: 'Create stunning slides',
      href: '/canva',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: Sparkles,
      name: 'Quiz Builder',
      desc: 'Make interactive quizzes',
      href: '/quiz',
      gradient: 'from-blue-500 to-cyan-500',
    },
    // Add more tools
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {tools.map((tool) => (
        <Link key={tool.name} href={tool.href}>
          <div
            className={`bg-gradient-to-br ${tool.gradient} rounded-xl p-6 text-white hover:shadow-lg transition-all hover:scale-105 cursor-pointer`}
          >
            <tool.icon size={32} className="mb-4" />
            <h3 className="font-bold text-lg mb-1">{tool.name}</h3>
            <p className="text-sm opacity-90">{tool.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/**
 * Example 3: In navigation / menu
 */

export function NavMenuItem() {
  return (
    <Link
      href="/canva"
      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition"
    >
      <Palette size={20} />
      <span>Mini Canva</span>
    </Link>
  );
}

/**
 * Example 4: Hero section call-to-action
 */

export function HeroSection() {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-16 px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Create & Present</h1>
        <p className="text-xl opacity-90 mb-8">
          Build beautiful presentations in minutes with our Mini Canva editor
        </p>

        <Link href="/canva">
          <button className="bg-white text-purple-600 font-bold px-8 py-3 rounded-lg hover:bg-gray-100 transition flex items-center gap-2">
            <Palette size={20} />
            Start Creating Now
            <ArrowRight size={20} />
          </button>
        </Link>
      </div>
    </div>
  );
}

/**
 * Example 5: Quick access card in sidebar
 */

export function SidebarQuickAccess() {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <h3 className="font-bold text-gray-800 mb-3">Quick Access</h3>

      <Link href="/canva">
        <div className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg cursor-pointer transition mb-2">
          <Palette size={20} className="text-purple-600" />
          <div>
            <p className="font-medium text-gray-800">Mini Canva</p>
            <p className="text-xs text-gray-600">Create slides</p>
          </div>
        </div>
      </Link>

      <Link href="/quiz">
        <div className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition">
          <Sparkles size={20} className="text-blue-600" />
          <div>
            <p className="font-medium text-gray-800">Quiz Builder</p>
            <p className="text-xs text-gray-600">Create quizzes</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

/**
 * Usage Examples:
 *
 * 1. In your dashboard page:
 * ─────────────────────────────
 * import { MiniCanvaButtonSmall } from '@/components/MiniCanva';
 *
 * export default function Dashboard() {
 *   return (
 *     <div className="p-8">
 *       <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
 *       <MiniCanvaButtonSmall />
 *     </div>
 *   );
 * }
 *
 * 2. In your grid of tools:
 * ─────────────────────────────
 * <ToolsGrid /> Shows all tools including Mini Canva
 */
