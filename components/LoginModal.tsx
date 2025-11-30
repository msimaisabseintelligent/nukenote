import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { XIcon, Copy } from './Icons';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    const { signInGoogle, signInEmail, signUpEmail, loginAsGuest } = useAuth();
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleError = (err: any) => {
        console.error("Auth Error:", err);
        setErrorCode(err.code);
        
        // Handle Unauthorized Domain by forcing Guest Mode
        if (err.code === 'auth/unauthorized-domain') {
            alert(
                "Notice: This domain is not whitelisted by the cloud provider.\n\n" +
                "The app will switch to 'Guest Mode' (Offline Only) so you can continue working.\n" +
                "Your data will be saved to this device."
            );
            loginAsGuest();
            onClose();
            return;
        }

        // 1. Handle Common User Errors with friendly text
        if (err.code === 'auth/popup-closed-by-user') {
            setError("Sign-in cancelled");
            return;
        } 
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
             setError("Invalid email or password");
             return;
        }
        if (err.code === 'auth/email-already-in-use') {
             setError("This email address is already in use. Please sign in instead.");
             return;
        }
        if (err.code === 'auth/weak-password') {
             setError("Password should be at least 6 characters.");
             return;
        }
        if (err.code === 'auth/network-request-failed') {
             setError("Network error. Please check your connection.");
             return;
        }

        // 2. Handle Configuration Errors (Dev side)
        if (err.code === 'auth/configuration-not-found') {
            setError("Authentication is not enabled in backend configuration.");
        } else if (err.code === 'auth/operation-not-allowed') {
             setError("This sign-in method is disabled in the backend.");
        } else {
            // 3. Fallback: Sanitize generic messages
            let msg = err.message || "Authentication failed";
            msg = msg.replace("Firebase: ", "");
            msg = msg.replace(/\(auth\/.*\)\.?/, "").trim();
            if (msg.endsWith('.')) msg = msg.slice(0, -1);
            
            setError(msg || "An unexpected error occurred.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setErrorCode(null);
        try {
            if (isRegistering) {
                await signUpEmail(email, password);
            } else {
                await signInEmail(email, password);
            }
            onClose();
        } catch (err: any) {
            handleError(err);
        }
    };

    const handleGoogle = async () => {
        setError(null);
        setErrorCode(null);
        try {
            await signInGoogle();
            onClose();
        } catch (err: any) {
            handleError(err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden animate-pop-in">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {isRegistering ? 'Create Account' : 'Sign In'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <button 
                        onClick={handleGoogle}
                        className="w-full py-2.5 bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors mb-4 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        Continue with Google
                    </button>

                    <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">Or continue with email</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <input 
                                type="email" 
                                required
                                placeholder="Email"
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-primary-500 text-gray-800 dark:text-gray-100 placeholder-gray-400"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <input 
                                type="password" 
                                required
                                placeholder="Password"
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-primary-500 text-gray-800 dark:text-gray-100 placeholder-gray-400"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/50">
                                <p className="text-red-600 dark:text-red-300 text-xs font-medium whitespace-pre-wrap leading-relaxed">{error}</p>
                                {errorCode === 'auth/configuration-not-found' && (
                                    <a 
                                        href="https://console.firebase.google.com" 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-[10px] text-red-500 dark:text-red-400 underline mt-1 block hover:text-red-700"
                                    >
                                        Enable Authentication in Backend Console &rarr;
                                    </a>
                                )}
                            </div>
                        )}

                        <button 
                            type="submit"
                            className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-semibold transition-colors mt-2"
                        >
                            {isRegistering ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-4 flex flex-col items-center gap-3">
                        <button 
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                        >
                            {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                        </button>

                        <button
                            onClick={() => { loginAsGuest(); onClose(); }}
                            className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
                        >
                            Continue as Guest (Offline)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};