"use client";

import Link from "next/link";
import { Mail, Github, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 dark:bg-slate-950 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold mb-4">Tài liệu học tập</h3>
            <p className="text-gray-400">
              Nền tảng chia sẻ tài liệu học tập hiện đại cho giáo viên và học sinh.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Liên kết</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-gray-400 hover:text-white transition-colors">
                  Đăng nhập
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="text-gray-400 hover:text-white transition-colors">
                  Đăng ký
                </Link>
              </li>
            </ul>
          </div>

          {/* For Teachers */}
          <div>
            <h4 className="font-semibold mb-4">Giáo viên</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/teacher/upload" className="text-gray-400 hover:text-white transition-colors">
                  Tải tài liệu lên
                </Link>
              </li>
              <li>
                <Link href="/teacher/documents" className="text-gray-400 hover:text-white transition-colors">
                  Quản lý tài liệu
                </Link>
              </li>
            </ul>
          </div>

          {/* For Students */}
          <div>
            <h4 className="font-semibold mb-4">Học sinh</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/student/library" className="text-gray-400 hover:text-white transition-colors">
                  Thư viện tài liệu
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                  Bảng điều khiển
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <hr className="border-gray-700 my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 mb-4 md:mb-0">
            &copy; 2026 Hệ thống lưu trữ tài liệu học tập. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex gap-6">
            <a
              href="mailto:support@example.com"
              className="text-gray-400 hover:text-white transition-colors"
              title="Email"
            >
              <Mail className="w-5 h-5" />
            </a>
            <a
              href="https://github.com"
              className="text-gray-400 hover:text-white transition-colors"
              title="GitHub"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://linkedin.com"
              className="text-gray-400 hover:text-white transition-colors"
              title="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
