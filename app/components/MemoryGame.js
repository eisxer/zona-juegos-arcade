"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
    Heart, Star, Zap, Smile, Sun, Music, Cpu, AlertCircle, Brain, Eye,
    Gem, Rocket, Atom, Ghost, Anchor, Shield, Tablet, Wifi, Check, Crown,
    MessageSquare, X, Send, HelpCircle, ArrowRight, Menu
} from "lucide-react";

export default function MemoryGame({ onWinGame }) {
    // --- ESTADOS DEL JUEGO ---
    const [progress, setProgress] = useState({});
    const [totalScore, setTotalScore] = useState(0);
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [solved, setSolved] = useState([]);
    const [mistakes, setMistakes] = useState(0);
    const [won, setWon] = useState(false);
    const [pointsEarned, setPointsEarned] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [level, setLevel] = useState(1);
    const [playCount, setPlayCount] = useState(0);
    const [gameState, setGameState] = useState('ready');
    const [timeLeft, setTimeLeft] = useState(7);

    // --- ESTADOS DE UI ADICIONALES ---
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackType, setFeedbackType] = useState("sugerencia");
    const [feedbackText, setFeedbackText] = useState("");
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    const [feedbackStatus, setFeedbackStatus] = useState(null);

    // --- CONFIGURACIÓN FORMSPREE ---
    const FORMSPREE_ENDPOINT = "https://formspree.io/f/mzdzvnyw";

    // --- DATOS TUTORIAL ---
    const TUTORIAL_STEPS = [
        { icon: <Brain className="w-12 h-12 text-cyan-400" />, title: "Bienvenido", desc: "Sincroniza tu memoria encontrando los pares idénticos." },
        { icon: <Eye className="w-12 h-12 text-yellow-400" />, title: "Memoriza", desc: "Tienes unos segundos para ver las cartas antes de que se oculten." },
        { icon: <Rocket className="w-12 h-12 text-orange-400" />, title: "Progresa", desc: "Completa 7 rondas para subir de nivel y ganar rangos de Prestigio." },
        { icon: <MessageSquare className="w-12 h-12 text-purple-400" />, title: "Feedback", desc: "Usa el botón de chat arriba para reportar errores o dar ideas." }
    ];

    // --- CARGA INICIAL ---
    useEffect(() => {
        const storedProgress = localStorage.getItem('arcade_memory_progress');
        if (storedProgress) setProgress(JSON.parse(storedProgress));
        else {
            const initial = {};
            for (let i = 1; i <= 7; i++) initial[i] = { wins: 0, loops: 0, unlocked: i === 1 };
            setProgress(initial);
        }

        const storedScore = localStorage.getItem('arcade_memory_total_score');
        if (storedScore) setTotalScore(parseInt(storedScore));

        if (!localStorage.getItem('arcade_memory_tutorial_seen')) setShowTutorial(true);
    }, []);

    // --- PERSISTENCIA ---
    useEffect(() => {
        if (Object.keys(progress).length > 0) localStorage.setItem('arcade_memory_progress', JSON.stringify(progress));
    }, [progress]);

    // --- LÓGICA DE JUEGO ---
    const LEVELS = {
        1: { pairs: 3, cols: 3, basePoints: 100, bonus: 500, name: "Recluta", time: 7 },
        2: { pairs: 4, cols: 4, basePoints: 200, bonus: 750, name: "Aprendiz", time: 8 },
        3: { pairs: 5, cols: 4, basePoints: 300, bonus: 1000, name: "Agente", time: 10 },
        4: { pairs: 6, cols: 4, basePoints: 400, bonus: 1250, name: "Hacker", time: 12 },
        5: { pairs: 7, cols: 4, basePoints: 500, bonus: 1500, name: "Maestro", time: 15 },
        6: { pairs: 8, cols: 4, basePoints: 600, bonus: 1750, name: "Leyenda", time: 18 },
        7: { pairs: 9, cols: 5, basePoints: 700, bonus: 2000, name: "Omnisciente", time: 20 },
    };

    const ALL_ICONS = [
        { id: 1, icon: <Heart className="text-fuchsia-400 w-8 h-8" /> },
        { id: 2, icon: <Star className="text-yellow-400 w-8 h-8" /> },
        { id: 3, icon: <Zap className="text-cyan-400 w-8 h-8" /> },
        { id: 4, icon: <Sun className="text-orange-400 w-8 h-8" /> },
        { id: 5, icon: <Music className="text-violet-400 w-8 h-8" /> },
        { id: 6, icon: <Smile className="text-emerald-400 w-8 h-8" /> },
        { id: 7, icon: <Gem className="text-pink-400 w-8 h-8" /> },
        { id: 8, icon: <Rocket className="text-red-400 w-8 h-8" /> },
        { id: 9, icon: <Atom className="text-blue-400 w-8 h-8" /> },
        { id: 10, icon: <Ghost className="text-gray-400 w-8 h-8" /> },
        { id: 11, icon: <Anchor className="text-indigo-400 w-8 h-8" /> },
        { id: 12, icon: <Shield className="text-teal-400 w-8 h-8" /> },
        { id: 13, icon: <Tablet className="text-lime-400 w-8 h-8" /> },
        { id: 14, icon: <Wifi className="text-sky-400 w-8 h-8" /> },
        { id: 15, icon: <Crown className="text-amber-400 w-8 h-8" /> },
        { id: 16, icon: <Cpu className="text-rose-400 w-8 h-8" /> },
        { id: 17, icon: <Brain className="text-purple-400 w-8 h-8" /> },
        { id: 18, icon: <Eye className="text-green-400 w-8 h-8" /> },
    ];

    // --- EFECTOS DE JUEGO ---
    useEffect(() => {
        if (!LEVELS[level]) return;
        const config = LEVELS[level];
        const selectedIcons = ALL_ICONS.slice(0, config.pairs);
        const shuffled = [...selectedIcons, ...selectedIcons]
            .sort(() => Math.random() - 0.5)
            .map((c) => ({ ...c, uniqueId: Math.random() }));
        setCards(shuffled);
    }, [level, playCount]);

    useEffect(() => {
        let timer;
        if (gameState === 'memorizing' && timeLeft > 0) timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        else if (gameState === 'memorizing' && timeLeft === 0) setGameState('playing');
        return () => clearTimeout(timer);
    }, [gameState, timeLeft]);

    const startGame = () => { setGameState('memorizing'); setTimeLeft(LEVELS[level].time); };

    const handleCardClick = (uniqueId, id) => {
        if (gameState !== 'playing' || processing || won || flipped.includes(uniqueId) || solved.includes(uniqueId)) return;
        const newFlipped = [...flipped, uniqueId];
        setFlipped(newFlipped);
        if (newFlipped.length === 2) {
            setProcessing(true);
            const [c1, c2] = newFlipped.map(uid => cards.find(c => c.uniqueId === uid));
            if (c1.id === c2.id) {
                setSolved([...solved, c1.uniqueId, c2.uniqueId]);
                setFlipped([]);
                setProcessing(false);
            } else {
                setTimeout(() => { setFlipped([]); setMistakes(p => p + 1); setProcessing(false); }, 1000);
            }
        }
    };

    const gameWonRef = useRef(false);
    useEffect(() => {
        if (cards.length > 0 && solved.length === cards.length && !gameWonRef.current) {
            gameWonRef.current = true;
            const currentLevelData = progress[level] || { wins: 0, loops: 0 };
            const isLooping = currentLevelData.loops > 0;
            const config = LEVELS[level];
            let pts = isLooping ? Math.floor(config.basePoints * 0.5) : config.basePoints;
            if (currentLevelData.wins + 1 === 7) pts += isLooping ? Math.floor(config.bonus * 0.5) : config.bonus;

            const newTotal = totalScore + pts;
            setTotalScore(newTotal);
            localStorage.setItem('arcade_memory_total_score', newTotal.toString());
            setPointsEarned(pts);
            setWon(true);
            setGameState('finished');
            onWinGame(pts);

            const isLevelComplete = (currentLevelData.wins + 1) === 7;
            if (isLevelComplete) confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#FFD700', '#F472B6', '#22D3EE'], scalar: 1.2 });
            else confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 }, scalar: 0.8 });
        }
    }, [solved, cards]);

    const handleKeepTraining = () => {
        setWon(false); setGameState('ready'); setSolved([]); setMistakes(0); setFlipped([]); gameWonRef.current = false;
        const current = progress[level] || { wins: 0, loops: 0, unlocked: true };
        let w = current.wins + 1, l = current.loops;
        if (w >= 7) { w = 0; l++; }
        setProgress({ ...progress, [level]: { ...current, wins: w, loops: l } });
        setPlayCount(p => p + 1);
    };

    const handleNextLevel = () => {
        setWon(false); setGameState('ready'); setSolved([]); setMistakes(0); setFlipped([]); gameWonRef.current = false;
        const current = progress[level] || { wins: 0, loops: 0, unlocked: true };
        let w = current.wins + 1, l = current.loops;
        if (w >= 7) { w = 0; l++; }

        const nextLvl = level + 1;
        const nextData = progress[nextLvl] || { wins: 0, loops: 0, unlocked: false };

        setProgress({ ...progress, [level]: { ...current, wins: w, loops: l }, [nextLvl]: { ...nextData, unlocked: true } });
        if (level < 7) setLevel(p => p + 1); else setLevel(1);
    };

    const handleSendFeedback = async (e) => {
        e.preventDefault(); if (!feedbackText.trim()) return;
        setIsSendingFeedback(true);
        try {
            const res = await fetch(FORMSPREE_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: feedbackType, message: feedbackText, level, score: totalScore })
            });
            if (res.ok) { setFeedbackStatus('success'); setFeedbackText(""); setTimeout(() => { setShowFeedback(false); setFeedbackStatus(null); }, 2000); }
            else setFeedbackStatus('error');
        } catch { setFeedbackStatus('error'); } finally { setIsSendingFeedback(false); }
    };

    const currentWins = progress[level]?.wins || 0;
    const currentLoops = progress[level]?.loops || 0;
    const getGridClass = () => {
        const pairs = LEVELS[level].pairs;
        if (pairs <= 3) return "grid-cols-3";
        if (pairs <= 8) return "grid-cols-4";
        return "grid-cols-5";
    };

    return (
        <div className="flex flex-col items-center w-full max-w-md mx-auto min-h-[600px] p-4 relative">

            {/* --- TOP BAR (HUD) --- */}
            {/* Diseño limpio: Logo izquierda, botones derecha */}
            <div className="w-full flex items-center justify-between mb-2 z-30">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-cyan-500/70 leading-none tracking-widest uppercase">Sistema</span>
                        <span className="text-sm font-black text-white leading-none tracking-wide">NEURAL</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => { setTutorialStep(0); setShowTutorial(true); }} className="w-9 h-9 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-yellow-400 hover:border-yellow-500/50 transition-all flex items-center justify-center">
                        <HelpCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowFeedback(true)} className="w-9 h-9 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all flex items-center justify-center relative">
                        <MessageSquare className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* --- INFO BAR (Nivel & Progreso) --- */}
            {/* Diseño unificado en una sola tarjeta glassmorphism */}
            <div className="w-full bg-slate-900/40 border border-white/5 rounded-2xl p-3 mb-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/30 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                            NIVEL {level}
                        </span>
                        <span className="text-xs font-bold text-slate-300 uppercase">{LEVELS[level].name}</span>
                    </div>
                    {currentLoops > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-950/30 border border-yellow-500/20">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-[10px] font-bold text-yellow-500">Rango {currentLoops}</span>
                        </div>
                    )}
                </div>

                {/* Barra de Progreso Minimalista */}
                <div className="flex justify-between items-center gap-1">
                    {[...Array(7)].map((_, i) => {
                        const active = i < currentWins;
                        const current = i === currentWins;
                        return (
                            <div key={i} className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden relative">
                                {active && <div className="absolute inset-0 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>}
                                {current && <div className="absolute inset-0 bg-slate-600 animate-pulse"></div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- ÁREA DE JUEGO --- */}
            <div className={`relative w-full ${level === 1 ? 'aspect-[3/2]' : 'aspect-[4/5]'} transition-all duration-500 mb-4`}>

                {/* Overlay: Ready */}
                <AnimatePresence>
                    {gameState === 'ready' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-[2px] rounded-xl">
                            <button onClick={startGame} className="group relative px-8 py-3 bg-cyan-500 text-slate-950 font-black text-xl rounded-full shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all overflow-hidden">
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <span className="relative flex items-center gap-2 uppercase tracking-widest"><Brain className="w-5 h-5" /> Iniciar</span>
                            </button>
                            <p className="mt-4 text-cyan-400/60 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
                                {currentWins === 0 && currentLoops === 0 ? "Primera Secuencia" : `Secuencia ${currentWins + 1} / 7`}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Overlay: Memorizing Timer */}
                <AnimatePresence>
                    {gameState === 'memorizing' && (
                        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="absolute -top-12 left-0 right-0 flex justify-center z-20">
                            <div className="px-4 py-1 rounded-full bg-slate-900 border border-yellow-500/30 text-yellow-400 font-bold flex items-center gap-2 shadow-lg shadow-yellow-500/10">
                                <Eye className="w-4 h-4 animate-pulse" />
                                <span>Memoriza: {timeLeft}s</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Grid */}
                <div className={`grid gap-2 w-full h-full ${getGridClass()}`}>
                    {cards.map((card) => (
                        <div key={card.uniqueId} onClick={() => handleCardClick(card.uniqueId, card.id)} className="relative cursor-pointer group perspective-1000">
                            <motion.div className="w-full h-full rounded-lg transition-all shadow-md" initial={false} animate={{ rotateY: flipped.includes(card.uniqueId) || solved.includes(card.uniqueId) || gameState === 'memorizing' ? 180 : 0 }} style={{ transformStyle: "preserve-3d" }}>
                                <div className="absolute inset-0 bg-slate-800/80 rounded-lg border border-white/5 flex items-center justify-center backface-hidden">
                                    <Cpu className="w-5 h-5 text-slate-600 group-hover:text-cyan-500/50 transition-colors" />
                                </div>
                                <div className={`absolute inset-0 flex items-center justify-center rounded-lg border backface-hidden ${solved.includes(card.uniqueId) ? "bg-emerald-500/20 border-emerald-500/50" : "bg-slate-800 border-cyan-400/30"}`} style={{ transform: 'rotateY(180deg)' }}>
                                    <div className={`${cards.length > 12 ? 'scale-75' : 'scale-100'}`}>{card.icon}</div>
                                </div>
                            </motion.div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- FOOTER STATS --- */}
            <div className="w-full grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Puntuación</span>
                    <span className="text-xl font-black text-white tabular-nums tracking-tight">{totalScore}</span>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Fallos</span>
                    <span className={`text-xl font-black tabular-nums tracking-tight ${mistakes > 0 ? "text-red-400" : "text-slate-400"}`}>{mistakes}</span>
                </div>
            </div>

            {/* --- MODALES (Feedback, Tutorial, Victoria) --- */}
            <AnimatePresence>
                {showFeedback && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 relative shadow-2xl">
                            <button onClick={() => setShowFeedback(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-cyan-400" /> Feedback</h3>
                            {feedbackStatus === 'success' ? (
                                <div className="text-center py-8"><Check className="w-12 h-12 text-emerald-500 mx-auto mb-2" /><p className="text-white font-bold">¡Recibido!</p></div>
                            ) : (
                                <form onSubmit={handleSendFeedback} className="flex flex-col gap-3">
                                    <select value={feedbackType} onChange={e => setFeedbackType(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-cyan-500 outline-none"><option value="sugerencia">💡 Sugerencia</option><option value="error">🪲 Error</option></select>
                                    <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Escribe aquí..." className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white h-24 resize-none focus:border-cyan-500 outline-none" required></textarea>
                                    <button type="submit" disabled={isSendingFeedback} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg text-sm">{isSendingFeedback ? '...' : 'Enviar'}</button>
                                </form>
                            )}
                        </motion.div>
                    </motion.div>
                )}

                {showTutorial && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div className="w-full max-w-sm bg-slate-900 border border-cyan-500/30 rounded-3xl p-8 relative text-center">
                            <div className="mb-6 flex justify-center"><div className="p-4 bg-slate-800 rounded-full">{TUTORIAL_STEPS[tutorialStep].icon}</div></div>
                            <h3 className="text-2xl font-black text-white mb-2 uppercase">{TUTORIAL_STEPS[tutorialStep].title}</h3>
                            <p className="text-slate-400 text-sm mb-8">{TUTORIAL_STEPS[tutorialStep].desc}</p>
                            <div className="flex items-center justify-between">
                                <button onClick={() => { localStorage.setItem('arcade_memory_tutorial_seen', 'true'); setShowTutorial(false); }} className="text-xs font-bold text-slate-500 uppercase">Saltar</button>
                                <div className="flex gap-1">{TUTORIAL_STEPS.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === tutorialStep ? "bg-cyan-400" : "bg-slate-700"}`} />)}</div>
                                <button onClick={() => { if (tutorialStep < 3) setTutorialStep(p => p + 1); else { localStorage.setItem('arcade_memory_tutorial_seen', 'true'); setShowTutorial(false); } }} className="px-4 py-2 bg-cyan-500 text-slate-900 font-bold rounded-full text-sm">Siguiente</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {won && (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <div className="w-full bg-slate-900 border border-cyan-500/50 p-6 rounded-3xl text-center shadow-2xl shadow-cyan-500/20">
                            <h3 className="text-2xl font-black text-white mb-1 italic">{(currentWins + 1) === 7 ? "¡MISIÓN CUMPLIDA!" : "¡SISTEMA HACKEADO!"}</h3>
                            <div className="my-6 py-4 bg-slate-800/50 rounded-2xl border border-white/5">
                                <span className="text-4xl font-black text-yellow-400 block">+{pointsEarned}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Puntos</span>
                            </div>
                            <div className="space-y-3">
                                {(currentLoops > 0 || (currentWins + 1) === 7) && level < 7 && (
                                    <button onClick={handleNextLevel} className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl text-white font-bold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
                                        <Rocket className="w-4 h-4" /> NIVEL {level + 1}
                                    </button>
                                )}
                                <button onClick={handleKeepTraining} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-xl font-bold text-sm transition-colors">
                                    {(currentWins + 1) === 7 ? "Reiniciar (Prestigio)" : "Siguiente Ronda"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}