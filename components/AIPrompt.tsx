import React, { useState } from 'react';
import { Send, Sparkles } from './Icons';

interface AIPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

export const AIPrompt: React.FC<AIPromptProps> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt);
      setPrompt('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl border border-primary-500/30 p-2 transform transition-all scale-100"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="relative flex items-center">
            <div className="absolute left-4 text-primary-500 animate-pulse">
                <Sparkles className="w-5 h-5" />
            </div>
            <input
                type="text"
                autoFocus
                className="w-full bg-transparent text-lg p-4 pl-12 pr-12 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
                placeholder="Ask AI to create a note, list, or code..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                disabled={isLoading}
            />
            <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="absolute right-2 p-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                <Send className="w-5 h-5" />
            </button>
        </form>
        {isLoading && (
            <div className="px-4 py-2">
                <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 animate-progress w-1/3"></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Dreaming up your blocks...</p>
            </div>
        )}
      </div>
      <style>{`
        @keyframes progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
        }
        .animate-progress {
            animation: progress 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
};
