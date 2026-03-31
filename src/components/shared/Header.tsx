// components/shared/Header.tsx
'use client';

import Link from "next/link";
import { useState } from "react";
import { Menu, X, LogIn, UserPlus } from "lucide-react";
import PentaSchoolLogo from "./PentaSchoolLogo";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/60 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center">
            <PentaSchoolLogo size={38} textSize="text-xl" />
          </Link>

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Trang chủ
            </Link>
            <Link
              href="/#features"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Tính năng
            </Link>
          </nav>

          {/* ── Auth buttons ── */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-1.5"
            >
              <LogIn className="w-4 h-4" />
              Đăng nhập
            </Link>
            <Link
              href="/auth/register"
              className="flex items-center gap-1.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              Đăng ký
            </Link>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* ── Mobile menu ── */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-700 py-4 space-y-3">
            <Link href="/" className="block text-sm text-gray-300 hover:text-white py-1.5">Trang chủ</Link>
            <Link href="/#features" className="block text-sm text-gray-300 hover:text-white py-1.5">Tính năng</Link>
            <div className="flex gap-3 pt-2">
              <Link href="/auth/login" className="flex-1 text-center text-sm font-medium border border-slate-600 text-gray-300 rounded-lg py-2 hover:border-blue-500 hover:text-white transition-colors">
                Đăng nhập
              </Link>
              <Link href="/auth/register" className="flex-1 text-center text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg py-2">
                Đăng ký
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}