"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface EditorLayoutProps {
  sidebar: React.ReactNode;
  editor: React.ReactNode;
  toolbar: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export default function EditorLayout({
  sidebar,
  editor,
  toolbar,
  rightPanel,
}: EditorLayoutProps) {
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Page Tree */}
      <div className="w-64 flex-shrink-0 border-r bg-white overflow-y-auto">
        {sidebar}
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Toolbar - Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex-1">
            {/* Title and description will be here */}
          </div>
          <div className="flex items-center gap-2">
            {rightPanel && (
              <button
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                className="p-2 hover:bg-gray-100 rounded transition text-gray-600"
                title="Toggle right panel"
              >
                {isRightPanelOpen ? (
                  <ChevronRight size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content Area with Right Panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Editor */}
          <div className="flex-1 overflow-y-auto">
            {editor}
          </div>

          {/* Right Tools Panel */}
          {rightPanel && isRightPanelOpen && (
            <div className="w-80 flex-shrink-0 border-l bg-white overflow-y-auto shadow-lg">
              <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
                <h3 className="font-semibold text-sm text-gray-700">Công cụ</h3>
              </div>
              <div className="p-4">
                {rightPanel}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Toolbar - Block Tools */}
        <div className="bg-white border-t sticky bottom-0">
          {toolbar}
        </div>
      </div>
    </div>
  );
}
