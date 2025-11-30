import React, { useState } from 'react';
import { Cloud, XIcon } from './Icons';

interface CloudSetupProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: any) => void;
}

export const CloudSetup: React.FC<CloudSetupProps> = ({ isOpen, onClose, onSave }) => {
    const [configStr, setConfigStr] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        try {
            // Allow loose JSON (keys without quotes if pasted from JS object)
            // But JSON.parse requires strict JSON. 
            // We'll try basic parsing or ask user to paste valid JSON.
            const cleaned = configStr.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":').replace(/'/g, '"');
            const config = JSON.parse(cleaned);
            
            if (!config.apiKey || !config.projectId) {
                throw new Error("Invalid config: missing apiKey or projectId");
            }
            
            onSave(config);
            onClose();
        } catch (e) {
            setError("Invalid JSON format. Please paste the Firebase Config object.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600">
                             <Cloud className="w-6 h-6" />
                         </div>
                         <div>
                             <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Setup Cloud Sync</h2>
                             <p className="text-xs text-gray-500">Connect your own Firebase backend</p>
                         </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                        To enable fully functional authentication and real-time syncing, please provide your 
                        <span className="font-bold text-primary-500"> Firebase Configuration</span>.
                    </p>
                    
                    <ol className="list-decimal pl-4 space-y-2 text-xs text-gray-500 mb-4 marker:text-primary-500">
                        <li>Go to <a href="https://console.firebase.google.com" target="_blank" className="text-blue-500 underline">console.firebase.google.com</a></li>
                        <li>Create a project (free).</li>
                        <li>Enable <strong>Authentication</strong> (Google Provider).</li>
                        <li>Enable <strong>Firestore Database</strong>.</li>
                        <li>Go to Project Settings → General → "Your apps" → SDK setup/configuration (Config).</li>
                        <li>Copy the <code>firebaseConfig</code> object and paste it below.</li>
                    </ol>

                    <textarea
                        className="w-full h-40 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-xs font-mono text-gray-700 dark:text-gray-300 outline-none focus:border-primary-500"
                        placeholder={'{ "apiKey": "...", "authDomain": "...", ... }'}
                        value={configStr}
                        onChange={e => { setConfigStr(e.target.value); setError(''); }}
                    />
                    
                    {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                    <button 
                        onClick={handleSubmit}
                        disabled={!configStr.trim()}
                        className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Connect & Enable
                    </button>
                </div>

            </div>
        </div>
    );
};
