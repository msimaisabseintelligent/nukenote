import React, { useState, useRef, useEffect } from 'react';
import { Type, CheckSquare, Image, Code, Plus, Undo, Sparkles, TableIcon, Send } from './Icons';

export type ThemeId = 'lumina-light' | 'lumina-dark' | 'crimson' | 'slate' | 'contrast';

interface ToolbarProps {
  onAddBlock: (type: any) => void;
  onUndo: () => void;
  canUndo: boolean;
  onAiSubmit: (prompt: string) => void;
  aiMode: boolean;
  setAiMode: (mode: boolean) => void;
  isLoading: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onAddBlock,
  onUndo,
  canUndo,
  onAiSubmit,
  aiMode,
  setAiMode,
  isLoading
}) => {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aiMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [aiMode]);

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onAiSubmit(prompt);
      setPrompt('');
    }
  };

  // Icon Bar
  if (!aiMode) {
    return (
      <div className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-full max-w-full px-4 pointer-events-none animate-slide-up origin-bottom">
          {/* Main Bar Wrapper */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-2xl shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-2xl p-1.5 md:p-2 flex items-center gap-1 md:gap-2 pointer-events-auto max-w-[95vw] ring-1 ring-black/5">
          
          {/* Scrollable Tools Section */}
          <div className="flex items-center gap-1 md:gap-2 overflow-x-auto scrollbar-hide px-1">
            <button
                onClick={() => onAddBlock('text')}
                className="p-2 md:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Add Text"
            >
                <Type className="w-5 h-5" />
            </button>
            <button
                onClick={() => onAddBlock('checklist')}
                className="p-2 md:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Add Checklist"
            >
                <CheckSquare className="w-5 h-5" />
            </button>
            <button
                onClick={() => onAddBlock('table')}
                className="p-2 md:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Add Table"
            >
                <TableIcon className="w-5 h-5" />
            </button>
            <button
                onClick={() => onAddBlock('image')}
                className="p-2 md:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Add Image"
            >
                <Image className="w-5 h-5" />
            </button>
            <button
                onClick={() => onAddBlock('code')}
                className="p-2 md:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 transition-all hover:scale-105 active:scale-95 shrink-0"
                title="Add Code"
            >
                <Code className="w-5 h-5" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0"></div>

          {/* Static Actions Section (Undo, AI) */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`p-2 md:p-2.5 rounded-xl transition-all shrink-0 ${canUndo ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:scale-105' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                title="Undo"
            >
                <Undo className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0"></div>

            <button
                onClick={() => setAiMode(true)}
                className="flex items-center gap-2 bg-gradient-to-tr from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-primary-500/30 transition-all hover:shadow-primary-500/40 hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap"
            >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">AI Assist</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AI Mode Bar
  return (
    <div className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[95%] md:w-full max-w-2xl px-0 md:px-4 animate-slide-up origin-bottom">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-2xl shadow-primary-500/20 border border-primary-500/30 rounded-2xl p-1.5 md:p-2 flex items-center gap-1 md:gap-2 relative">
            
            {/* Hidden on small mobile to save space for input */}
            <div className="text-primary-500 p-2 animate-pop-in hidden sm:block" style={{ animationDelay: '0.1s' }}>
                <div className="animate-pulse">
                   <Sparkles className="w-6 h-6" />
                </div>
            </div>

            <form onSubmit={handleAiSubmit} className="flex-1">
                <input
                    ref={inputRef}
                    type="text"
                    className="w-full bg-transparent text-base md:text-lg p-2 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
                    placeholder="Ask AI..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                />
            </form>

            {isLoading && (
                 <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary-500 to-indigo-500 animate-[progress_1.5s_infinite_linear] w-full rounded-b-2xl opacity-50" />
            )}

            <button
                onClick={handleAiSubmit}
                disabled={isLoading || !prompt.trim()}
                className="p-2 md:p-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all animate-pop-in shrink-0"
                style={{ animationDelay: '0.3s' }}
            >
                <Send className="w-5 h-5" />
            </button>

             <button
                onClick={() => setAiMode(false)}
                className="p-2 md:p-2.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded-xl transition-all animate-pop-in shrink-0"
                title="Close AI"
                style={{ animationDelay: '0.4s' }}
            >
                <Plus className="w-5 h-5 rotate-45" />
            </button>
        </div>
        <style>{`
          @keyframes progress {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
          }
        `}</style>
    </div>
  );
};
