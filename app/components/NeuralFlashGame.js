"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Zap, Heart, Clock, Trophy, ScanLine } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// --- CONSTANTS & CONFIG ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SPAWN_RATE = 1000;
const TARGET_LIFETIME = 3000;
const SHAPES = ["circle", "square", "triangle", "hexagon"];
const COLORS = [
    { name: "blue", hex: "#00f0ff", glow: "rgba(0, 240, 255, 0.6)" },
    { name: "red", hex: "#ff2a6d", glow: "rgba(255, 42, 109, 0.6)" },
    { name: "green", hex: "#05ffa1", glow: "rgba(5, 255, 161, 0.6)" },
    { name: "purple", hex: "#b967ff", glow: "rgba(185, 103, 255, 0.6)" }
];

// Difficulty Levels
const LEVELS = [
    { id: 1, name: "Motor Cortex", spawnRateMod: 1.0, complexity: 1 },
    { id: 2, name: "Visual Cortex", spawnRateMod: 0.8, complexity: 2 },
    { id: 3, name: "Prefrontal", spawnRateMod: 0.6, complexity: 3 }
];

export default function NeuralFlashGame({ onWinGame }) {
    const { t } = useLanguage();
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const startTimeRef = useRef();

    // Game State
    const [gameState, setGameState] = useState("IDLE");
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [timeLeft, setTimeLeft] = useState(60);
    const [instruction, setInstruction] = useState(null);
    const [lastReactionTime, setLastReactionTime] = useState(null);

    // Objects
    const targets = useRef([]);
    const particles = useRef([]);

    // --- LOGIC ---

    const spawnTarget = useCallback(() => {
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const size = 35; // Fixed size for cleaner look
        // Keep within bounds padding
        const padding = 60;
        const x = Math.random() * (CANVAS_WIDTH - padding * 2) + padding;
        const y = Math.random() * (CANVAS_HEIGHT - padding * 2) + padding;

        targets.current.push({
            id: performance.now(),
            x, y,
            size,
            shape,
            color,
            createdAt: performance.now(),
            lifeTime: TARGET_LIFETIME * (LEVELS[level - 1].spawnRateMod),
            scale: 0,
            rotation: Math.random() * Math.PI * 2
        });
    }, [level]);

    const updateInstruction = useCallback(() => {
        const type = Math.random() > 0.5 ? "color" : "shape";
        let newInstruction = {};

        if (level === 1) {
            const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
            newInstruction = { type: "color", value: targetColor.name, label: targetColor.name.toUpperCase(), negative: false, colorHex: targetColor.hex };
        } else if (level === 2) {
            if (Math.random() > 0.5) {
                const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                newInstruction = { type: "color", value: targetColor.name, label: targetColor.name.toUpperCase(), negative: false, colorHex: targetColor.hex };
            } else {
                const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                newInstruction = { type: "shape", value: targetShape, label: targetShape.toUpperCase(), negative: false };
            }
        } else {
            const isNegative = Math.random() > 0.7;
            if (Math.random() > 0.5) {
                const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                newInstruction = {
                    type: "color",
                    value: targetColor.name,
                    label: isNegative ? `NO ${targetColor.name.toUpperCase()}` : targetColor.name.toUpperCase(),
                    negative: isNegative,
                    colorHex: targetColor.hex
                };
            } else {
                const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                newInstruction = {
                    type: "shape",
                    value: targetShape,
                    label: isNegative ? `NO ${targetShape.toUpperCase()}` : targetShape.toUpperCase(),
                    negative: isNegative
                };
            }
        }
        setInstruction(newInstruction);
    }, [level]);

    // Draw Helper
    const drawPolygon = (ctx, x, y, radius, sides, rotation, color, fill = false) => {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = rotation + (i * 2 * Math.PI) / sides;
            ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
        }
        ctx.closePath();

        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();

        if (fill) {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        ctx.shadowBlur = 0;
    };

    const drawGrid = (ctx) => {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.1)";
        ctx.lineWidth = 1;
        const gridSize = 50;

        // Vertical lines
        for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_HEIGHT);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_WIDTH, y);
            ctx.stroke();
        }

        // Center reticle
        ctx.strokeStyle = "rgba(6, 182, 212, 0.3)";
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 100, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH / 2 - 20, CANVAS_HEIGHT / 2);
        ctx.lineTo(CANVAS_WIDTH / 2 + 20, CANVAS_HEIGHT / 2);
        ctx.moveTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        ctx.stroke();
    };

    // Main Loop
    const animate = useCallback((time) => {
        if (gameState !== "PLAYING") return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        drawGrid(ctx);

        const now = performance.now();

        // Targets
        targets.current.forEach((t, i) => {
            if (now - t.createdAt > t.lifeTime) {
                targets.current.splice(i, 1);
                return;
            }

            if (t.scale < 1) t.scale += 0.05;
            t.rotation += 0.01;

            const size = t.size * t.scale;

            if (t.shape === "circle") {
                ctx.beginPath();
                ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
                ctx.strokeStyle = t.color.hex;
                ctx.lineWidth = 3;
                ctx.shadowBlur = 15;
                ctx.shadowColor = t.color.hex;
                ctx.stroke();
                ctx.fillStyle = t.color.hex;
                ctx.globalAlpha = 0.2;
                ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;
            } else if (t.shape === "square") {
                drawPolygon(ctx, t.x, t.y, size, 4, t.rotation + Math.PI / 4, t.color.hex, true);
            } else if (t.shape === "triangle") {
                drawPolygon(ctx, t.x, t.y, size, 3, t.rotation, t.color.hex, true);
            } else if (t.shape === "hexagon") {
                drawPolygon(ctx, t.x, t.y, size, 6, t.rotation, t.color.hex, true);
            }
        });

        // Particles
        particles.current.forEach((p, i) => {
            p.life--;
            p.x += p.vx;
            p.y += p.vy;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 25;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            if (p.life <= 0) particles.current.splice(i, 1);
        });

        requestRef.current = requestAnimationFrame(animate);
    }, [gameState]);

    useEffect(() => {
        if (gameState !== "PLAYING") return;
        const interval = setInterval(spawnTarget, SPAWN_RATE / LEVELS[level - 1].spawnRateMod);
        return () => clearInterval(interval);
    }, [gameState, level, spawnTarget]);

    useEffect(() => {
        if (gameState !== "PLAYING") return;
        updateInstruction();
        const interval = setInterval(updateInstruction, 5000);
        return () => clearInterval(interval);
    }, [gameState, updateInstruction, level]);

    useEffect(() => {
        if (gameState !== "PLAYING") return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    endGame("TIME_UP");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    const startGame = () => {
        setGameState("PLAYING");
        setScore(0);
        setLives(3);
        setTimeLeft(60);
        targets.current = [];
        particles.current = [];
        updateInstruction();
    };

    const endGame = (reason) => {
        setGameState("GAME_OVER");
        if (score > 0 && onWinGame) {
            onWinGame(score);
        }
    };

    const createExplosion = (x, y, color) => {
        for (let i = 0; i < 15; i++) {
            particles.current.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 25,
                color: color,
                size: Math.random() * 4
            });
        }
    };

    const handleCanvasClick = (e) => {
        if (gameState !== "PLAYING") return;

        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        let hit = false;
        for (let i = targets.current.length - 1; i >= 0; i--) {
            const t = targets.current[i];
            const dist = Math.sqrt((clickX - t.x) ** 2 + (clickY - t.y) ** 2);

            if (dist < t.size * 1.5) { // Hitbox forgiving
                const matches = checkCondition(t, instruction);
                if (matches) {
                    handleHit(t, i);
                } else {
                    handleMiss(t.x, t.y);
                }
                hit = true;
                break;
            }
        }
    };

    const checkCondition = (target, instr) => {
        if (!instr) return false;
        let isMatch = false;
        if (instr.type === "color") isMatch = target.color.name === instr.value;
        if (instr.type === "shape") isMatch = target.shape === instr.value;
        return instr.negative ? !isMatch : isMatch;
    };

    const handleHit = (target, index) => {
        const reactionTime = performance.now() - target.createdAt;
        setLastReactionTime(reactionTime);
        targets.current.splice(index, 1);
        createExplosion(target.x, target.y, target.color.hex);
        setScore(prev => prev + 10 * level);
    };

    const handleMiss = (x, y) => {
        createExplosion(x, y, "#ffffff");
        setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) endGame("GAME_OVER_LIVES");
            return newLives;
        });
        setScore(prev => Math.max(0, prev - 50));
    };

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-8 font-mono px-4">

            {/* --- HUD HEADER --- */}
            <div className="w-full flex justify-between items-end">
                {/* Score Panel */}
                <div className="flex flex-col gap-1 w-64">
                    <div className="flex justify-between text-cyan-400 text-xs tracking-[0.2em] font-bold">
                        <span className="flex items-center gap-2"><Trophy className="w-4 h-4" /> PUNTAJE</span>
                        <span>{score}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(score / 20, 100)}%` }}
                            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                        ></motion.div>
                    </div>
                </div>

                {/* Main Instruction */}
                <AnimatePresence mode="wait">
                    {gameState === "PLAYING" && instruction ? (
                        <motion.div
                            key={instruction.label}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 10, opacity: 0 }}
                            className={`relative px-10 py-3 rounded-xl border-2 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)] ${instruction.negative ? 'border-red-500/50 bg-red-950/40 text-red-100' : 'border-cyan-500/50 bg-cyan-950/40 text-cyan-100'}`}
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-1 bg-current opacity-50 rounded-full"></div>
                            <div className="text-2xl md:text-3xl font-black italic tracking-widest text-center min-w-[300px] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                {instruction.label}
                            </div>
                            <div className="absolute bottom-0 right-0 w-2 h-2 bg-current animate-ping"></div>
                        </motion.div>
                    ) : (
                        <div className="text-slate-600 text-sm tracking-widest">SISTEMA EN ESPERA...</div>
                    )}
                </AnimatePresence>

                {/* Time Panel */}
                <div className="flex flex-col gap-1 w-64 items-end">
                    <div className="flex justify-between w-full text-cyan-400 text-xs tracking-[0.2em] font-bold">
                        <span>{timeLeft}s</span>
                        <span className="flex items-center gap-2">TIEMPO <Clock className="w-4 h-4" /></span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <motion.div
                            animate={{ width: `${(timeLeft / 60) * 100}%` }}
                            className={`h-full shadow-[0_0_10px_rgba(6,182,212,0.8)] ${timeLeft < 10 ? 'bg-red-500' : 'bg-cyan-500'}`}
                        ></motion.div>
                    </div>
                </div>
            </div>

            {/* --- GAME FRAME --- */}
            <div className="relative w-full aspect-[4/3] max-h-[600px] border border-cyan-500/30 bg-slate-950/50 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.1)] group">

                {/* Tech Corners (Decorative) */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-2xl"></div>
                <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-2xl"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-2xl"></div>
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-cyan-500/50 rounded-br-2xl"></div>

                {/* Side Bars */}
                <div className="absolute top-1/2 left-4 -translate-y-1/2 w-1 h-32 bg-cyan-900/50 rounded-full"></div>
                <div className="absolute top-1/2 right-4 -translate-y-1/2 w-1 h-32 bg-cyan-900/50 rounded-full"></div>

                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    onClick={handleCanvasClick}
                    className="w-full h-full cursor-crosshair relative z-10"
                />

                {/* Screens */}
                <AnimatePresence>
                    {gameState === "IDLE" && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={startGame}
                                className="relative group"
                            >
                                <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                                <div className="relative bg-black border-2 border-cyan-400 px-12 py-6 rounded-lg flex items-center gap-4">
                                    <ScanLine className="w-8 h-8 text-cyan-400" />
                                    <span className="text-3xl font-black italic text-white tracking-widest">INICIAR<span className="text-cyan-400">_</span></span>
                                </div>
                            </motion.button>
                            <div className="mt-8 flex gap-4">
                                {LEVELS.map(l => (
                                    <button
                                        key={l.id}
                                        onClick={() => setLevel(l.id)}
                                        className={`px-4 py-2 border rounded text-xs font-bold uppercase tracking-widest transition-all ${level === l.id ? 'border-cyan-400 text-cyan-400 bg-cyan-950' : 'border-slate-700 text-slate-600 hover:border-slate-500'}`}
                                    >
                                        L{l.id} {l.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {gameState === "GAME_OVER" && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md text-center">
                            <div className="text-6xl mb-4">💀</div>
                            <h2 className="text-4xl font-black text-red-500 tracking-[0.5em] mb-2 uppercase">TERMINADO</h2>
                            <p className="text-slate-400 mb-8 font-mono">Puntaje Final: {score}</p>
                            <button
                                onClick={() => setGameState("IDLE")}
                                className="px-8 py-3 border border-red-500/50 text-red-400 hover:bg-red-950/30 rounded font-bold tracking-widest uppercase transition-colors"
                            >
                                Reintentar
                            </button>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- BOTTOM HUD --- */}
            <div className="flex items-center gap-8 text-cyan-500/80">
                <div className="flex items-center gap-2 bg-slate-900 border border-cyan-900/50 px-6 py-2 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">REACCIÓN</span>
                    <span className="text-xl font-mono text-white">
                        {lastReactionTime ? `${(lastReactionTime / 1000).toFixed(3)}s` : '---'}
                    </span>
                </div>

                <div className="flex gap-2">
                    {[...Array(3)].map((_, i) => (
                        <Heart
                            key={i}
                            className={`w-6 h-6 transition-colors ${i < lives ? 'text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-slate-800 fill-slate-900'}`}
                        />
                    ))}
                </div>
            </div>

        </div>
    );
}
