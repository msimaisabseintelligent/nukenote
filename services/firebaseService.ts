import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  User,
  Auth
} from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  setDoc, 
  onSnapshot, 
  persistentLocalCache, 
  Firestore 
} from "firebase/firestore";
import { BlockData, Edge } from "../types";
import { firebaseConfig } from "./firebaseConfig";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

export const initializeFirebase = () => {
    try {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            
            // Initialize Firestore with persistent cache for offline support
            db = initializeFirestore(app, {
                localCache: persistentLocalCache()
            });
        } else {
            app = getApps()[0];
            auth = getAuth(app);
            db = getFirestore(app);
        }
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
    return { app, auth, db };
};

// Initialize immediately so db/auth are available, but handle errors gracefully
initializeFirebase();

// -- Auth --

export const signInWithGoogle = async () => {
    if (!auth) initializeFirebase();
    if (!auth) throw new Error("Firebase Auth not initialized. Check your API keys.");
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
};

export const signUpWithEmail = async (email: string, pass: string) => {
    if (!auth) initializeFirebase();
    if (!auth) throw new Error("Firebase Auth not initialized.");
    return createUserWithEmailAndPassword(auth, email, pass);
};

export const logInWithEmail = async (email: string, pass: string) => {
    if (!auth) initializeFirebase();
    if (!auth) throw new Error("Firebase Auth not initialized.");
    return signInWithEmailAndPassword(auth, email, pass);
};

export const logout = async () => {
    if (!auth) initializeFirebase();
    if (!auth) return;
    return signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    if (!auth) initializeFirebase();
    if (!auth) {
        // If auth failed to init, callback with null immediately so app doesn't hang
        callback(null);
        return () => {};
    }
    return onAuthStateChanged(auth, callback);
};

// -- Data Sync (users/{userId}/notes/main) --

export const saveWorkspaceToCloud = async (userId: string, data: { blocks: BlockData[], edges: Edge[] }) => {
    if (!db) return;
    try {
        // Saving to users/{userId}/notes/main (Single document for the canvas)
        await setDoc(doc(db, "users", userId, "notes", "main"), {
            ...data,
            lastUpdated: new Date()
        });
    } catch (e) {
        console.error("Error saving workspace:", e);
    }
};

export const subscribeToWorkspace = (userId: string, callback: (data: { blocks: BlockData[], edges: Edge[] } | null) => void) => {
    if (!db) return () => {};
    // Listening to users/{userId}/notes/main
    return onSnapshot(doc(db, "users", userId, "notes", "main"), (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as any);
        } else {
            callback(null);
        }
    });
};
