"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Gamepad2, Brain, Calculator, ArrowLeft, Lock, Users, Medal, Cpu, ChevronsLeft
} from "lucide-react";
import MemoryGame from "./MemoryGame";
import WordleGame from "./WordleGame";
import MathGame from "./MathGame";
import BrandLogo from "./BrandLogo";
import { useLanguage } from "../context/LanguageContext";
import LanguageSelector from "./LanguageSelector";

// --- CONFIGURACIÓN DE JUEGOS ---

const GAMES_MENU = [
    {
        id: "memory",
        title: "Memoria Neural",
        desc: "Sincroniza los pares (+100 PTS)",
        icon: <Brain className="w-8 h-8 md:w-10 md:h-10 text-cyan-300" />, // Iconos más grandes en PC
        colorFrom: "from-cyan-500",
        colorTo: "to-blue-600",
        glow: "shadow-[0_0_30px_rgba(6,182,212,0.5)]",
        border: "border-cyan-500/50",
        locked: false,
    },
    {
        id: "wordle",
        title: "Cripto-Palabra",
        desc: "Desencripta el código (NIVELES)",
        icon: <Cpu className="w-8 h-8 md:w-10 md:h-10 text-fuchsia-300" />,
        colorFrom: "from-fuchsia-500",
        colorTo: "to-purple-600",
        glow: "shadow-[0_0_30px_rgba(217,70,239,0.5)]",
        border: "border-fuchsia-500/50",
        locked: false,
    },
    {
        id: "math",
        title: "Procesador Zen",
        desc: "Cálculo de alta velocidad",
        icon: <Calculator className="w-8 h-8 md:w-10 md:h-10 text-emerald-300" />,
        colorFrom: "from-emerald-500",
        colorTo: "to-teal-600",
        glow: "shadow-[0_0_30px_rgba(16,185,129,0.5)]",
        border: "border-emerald-500/50",
        locked: true,
    },
];

export default function GameHub() {
    const [activeGame, setActiveGame] = useState(null);
    const [score, setScore] = useState(0);
    const [guestScores, setGuestScores] = useState({});
    const [ranking, setRanking] = useState([]);
    const [user, setUser] = useState(null);
    const [showProfileSetup, setShowProfileSetup] = useState(false);

    useEffect(() => {
        // 1. Cargar Puntuaciones de Visitante (Session Storage)
        try {
            const storedGuestScores = sessionStorage.getItem('arcade_guest_scores');
            if (storedGuestScores) {
                try {
                    const parsedScores = JSON.parse(storedGuestScores);
                    // Validar que sea un objeto válido
                    if (parsedScores && typeof parsedScores === 'object') {
                        setGuestScores(parsedScores);
                        const total = Object.values(parsedScores).reduce((a, b) => a + b, 0);
                        setScore(total);
                    }
                } catch (e) {
                    console.error("Error parsing guest scores", e);
                }
            }
        } catch (e) {
            console.warn("SessionStorage access failed:", e);
        }

        // 2. Intentar Cargar Usuario
        try {
            const storedUserId = localStorage.getItem('arcade_user_id');
            if (storedUserId) {
                fetchUser(storedUserId);
            }
        } catch (e) {
            console.warn("LocalStorage access failed:", e);
        }

        // 3. Cargar Ranking Inicial
        fetchLeaderboard();
    }, []);

    const fetchUser = async (userId) => {
        try {
            const res = await fetch(`/api/user?id=${userId}`);
            if (res.ok) {
                const userData = await res.json();
                if (userData && typeof userData === 'object') {
                    setUser(userData);
                    setScore(userData.total_score || 0); // Fallback a 0 si no existe
                }
            } else {
                localStorage.removeItem('arcade_user_id');
            }
        } catch (error) {
            console.error("Error fetching user:", error);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch('/api/leaderboard');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) { // Validación CRÍTICA: Debe ser array
                    const storedUserId = localStorage.getItem('arcade_user_id');
                    const rankedData = data.map(u => ({
                        ...u,
                        name: u.display_name || 'Anónimo', // Fallback
                        points: u.total_score || 0,
                        avatar: u.avatar_emoji || '👾',
                        me: u.id === storedUserId
                    }));
                    setRanking(rankedData);
                } else {
                    console.warn("Leaderboard API returned invalid format (not array)");
                    setRanking([]); // Fallback a lista vacía para evitar crash
                }
            }
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            setRanking([]); // Fallback en error
        }
    };

    // Helper para compatibilidad con dispositivos antiguos (evita error de crypto.randomUUID)
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const handleProfileCreate = async (name, avatar) => {
        const newId = generateUUID();
        try {
            const res = await fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: newId, display_name: name, avatar_emoji: avatar })
            });

            if (res.ok) {
                const newUser = await res.json();
                localStorage.setItem('arcade_user_id', newId);
                setUser(newUser);
                setScore(0);
                setShowProfileSetup(false);
                fetchLeaderboard();
            }
        } catch (error) {
            console.error("Error creating profile:", error);
            alert("Error al conectar con el servidor central.");
        }
    };

    const handleSelectGame = (gameId) => {
        setActiveGame(gameId);
    };

    const handleBackToMenu = () => {
        setActiveGame(null);
        fetchLeaderboard();
    };

    const handleWinGame = async (points) => {
        const currentGameId = activeGame || 'unknown';
        const currentGameScore = guestScores[currentGameId] || 0;
        const newGameScore = currentGameScore + points;

        const newGuestScores = {
            ...guestScores,
            [currentGameId]: newGameScore
        };

        setGuestScores(newGuestScores);
        sessionStorage.setItem('arcade_guest_scores', JSON.stringify(newGuestScores));

        const totalScore = Object.values(newGuestScores).reduce((a, b) => a + b, 0);

        if (user) {
            const newTotal = score + points; // Optimistic
            setScore(newTotal);
            try {
                await fetch('/api/score', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, scoreDelta: points })
                });
                fetchLeaderboard();
            } catch (error) {
                console.error("Error submitting score:", error);
            }
        } else {
            setScore(totalScore);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
            <div className="fixed inset-0 scanlines opacity-10 pointer-events-none z-50"></div>
            <div className="absolute inset-0 z-0 animate-grid-scroll bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none"></div>
            <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-cyan-900/20 via-purple-900/10 to-transparent pointer-events-none blur-3xl z-0"></div>

            <AnimatePresence mode="wait">
                {activeGame ? (
                    <ActiveGameWrapper key="game" gameId={activeGame} onBack={handleBackToMenu} onWin={handleWinGame} />
                ) : (
                    <MenuScreen key="menu" onSelectGame={handleSelectGame} score={score} ranking={ranking} guestScores={guestScores} />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showProfileSetup && <ProfileSetupModal onComplete={handleProfileCreate} />}
            </AnimatePresence>
        </div>
    );
}

// --- PANTALLAS Y COMPONENTES ---

function MenuScreen({ onSelectGame, score, ranking, guestScores }) {
    const [activeTab, setActiveTab] = useState("games");
    const { t } = useLanguage(); // Hook para traducciones

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md md:max-w-4xl mx-auto p-4 md:p-8 min-h-screen flex flex-col relative z-10"
        >
            {/* --- HEADER HÍBRIDO (Pequeño en Móvil / Grande en PC) --- */}
            <header className="flex justify-between items-center mb-8 mt-4 md:mt-10 relative">
                <div className="flex items-center gap-2 md:gap-6">
                    {/* El Logo escala: 75% en móvil, 100% en PC */}
                    <div className="scale-75 md:scale-100 origin-left">
                        <BrandLogo />
                    </div>

                    <div>
                        {/* Texto: 2xl en móvil -> 5xl en PC */}
                        <h1 className="glitch-text text-2xl md:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_10px_rgba(0,255,255,0.3)] cursor-default">
                            {t.menu.title}
                        </h1>
                        {/* Subtítulo: Oculto en móviles muy pequeños, visible normal en PC */}
                        <p className="text-cyan-400/60 text-[10px] md:text-sm uppercase tracking-[0.2em] mt-1 font-bold hidden xs:block">
                            {t.menu.subtitle}
                        </p>
                    </div>
                </div>

                {/* Language Selector + Score Widget */}
                <div className="flex gap-3 items-center">
                    <LanguageSelector />

                    {/* Score Widget: Pequeño en móvil -> Grande en PC */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-yellow-500/30 px-3 py-1 md:px-5 md:py-3 rounded-lg flex items-center gap-2 md:gap-4 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                            <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.8)]"></div>
                            <div>
                                <span className="block text-[8px] md:text-[10px] text-yellow-500/60 font-bold uppercase tracking-widest">{t.menu.energy}</span>
                                <span className="font-black text-lg md:text-3xl text-yellow-300 tracking-wider leading-none">{score}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex p-1 bg-slate-900/80 backdrop-blur-md rounded-lg mb-8 border border-cyan-500/20 shadow-[inset_0_0_20px_rgba(0,255,255,0.05)] relative overflow-hidden">
                <TabButton isActive={activeTab === "games"} onClick={() => setActiveTab("games")} icon={<Gamepad2 className="w-5 h-5 md:w-6 md:h-6" />} label={t.menu.games} />
                <TabButton isActive={activeTab === "ranking"} onClick={() => setActiveTab("ranking")} icon={<Users className="w-5 h-5 md:w-6 md:h-6" />} label={t.menu.ranking} />
            </div>

            <div className="flex-1 relative">
                <AnimatePresence mode="wait">
                    {activeTab === "games" ? <GamesList key="games" onSelectGame={onSelectGame} guestScores={guestScores} /> : <RankingList key="ranking" ranking={ranking} />}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

function TabButton({ isActive, onClick, icon, label }) {
    return (
        <button onClick={onClick} className={`flex-1 py-3 md:py-4 text-sm md:text-base font-black tracking-widest rounded-md flex items-center justify-center gap-2 transition-all relative z-10 overflow-hidden group ${isActive ? "text-cyan-100 bg-cyan-950/50 shadow-[0_0_15px_rgba(0,255,255,0.2)] border-b-2 border-cyan-400" : "text-slate-500 hover:text-cyan-300 hover:bg-cyan-950/30"}`}>
            {isActive && <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-cyan-500/10 opacity-50 animate-pulse"></div>}
            <span className={`relative z-10 flex items-center gap-2 group-hover:scale-105 transition-transform ${isActive ? 'drop-shadow-[0_0_5px_rgba(0,255,255,0.7)]' : ''}`}>{icon} {label}</span>
        </button>
    );
}

function GamesList({ onSelectGame, guestScores = {} }) {
    const { t } = useLanguage(); // Hook para traducciones

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid md:grid-cols-2 gap-5">
            {GAMES_MENU.map((game) => {
                const gameScore = guestScores[game.id] || 0;
                // Obtener título y descripción traducidos
                const gameTitle = game.id === 'memory' ? t.memory.title : game.id === 'wordle' ? t.wordle.title : t.math.title;
                const gameDesc = game.id === 'memory' ? t.memory.desc : game.id === 'wordle' ? t.wordle.desc : t.math.desc;

                return (
                    <motion.button
                        key={game.id}
                        whileHover={!game.locked ? { scale: 1.03, y: -5 } : {}}
                        whileTap={!game.locked ? { scale: 0.98 } : {}}
                        onClick={() => !game.locked && onSelectGame(game.id)}
                        className={`relative overflow-hidden w-full p-1 rounded-2xl text-left transition-all group ${game.locked ? 'opacity-50 grayscale cursor-not-allowed' : `${game.glow} hover:shadow-[0_0_50px_rgba(0,255,255,0.4)]`}`}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-r ${game.colorFrom} ${game.colorTo} via-white/20 opacity-70 rounded-2xl -z-10`}></div>
                        <div className="bg-slate-950/90 backdrop-blur-xl rounded-xl p-5 h-full w-full border border-white/10 flex items-center gap-5 relative overflow-hidden">
                            {!game.locked && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out z-0"></div>}
                            <div className={`p-4 rounded-xl bg-gradient-to-br ${game.colorFrom}/20 ${game.colorTo}/20 shadow-inner border ${game.border} z-10 group-hover:scale-110 transition-transform`}>
                                <div className={!game.locked ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : ""}>{game.icon}</div>
                            </div>
                            <div className="flex-1 relative z-10">
                                <h3 className="font-black text-xl md:text-2xl text-white flex items-center gap-2 mb-1 uppercase tracking-wider">{gameTitle} {game.locked && <Lock className="w-4 h-4 text-slate-500" />}</h3>
                                <p className={`text-xs md:text-sm font-bold ${game.locked ? "text-slate-500" : "text-cyan-300/70"} uppercase tracking-widest`}>{game.locked ? t.menu.access_denied : gameDesc}</p>
                            </div>

                            {/* Score Badge */}
                            {!game.locked && gameScore > 0 && (
                                <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-md flex items-center gap-1 z-20">
                                    <span className="text-[10px] md:text-xs font-black text-yellow-400">{gameScore} PTS</span>
                                </div>
                            )}

                            {!game.locked && <ArrowLeft className="w-5 h-5 text-cyan-500 rotate-180 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all z-10" />}
                        </div>
                    </motion.button>
                );
            })}
        </motion.div>
    );
}

function RankingList({ ranking }) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-4">
            {ranking.map((user, index) => (
                <motion.div
                    key={user.id} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.07 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border backdrop-blur-xl relative overflow-hidden transition-all group ${user.me ? 'bg-purple-900/30 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.2)]' : 'bg-slate-900/60 border-cyan-900/30 hover:border-cyan-500/30 hover:bg-slate-800/80'}`}
                >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${user.me ? 'bg-purple-500' : 'bg-cyan-900 group-hover:bg-cyan-500'} transition-colors`}></div>
                    <div className="w-10 flex justify-center font-black text-2xl italic">
                        {user.rank === 1 ? <Medal className="w-7 h-7 text-yellow-400" /> : user.rank === 2 ? <Medal className="w-7 h-7 text-slate-300" /> : user.rank === 3 ? <Medal className="w-7 h-7 text-amber-700" /> : <span className="text-slate-600 text-lg">#{user.rank}</span>}
                    </div>
                    <div className={`w-12 h-12 rounded-lg bg-slate-800/80 flex items-center justify-center text-2xl border ${user.me ? 'border-purple-500/50' : 'border-cyan-900/50'} shadow-inner relative`}>
                        <span className="relative z-10">{user.avatar}</span>
                    </div>
                    <div className="flex-1">
                        <h4 className={`font-bold text-lg md:text-xl ${user.me ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-300' : 'text-white'} uppercase tracking-wider`}>{user.name}</h4>
                    </div>
                    <div className="text-right"><span className={`block font-black text-2xl md:text-3xl ${user.rank <= 3 ? 'text-yellow-400' : 'text-cyan-200'} leading-none`}>{user.points}</span><span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">PTS</span></div>
                </motion.div>
            ))}
        </motion.div>
    );
}

function ActiveGameWrapper({ gameId, onBack, onWin }) {
    const { t } = useLanguage(); //  Hook para traducciones

    return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }} className="min-h-screen flex flex-col relative z-20 bg-slate-950/90 backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.1)_0%,_transparent_70%)] pointer-events-none"></div>
            <div className="p-6 pt-8 flex items-center justify-between relative z-10 w-full max-w-4xl mx-auto">
                <button onClick={onBack} className="group relative flex items-center">
                    <div className="w-14 h-14 bg-cyan-500 rounded-full flex items-center justify-center z-20 shadow-[0_4px_0_#0891b2] group-hover:translate-y-1 group-hover:shadow-none transition-all cursor-pointer">
                        <ChevronsLeft className="w-8 h-8 text-white stroke-[3]" />
                    </div>
                    <div className="bg-cyan-500 h-10 flex items-center pl-8 pr-6 rounded-r-full -ml-6 z-10 shadow-[0_4px_0_#0891b2] group-hover:translate-y-1 group-hover:shadow-none transition-all cursor-pointer">
                        <span className="text-white font-black text-lg tracking-wider">{t.menu.exit}</span>
                    </div>
                </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full pb-20">
                {gameId === 'memory' && <MemoryGame onWinGame={onWin} />}
                {gameId === 'wordle' && <WordleGame onWinGame={onWin} />}
                {gameId === 'math' && <MathGame />}
            </div>
        </motion.div>
    );
}

function ProfileSetupModal({ onComplete }) {
    const [name, setName] = useState("");
    const [avatar, setAvatar] = useState("👾");
    const AVATARS = ["👾", "👽", "🤖", "👻", "🦁", "🐺", "🦊", "🐻", "🐼", "🐯", "🐲", "🦄"];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim().length > 0) {
            onComplete(name, avatar);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-6"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(6,182,212,0.2)]"
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tighter uppercase mb-2">IDENTIFÍCATE</h2>
                    <p className="text-slate-400 text-sm">Crea tu perfil de agente para guardar tu progreso.</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                        <label className="block text-xs font-bold text-cyan-500 uppercase tracking-widest mb-2">Nombre en Clave</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. CyberNinja"
                            maxLength={15}
                            className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-4 py-3 text-white font-bold tracking-wider outline-none transition-colors"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-cyan-500 uppercase tracking-widest mb-2">Avatar</label>
                        <div className="grid grid-cols-6 gap-2">
                            {AVATARS.map((a) => (
                                <button
                                    key={a}
                                    type="button"
                                    onClick={() => setAvatar(a)}
                                    className={`aspect-square flex items-center justify-center text-2xl rounded-lg border transition-all ${avatar === a ? 'bg-cyan-900/50 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)] scale-110' : 'bg-slate-800 border-transparent hover:bg-slate-700'}`}
                                >
                                    {a}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={name.trim().length === 0}
                        className="mt-4 w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-lg"
                    >
                        Ingresar al Sistema
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}