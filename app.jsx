import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    updateDoc, 
    onSnapshot,
    query
} from 'firebase/firestore';

/**
 * --- TROUBLESHOOTING GUIDE FOR LOCALHOST ---
 * 1. Open your browser console (F12 or Inspect > Console).
 * 2. If you see "Firebase: No Firebase App has been created", check your imports.
 * 3. If you see "Permission Denied", update your Firestore Rules to: 
 * allow read, write: if true;
 */

const firebaseConfig = {
  apiKey: "AIzaSyAINP0qvJxShptoJxbdnAeeshfxDucOOEM",
  authDomain: "oddjobs-4ffed.firebaseapp.com",
  projectId: "oddjobs-4ffed",
  storageBucket: "oddjobs-4ffed.firebasestorage.app",
  messagingSenderId: "838689091529",
  appId: "1:838689091529:web:1c01ec3b40c7768675c218",
  measurementId: "G-Z5MNXGHBX6"
};

// Use a unique path to avoid collisions with other users
const appId = "odd-job-india-v2"; 
const JOBS_PATH = `artifacts/${appId}/public/data/odd_jobs`;

export default function App() {
    const [db, setDb] = useState(null);
    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [debug, setDebug] = useState('Initializing...');
    
    const [title, setTitle] = useState('');
    const [budget, setBudget] = useState('');
    const [description, setDescription] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    // 1. Initialize Firebase
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const firestore = getFirestore(app);
            setDb(firestore);
            setDebug('Firebase App Initialized');

            const initAuth = async () => {
                try {
                    setDebug('Attempting Anonymous Auth...');
                    await signInAnonymously(auth);
                } catch (err) {
                    console.error("Auth Error:", err);
                    setError("Auth Error: Enable Anonymous Auth in Firebase Console.");
                    setDebug('Auth Failed');
                }
            };

            initAuth();
            const unsubscribe = onAuthStateChanged(auth, (u) => {
                if (u) {
                    setUser(u);
                    setDebug(`User Authenticated: ${u.uid.substring(0, 5)}...`);
                }
            });

            return () => unsubscribe();
        } catch (e) {
            setError("Critical Init Error: " + e.message);
        }
    }, []);

    // 2. Real-time Sync
    useEffect(() => {
        if (!db || !user) return;

        setDebug('Connecting to Firestore...');
        const q = query(collection(db, JOBS_PATH));
        
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const fetched = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                fetched.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                setTasks(fetched);
                setLoading(false);
                setDebug('Data Sync Active');
            }, 
            (err) => {
                console.error("Firestore Error:", err);
                setError(`Firestore Error: Check your Database Rules. Path: ${JOBS_PATH}`);
                setLoading(false);
                setDebug('Firestore Blocked');
            }
        );

        return () => unsubscribe();
    }, [db, user]);

    const handlePostTask = async (e) => {
        e.preventDefault();
        if (!title || !budget || !user || !db) return;
        setIsPosting(true);
        try {
            await addDoc(collection(db, JOBS_PATH), {
                title,
                description,
                budget: Number(budget),
                status: 'Available',
                postedByUserId: user.uid,
                acceptedByUserId: null,
                timestamp: Date.now()
            });
            setTitle(''); setBudget(''); setDescription('');
        } catch (err) {
            setError("Post failed: " + err.message);
        } finally {
            setIsPosting(false);
        }
    };

    const handleAcceptTask = async (taskId) => {
        if (!db || !user) return;
        try {
            const taskRef = doc(db, JOBS_PATH, taskId);
            await updateDoc(taskRef, { 
                status: 'In Progress', 
                acceptedByUserId: user.uid 
            });
        } catch (err) {
            setError("Accept failed: " + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold tracking-tighter">OJ</span>
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-tight">OddJob <span className="text-indigo-600">India</span></h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">System Status</p>
                            <p className="text-xs font-semibold text-green-500">{debug}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Global Error Banner */}
                {error && (
                    <div className="col-span-12 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm">
                        <p className="font-bold">System Alert</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Left: Create Post */}
                <div className="lg:col-span-5">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                        <h2 className="text-2xl font-black mb-6 text-gray-800">Post a New Gig</h2>
                        <form onSubmit={handlePostTask} className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Job Name</label>
                                <input 
                                    className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Carry luggage to 3rd floor"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Budget (₹)</label>
                                <input 
                                    type="number"
                                    className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500"
                                    placeholder="500"
                                    value={budget}
                                    onChange={e => setBudget(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Notes</label>
                                <textarea 
                                    className="w-full p-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500 h-24"
                                    placeholder="Any specific instructions?"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isPosting || !user}
                                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
                            >
                                {isPosting ? 'Publishing...' : 'POST JOB NOW'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right: Feed */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Live Market</h2>
                        <span className="text-xs font-bold text-gray-400 uppercase">{tasks.length} Jobs Found</span>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-200 rounded-3xl animate-pulse" />)}
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-gray-200">
                            <div className="text-4xl mb-4">🇮🇳</div>
                            <p className="text-gray-400 font-bold">The market is quiet right now.</p>
                            <p className="text-xs text-gray-300 mt-2">Try posting a job to see it appear here!</p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {tasks.map(task => {
                                const isMine = task.postedByUserId === user?.uid;
                                const isAcceptedByMe = task.acceptedByUserId === user?.uid;
                                const isAvailable = task.status === 'Available';

                                return (
                                    <div key={task.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-black text-lg text-gray-800 group-hover:text-indigo-600 transition-colors">{task.title}</h3>
                                                <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-gray-900">₹{task.budget}</p>
                                                <p className="text-[10px] font-bold text-gray-400">EST. PAY</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between pt-5 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                                <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">{task.status}</span>
                                            </div>
                                            
                                            <button 
                                                onClick={() => handleAcceptTask(task.id)}
                                                disabled={!isAvailable || isMine}
                                                className={`px-8 py-3 rounded-2xl text-xs font-black transition-all ${
                                                    isAcceptedByMe ? 'bg-green-600 text-white shadow-lg shadow-green-100' :
                                                    isMine ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                                                    isAvailable ? 'bg-gray-900 text-white hover:bg-indigo-600 shadow-lg shadow-gray-200' : 'bg-gray-100 text-gray-400'
                                                }`}
                                            >
                                                {isAcceptedByMe ? 'JOB ACCEPTED' : isMine ? 'MY POST' : isAvailable ? 'ACCEPT WORK' : 'TASK TAKEN'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}