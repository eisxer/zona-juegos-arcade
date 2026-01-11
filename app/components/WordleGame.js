"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { HelpCircle, Delete, X, Star, UploadCloud, Crown, ArrowRight, Lock } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import useGameProgress from "../hooks/useGameProgress";

export default function WordleGame({ onWinGame }) {
    const { language, t } = useLanguage();
    const { profile, addGlobalXP, saveGameProgress, getGameData } = useGameProgress();
    const inputRef = useRef(null);

    // --- GAME DATA & PERSISTENCE ---
    const gameData = getGameData('wordle');
    const [level, setLevel] = useState(1);

    // --- DICTIONARIES (EXTENDED TO 7 LEVELS) ---
    const WORDS = {
        es: {
            1: ["CASA", "VIDA", "LUNA", "AMOR", "SOLO", "GATO", "AZUL", "ROJO", "AIRE", "MARS", "AGUA", "FUEG", "TIER", "HOJA", "RICO", "DADO", "TREN", "FLOR", "OSOS", "PATO"],
            2: ["MANO", "PIES", "OJOS", "CARA", "BOCA", "PELO", "DEDO", "UÑAS", "CODO", "PIEL", "RISA", "BESO", "ABRA", "ALMA", "ALAS", "NUBE", "SOLA", "LUZ", "GRIS", "ROSA"],
            3: ["PLUMA", "LLAVE", "LIBRO", "CARTA", "RELOJ", "MESA", "SILLA", "TECHO", "SUELO", "PARED", "PUER", "VENTA", "CAJA", "BOLSA", "LAPIZ", "GOMA", "PAPEL", "TIGRE", "LEON", "LOBO"],
            4: ["EXITO", "PODER", "MENTE", "SUEÑO", "CREAR", "SABER", "VIVIR", "HACER", "LIDER", "FELIZ", "NOBLE", "LIBRE", "JUSTO", "SABIO", "FUERZ", "VALOR", "HONOR", "AMIGO", "PADRE", "MADRE"],
            5: ["FUTURO", "TIEMPO", "GLORIA", "CODIGO", "ACCION", "CAMBIO", "LOGROS", "MENTES", "CUERPO", "SANGRE", "HIERRO", "PIEDRA", "MADERA", "TIERRA", "PLANTA", "ANIMAL", "HUMANO", "PLANET", "GALAXI", "ESTREL"],
            6: ["MUSICA", "POESIA", "TEATRO", "CINEMA", "PINTUR", "DIBUJO", "DISEÑO", "MODELO", "ESTILO", "BELLEZ", "VERDAD", "BONDAD", "VIRTUD", "PECADO", "PERDON", "OLVIDO", "RECUER", "MEMORI", "ORIGEN", "DESTIN"],
            7: ["LIBERTAD", "IGUALDAD", "FRATERNI", "JUSTICIA", "DERECHOS", "DEBERES", "VALORES", "PRINCIPI", "SOCIEDAD", "CULTURA", "HISTORIA", "LENGUAJE", "ESCRITUR", "FILOSOFI", "CIENCIAS", "TECNOLOG", "INDUSTR", "ECONOMIA", "POLITICA", "RELIGION"]
        },
        en: {
            1: ["CODE", "DATA", "MOON", "LOVE", "LONE", "BLUE", "FIRE", "WIND", "MARS", "LIFE", "GAME", "PLAY", "WORK", "HARD", "EASY", "FAST", "SLOW", "COLD", "WARM", "SNOW"],
            2: ["HAND", "FEET", "EYES", "FACE", "HEAD", "HAIR", "NOSE", "EARS", "NECK", "BACK", "SKIN", "BONE", "MIND", "SOUL", "BODY", "LEGS", "ARMS", "KNEE", "FOOT", "TOES"],
            3: ["ALPHA", "BRAVO", "DELTA", "ECHO", "HOTEL", "INDIA", "JULET", "KILO", "LIMA", "MIKE", "NOVEM", "OSCAR", "PAPA", "QUEBE", "ROMEO", "SIERR", "TANGO", "UNIFO", "VICTO", "WHISK"],
            4: ["POWER", "DREAM", "BUILD", "LEARN", "WORLD", "FOCUS", "HAPPY", "SMART", "BRAIN", "LOGIC", "THINK", "SOLVE", "CREATE", "DESIGN", "WRITE", "SPEAK", "LISTEN", "WATCH", "TOUCH", "SMELL"],
            5: ["FUTURE", "SYSTEM", "GLOBAL", "ACTION", "CHANGE", "CODING", "MENTAL", "GROWTH", "SOURCE", "ENERGY", "PLANET", "GALAXY", "ORBIT", "ROCKET", "LAUNCH", "FLIGHT", "PILOT", "RADAR", "SONAR", "LASER"],
            6: ["MEMORY", "SERVER", "ROUTER", "SWITCH", "ACCESS", "DOMAIN", "SCRIPT", "PYTHON", "GOLANG", "RHELM", "DOCKER", "LINUX", "WINDOW", "UBUNTU", "DEBIAN", "FEDORA", "CENTOS", "GENTOO", "CONFIG", "KERNEL"],
            7: ["PROGRAM", "PROJECT", "PRODUCT", "SERVICE", "ACCOUNT", "PROFILE", "CONTACT", "ADDRESS", "COMPANY", "FACTORY", "STATION", "AIRPORT", "SEAPORT", "STADIUM", "SCHOOL", "COLLEGE", "LIBRARY", "HOSPITAL", "OFFICE", "MARKET"]
        }
    };

    // Correct length for manual overrides if dictionary words are inconsistent, otherwise trust the dictionary
    const getLevelLength = (lvl) => {
        if (!WORDS[language][lvl]) return 5;
        // Average length of words in this level
        return WORDS[language][lvl][0].length;
    };


    const LEVELS = {
        1: { length: getLevelLength(1), points: 100, bonus: 500 },
        2: { length: getLevelLength(2), points: 150, bonus: 750 },
        3: { length: getLevelLength(3), points: 200, bonus: 1000 },
        4: { length: getLevelLength(4), points: 250, bonus: 1250 },
        5: { length: getLevelLength(5), points: 300, bonus: 1500 },
        6: { length: getLevelLength(6), points: 400, bonus: 1750 },
        7: { length: getLevelLength(7), points: 500, bonus: 2000 }
    };

    const WINS_TO_LEVEL_UP = 7; // Matches Memory Game

    // Local Game State
    const [solution, setSolution] = useState("");
    const [guesses, setGuesses] = useState(Array(6).fill(null));

    // CHANGE: currentGuess is now an array of chars to allow random access editing
    const [currentGuess, setCurrentGuess] = useState([]);
    // CHANGE: Track which cell is focused (0 to length-1) to allow selecting any cell
    const [focusedIndex, setFocusedIndex] = useState(0);

    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [shakeRow, setShakeRow] = useState(-1);
    const [showHelp, setShowHelp] = useState(false);

    // Derived state from profile
    const progress = gameData.levels || { 1: { unlocked: true, wins: 0, loops: 0 } };
    const currentLevelData = progress[level] || { wins: 0, loops: 0, unlocked: false };
    const levelWins = currentLevelData.wins;

    // --- GAME LOGIC ---

    const selectWordForLevel = (lvl) => {
        const pool = WORDS[language][lvl] || WORDS['en'][lvl]; // Fallback
        const used = gameData.usedWords?.[lvl] || [];

        // Filter out used words
        const available = pool.filter(w => !used.includes(w));

        let chosen;
        if (available.length === 0) {
            // If all used, reset pool for this level (or keep infinite loop with repeats now)
            // For now, let's reset used words to allow playing again, but maybe keep last few?
            // Simple approach: Pick random from full pool if depleted
            chosen = pool[Math.floor(Math.random() * pool.length)];
            // Reset used for this level in background? No, just play.
        } else {
            chosen = available[Math.floor(Math.random() * available.length)];
        }
        return chosen;
    };

    const startNewRound = (targetLevel) => {
        const lvl = targetLevel || level;
        const word = selectWordForLevel(lvl);
        setSolution(word);
        setGuesses(Array(6).fill(null));

        // Reset interactive state
        const len = LEVELS[lvl].length;
        setCurrentGuess(Array(len).fill(""));
        setFocusedIndex(0);

        setGameOver(false);
        setWon(false);

        setTimeout(() => inputRef.current?.focus(), 100);
    };

    // Load initial level or restore
    useEffect(() => {
        if (gameData.currentLevel && gameData.currentLevel !== level) {
            setLevel(gameData.currentLevel);
        } else {
            // Start round for Level 1 if not set
            startNewRound(1);
        }
    }, []);

    // Effect for changing level or language
    useEffect(() => {
        startNewRound(level);
    }, [level, language]);


    const handleKeyDown = (e) => {
        if (gameOver || showHelp) return;
        const len = LEVELS[level].length;
        const key = e.key.toUpperCase();

        if (key === "ENTER") {
            handleSubmit();
            return;
        }

        if (key === "BACKSPACE") {
            const newGuess = [...currentGuess];
            // If current focused cell is not empty, clear it.
            // If it IS empty, move back and clear that one.
            if (newGuess[focusedIndex] !== "") {
                newGuess[focusedIndex] = "";
                setCurrentGuess(newGuess);
            } else {
                // Move back and clear
                const prevIndex = Math.max(0, focusedIndex - 1);
                newGuess[prevIndex] = "";
                setFocusedIndex(prevIndex);
                setCurrentGuess(newGuess);
            }
            return;
        }

        if (key === "ARROWLEFT") {
            setFocusedIndex(Math.max(0, focusedIndex - 1));
            return;
        }
        if (key === "ARROWRIGHT") {
            setFocusedIndex(Math.min(len - 1, focusedIndex + 1));
            return;
        }
    };

    const handleInputChange = (e) => {
        if (gameOver || showHelp) return;
        const val = e.target.value;
        if (!val) return;
        const key = val.slice(-1).toUpperCase();

        if (/^[A-ZÑ]$/.test(key)) {
            const newGuess = [...currentGuess];
            newGuess[focusedIndex] = key;
            setCurrentGuess(newGuess);

            // Advance cursor if not at end
            if (focusedIndex < LEVELS[level].length - 1) {
                setFocusedIndex(focusedIndex + 1);
            }
        }
    };

    const handleSubmit = () => {
        if (gameOver) return;

        const guessString = currentGuess.join("");
        const len = LEVELS[level].length;

        if (guessString.length !== len || currentGuess.includes("")) {
            // Shake if incomplete
            setShakeRow(guesses.findIndex(val => val === null));
            setTimeout(() => setShakeRow(-1), 500);
            return;
        }

        const newGuesses = [...guesses];
        const firstEmptyIndex = newGuesses.findIndex(val => val === null);
        newGuesses[firstEmptyIndex] = guessString;
        setGuesses(newGuesses);

        // Reset for next row
        setCurrentGuess(Array(len).fill(""));
        setFocusedIndex(0);

        if (guessString === solution) {
            handleVictory();
        } else if (firstEmptyIndex === 5) {
            setGameOver(true);
        }
    };

    const markWordAsUsed = (word) => {
        const used = gameData.usedWords || {};
        const levelUsed = used[level] || [];
        // Add if not exists
        if (!levelUsed.includes(word)) {
            const newUsed = { ...used, [level]: [...levelUsed, word] };
            saveGameProgress('wordle', { usedWords: newUsed });
        }
    };

    const handleVictory = () => {
        setWon(true);
        setGameOver(true);
        markWordAsUsed(solution);

        const config = LEVELS[level];
        const isLooping = currentLevelData.loops > 0;

        // Base points
        let pts = isLooping ? Math.floor(config.points * 0.5) : config.points;

        // Check for Level Completion (7th win)
        let newWins = levelWins + 1;
        let newLoops = currentLevelData.loops;

        if (newWins >= WINS_TO_LEVEL_UP) {
            pts += isLooping ? Math.floor(config.bonus * 0.5) : config.bonus;
            newWins = 0; // Reset bar
            newLoops += 1; // Increase Prestige

            // Unlock next level if not max
            if (level < 7) {
                const nextLvl = level + 1;
                const nextData = progress[nextLvl] || { wins: 0, loops: 0 };
                saveGameProgress('wordle', {
                    levels: {
                        ...progress,
                        [level]: { ...currentLevelData, wins: newWins, loops: newLoops },
                        [nextLvl]: { ...nextData, unlocked: true }
                    }
                });
            } else {
                // Max level just loop
                saveGameProgress('wordle', {
                    levels: {
                        ...progress,
                        [level]: { ...currentLevelData, wins: newWins, loops: newLoops }
                    }
                });
            }
        } else {
            // Just update wins
            saveGameProgress('wordle', {
                levels: {
                    ...progress,
                    [level]: { ...currentLevelData, wins: newWins }
                }
            });
        }

        addGlobalXP(pts);
        onWinGame(pts);

        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ['#06b6d4', '#d946ef'] });
    };

    const handleNextLevel = () => {
        const next = level + 1;
        if (next <= 7 && (progress[next]?.unlocked)) {
            setLevel(next);
            saveGameProgress('wordle', { currentLevel: next });
        }
    };

    const handleRetry = () => {
        startNewRound(level);
    };

    const selectLevel = (lvl) => {
        if (progress[lvl]?.unlocked || lvl === 1) {
            setLevel(lvl);
            saveGameProgress('wordle', { currentLevel: lvl });
        }
    };


    const getBgColor = (letter, index, rowWord) => {
        if (!rowWord) return "bg-slate-900/50 border-cyan-900/30";
        if (solution[index] === letter) return "bg-emerald-500 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]";
        if (solution.includes(letter)) return "bg-amber-500 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]";
        return "bg-slate-700 border-slate-600";
    };

    const gridColsClass = `grid-cols-${LEVELS[level].length}`;

    return (
        <div
            onClick={() => { if (!gameOver && !showHelp) inputRef.current?.focus(); }}
            className="flex flex-col items-center w-full max-w-md p-4 relative min-h-[600px]"
        >

            {/* HEADER SIMILAR TO MEMORY GAME */}
            <div className="w-full bg-slate-900/40 border border-white/5 rounded-2xl p-3 mb-4 backdrop-blur-sm shadow-md">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-fuchsia-950 border border-fuchsia-500/30 text-[10px] font-bold text-fuchsia-400 uppercase tracking-wider">
                            {t.menu.title} {level}
                        </span>
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">{t.wordle.levels[level] || `Level ${level}`}</span>
                    </div>
                    {currentLevelData.loops > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-950/30 border border-yellow-500/20 animate-pulse">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-[10px] font-bold text-yellow-500 tracking-wider">Rank {currentLevelData.loops}</span>
                        </div>
                    )}
                    <button onClick={() => setShowHelp(true)} className="p-1.5 bg-slate-800 rounded-full hover:bg-slate-700 text-fuchsia-400 border border-fuchsia-500/30 ml-auto">
                        <HelpCircle className="w-4 h-4" />
                    </button>
                </div>

                {/* PROGRESS BAR 7 STEPS */}
                <div className="flex justify-between items-center gap-1.5 p-0.5 bg-slate-950/30 rounded-full">
                    {[...Array(7)].map((_, i) => {
                        const active = i < levelWins;
                        const current = i === levelWins;
                        return (
                            <div key={i} className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden relative border border-slate-700/50">
                                {active && <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-purple-500 shadow-[0_0_6px_rgba(217,70,239,0.6)]"></div>}
                                {current && <div className="absolute inset-0 bg-slate-600/50 animate-pulse"></div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* LEVEL SELECTOR (Available on top or separate screen? user asked for same system. Memory has modal. Let's make a mini bar here for quick switch if unlocked) */}
            <div className="flex items-center justify-center gap-2 mb-6 w-full flex-wrap max-w-full p-2 bg-slate-900/30 rounded-xl border border-slate-800/50">
                {[1, 2, 3, 4, 5, 6, 7].map((lvl) => {
                    const isUnlocked = progress[lvl]?.unlocked || lvl === 1;
                    const isCurrent = level === lvl;
                    return (
                        <button
                            key={lvl}
                            onClick={() => selectLevel(lvl)}
                            disabled={!isUnlocked}
                            className={`
                                w-6 h-6 rounded flex items-center justify-center text-[10px] font-black transition-all border relative
                                ${isCurrent
                                    ? "bg-fuchsia-500 border-fuchsia-400 text-slate-950 scale-110 shadow-lg z-10"
                                    : isUnlocked
                                        ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-fuchsia-500/50 hover:text-white"
                                        : "bg-slate-900/50 border-slate-800 text-slate-700 cursor-not-allowed opacity-50"
                                }
                            `}
                        >
                            {isUnlocked ? lvl : <Lock className="w-2.5 h-2.5 opacity-70" />}
                        </button>
                    )
                })}
            </div>

            {/* GAME GRID */}
            <div className={`grid ${gridColsClass} gap-2 mb-6 w-full max-w-[340px]`}>
                {guesses.map((guess, idx) => {
                    const isCurrentRow = guesses.findIndex(val => val === null) === idx;
                    // If isCurrentRow, show inputs. If previous row, show string from guess.
                    // Actually, keep unified rendering.
                    const isError = shakeRow === idx;

                    return (
                        <motion.div
                            key={idx}
                            animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}}
                            className={`grid ${gridColsClass} gap-2 col-span-full`}
                        >
                            {Array.from({ length: LEVELS[level].length }).map((_, j) => {
                                let charToShow = "";
                                if (isCurrentRow) {
                                    // Safe access
                                    charToShow = currentGuess ? currentGuess[j] : "";
                                } else {
                                    // if guess is filled string
                                    charToShow = guess ? guess[j] : "";
                                }

                                const isFocused = isCurrentRow && (focusedIndex === j);

                                return (
                                    <div
                                        key={j}
                                        onClick={(e) => {
                                            if (isCurrentRow && !gameOver) {
                                                e.stopPropagation(); // Avoid double focus call
                                                setFocusedIndex(j);
                                                // Wait nicely for UI feedback then focus
                                                setTimeout(() => inputRef.current?.focus(), 50);
                                            }
                                        }}
                                        className={`
                                            aspect-square border-2 rounded-lg flex items-center justify-center text-xl md:text-2xl font-black transition-all relative overflow-hidden cursor-pointer
                                            ${isCurrentRow
                                                ? (isFocused
                                                    ? "border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)] bg-slate-800/80 text-white scale-105 z-10"
                                                    : "border-fuchsia-500/30 text-slate-300 bg-slate-900/40")
                                                : getBgColor(charToShow || "", j, guess)
                                            }
                                        `}
                                    >
                                        {charToShow}
                                        {isFocused && (
                                            <div className="absolute inset-x-0 bottom-1 h-0.5 bg-fuchsia-400 animate-pulse mx-2"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </motion.div>
                    );
                })}
            </div>

            {/* HIDDEN INPUT FOR NATIVE KEYBOARD */}
            <input
                ref={inputRef}
                autoFocus
                type="text"
                value=""
                onKeyDown={handleKeyDown}
                onChange={handleInputChange}
                className="opacity-0 absolute inset-0 w-full h-full pointer-events-none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                inputMode="text"
            />

            {/* KEYBOARD REPLACEMENT: CLICKABLE AREA & CONFIRM BUTTON */}

            <div className="w-full flex flex-col gap-2 mt-auto relative z-20 pointer-events-none">
                {/* Only Confirm button remains visible (pointer-events-auto needed) */}
                <div className="pointer-events-auto">
                    <button onClick={handleSubmit}
                        className="w-full mt-2 py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-lg font-black tracking-widest hover:shadow-[0_0_20px_rgba(217,70,239,0.4)] active:scale-95 transition-all uppercase">
                        {gameOver ? (won ? t.wordle.next_mission : t.wordle.retry) : t.wordle.confirm_code}
                    </button>
                </div>

                {!gameOver && (
                    <p className="text-center text-[10px] text-slate-500 animate-pulse mt-2">
                        {language === 'es' ? 'TOCA CUALQUIER CELDA PARA EDITAR' : 'TAP ANY CELL TO EDIT'}
                    </p>
                )}
            </div>

            {/* OVERLAYS */}
            <AnimatePresence>
                {gameOver && !showHelp && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute z-40 p-6 rounded-[2rem] bg-slate-900/95 border border-white/10 text-center shadow-[0_0_50px_rgba(217,70,239,0.3)] max-w-xs top-1/2 -translate-y-1/2 left-0 right-0 mx-auto pointer-events-auto">
                        <h3 className={`text-2xl font-black mb-2 ${won ? 'text-emerald-400' : 'text-red-400'}`}>
                            {won ? ((levelWins + 1 >= WINS_TO_LEVEL_UP) && level < 7 ? t.wordle.level_complete : t.wordle.code_accepted) : t.wordle.system_failure}
                        </h3>

                        <p className="text-white mb-4">{t.wordle.key_was}: <span className="text-fuchsia-400 font-bold">{solution}</span></p>

                        {won ? (
                            <div className="space-y-2">
                                {(levelWins + 1 >= WINS_TO_LEVEL_UP) && level < 7 ? (
                                    <button onClick={handleNextLevel} className="w-full py-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform animate-pulse">
                                        <ArrowRight className="w-4 h-4" /> {t.wordle.accessing_level} {level + 1}
                                    </button>
                                ) : (
                                    <button onClick={handleRetry} className="px-6 py-2 bg-white/10 rounded-full text-sm hover:bg-white/20">{t.wordle.next_mission}</button>
                                )}
                            </div>
                        ) : (
                            <button onClick={handleRetry} className="px-6 py-2 bg-white/10 rounded-full text-sm hover:bg-white/20">{t.wordle.restart_level}</button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showHelp && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm rounded-xl p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 border border-fuchsia-500/30 p-6 rounded-2xl max-w-sm w-full shadow-[0_0_40px_rgba(217,70,239,0.2)]">
                            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-black text-fuchsia-400 uppercase tracking-wider">{t.wordle.protocol}</h3><button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button></div>
                            <p className="text-sm text-slate-300 mb-4">{t.wordle.decrypt_words} {LEVELS[level].length} {t.wordle.letters}.</p>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center font-bold text-white border border-emerald-400">A</div><p className="text-xs text-slate-300">{t.wordle.correct_position}</p></div>
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center font-bold text-white border border-amber-400">B</div><p className="text-xs text-slate-300">{t.wordle.correct_letter}</p></div>
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center font-bold text-slate-400 border border-slate-600">C</div><p className="text-xs text-slate-300">{t.wordle.not_exists}</p></div>
                            </div>
                            <button onClick={() => setShowHelp(false)} className="w-full mt-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold">{t.wordle.understood}</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
