import React, { useRef } from 'react';
import { ThemeId } from './Toolbar';
import { XIcon, Database, Download, Upload, Moon, Sun, Trash, Layout, Layers, Cloud, Globe, User, LogOut } from './Icons';
import { User as FirebaseUser } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  preventOverlap: boolean;
  setPreventOverlap: (v: boolean) => void;
  user: FirebaseUser | null;
  isCloudConfigured: boolean;
  onSetupCloud: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onDeploy: () => void;
}

const THEMES: { id: ThemeId; color: string; bg: string; label: string }[] = [
    { id: 'lumina-dark', color: '#8b5cf6', bg: '#0d1117', label: 'Lumina Dark' },
    { id: 'lumina-light', color: '#8b5cf6', bg: '#f3f4f6', label: 'Lumina Light' },
    { id: 'crimson', color: '#ef4444', bg: '#1a0505', label: 'Crimson' },
    { id: 'slate', color: '#a1a1aa', bg: '#0a0a0a', label: 'Slate' },
    { id: 'contrast', color: '#facc15', bg: '#000000', label: 'High Contrast' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentTheme,
  setTheme,
  onExport,
  onImport,
  onClear,
  preventOverlap,
  setPreventOverlap,
  user,
  isCloudConfigured,
  onSetupCloud,
  onLogin,
  onLogout,
  onDeploy
}) => {
  const { isGuest } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 backdrop-blur-sm ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar Panel */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900 shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          
          {/* Header */}
          <div className="p-5 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-titan">nukenote</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-8">
            
            {/* Cloud & Publishing Section */}
            <section>
                 <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Cloud className="w-3.5 h-3.5" /> Cloud Sync
                </h3>
                
                <div className="space-y-3">
                    {!user ? (
                        <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-900/30 text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                                Sign in to enable offline sync and cross-device access.
                            </p>
                            <button 
                                onClick={onLogin}
                                className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                Setup Sync / Sign In
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* User Profile */}
                            <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden ${isGuest ? 'bg-gray-400' : 'bg-gradient-to-tr from-primary-400 to-indigo-500'}`}>
                                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.displayName || 'User'}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                </div>
                                <button onClick={onLogout} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Log Out">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                            
                            {/* Sync Status */}
                            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                                {isGuest ? (
                                    <span className="flex items-center gap-1.5 text-orange-500">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                        Offline Mode (Guest)
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        Syncing to Firestore
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </section>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* Settings Section */}
            <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" /> Workspace Settings
                </h3>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Prevent Overlap</span>
                    <button 
                        onClick={() => setPreventOverlap(!preventOverlap)}
                        className={`w-10 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none ${preventOverlap ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${preventOverlap ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                </div>
            </section>

            {/* Database Section */}
            <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Database className="w-3.5 h-3.5" /> Local Storage
                </h3>
                
                <div className="space-y-2">
                    <button 
                        onClick={onExport}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-gray-700 group"
                    >
                        <span className="flex items-center gap-3">
                            <Download className="w-4 h-4 text-gray-400 group-hover:text-primary-500" />
                            <span className="text-sm">Export JSON</span>
                        </span>
                    </button>

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={onImport} 
                        className="hidden" 
                        accept=".json"
                    />
                    <button 
                        onClick={handleFileClick}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors border border-gray-200 dark:border-gray-700 group"
                    >
                        <span className="flex items-center gap-3">
                            <Upload className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            <span className="text-sm">Import File</span>
                        </span>
                    </button>
                    
                    <button 
                        onClick={() => { if(confirm('Are you sure you want to clear the canvas?')) onClear(); }}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 dark:text-red-400 transition-colors border border-gray-200 dark:border-gray-700 group mt-4"
                    >
                        <span className="flex items-center gap-3">
                            <Trash className="w-4 h-4" />
                            <span className="text-sm">Clear Canvas</span>
                        </span>
                    </button>
                </div>
            </section>

            {/* Themes Section */}
            <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Layout className="w-3.5 h-3.5" /> Appearance
                </h3>
                <div className="grid gap-2">
                    {THEMES.map(theme => (
                        <button
                            key={theme.id}
                            onClick={() => setTheme(theme.id)}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all border ${
                                currentTheme === theme.id 
                                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300' 
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            <div 
                                className="w-6 h-6 rounded-full border shadow-sm flex items-center justify-center shrink-0" 
                                style={{ backgroundColor: theme.bg, borderColor: theme.color }}
                            >
                                {currentTheme === theme.id && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                            </div>
                            <span className="text-sm">{theme.label}</span>
                        </button>
                    ))}
                </div>
            </section>

          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex flex-col gap-1">
                 <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 font-titan tracking-wider">NUKENOTE</h2>
            </div>
            <div className="mt-1 text-[10px] text-gray-400">
                v1.2.0 • Offline Ready
            </div>
          </div>
        </div>
      </div>
    </>
  );
};