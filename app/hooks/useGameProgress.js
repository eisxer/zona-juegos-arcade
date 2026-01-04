"use client";
import { useState, useEffect } from "react";

const STORAGE_KEY = 'arcade_nexus_profile';

export default function useGameProgress() {
    const [profile, setProfile] = useState({
        globalXP: 0,
        globalLevel: 1,
        games: {}
    });

    // Cargar al inicio
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setProfile(JSON.parse(stored));
    }, []);

    // Guardar cambios
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }, [profile]);

    // Acción 1: Sumar XP Global (Desde cualquier juego)
    const addGlobalXP = (amount) => {
        setProfile(prev => {
            const newXP = prev.globalXP + amount;
            const newLevel = Math.floor(newXP / 1000) + 1; // Cada 1000 XP = 1 Nivel
            return { ...prev, globalXP: newXP, globalLevel: newLevel };
        });
    };

    // Acción 2: Guardar Progreso Específico (Niveles desbloqueados)
    const saveGameProgress = (gameId, data) => {
        setProfile(prev => ({
            ...prev,
            games: {
                ...prev.games,
                [gameId]: { ...(prev.games[gameId] || {}), ...data }
            }
        }));
    };

    // Acción 3: Leer datos de un juego
    const getGameData = (gameId) => profile.games[gameId] || {};

    return { profile, addGlobalXP, saveGameProgress, getGameData };
}
