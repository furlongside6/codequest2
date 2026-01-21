'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    User, Map, Play, CheckCircle2, Sword, Shield, Search,
    ShoppingCart, Layers, Loader2
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { api } from '@/lib/api';
import { getClassDisplayName, getClassColor, getDifficultyColor } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, ProgressBar } from '@/components/ui';

interface Challenge {
    _id: string;
    title: string;
    difficulty: string;
    category: string;
    requiredLevel: number;
}

interface ChallengeProgress {
    _id: string;
    challengeId: Challenge;
    status: 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';
}

export default function DashboardPage() {
    const router = useRouter();
    const { isAuthenticated, character, fetchCharacter } = useGameStore();
    const [progress, setProgress] = useState<ChallengeProgress[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        const loadData = async () => {
            try {
                await fetchCharacter();
                const { progress } = await api.getCharacterProgress();
                setProgress(progress);
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [isAuthenticated, router, fetchCharacter]);

    if (!isAuthenticated) return null;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
        );
    }

    if (!character) {
        router.push('/character-select');
        return null;
    }

    // Group challenges by category and sort by level then title (natural sort)
    const groupedChallenges = progress
        .sort((a, b) => {
            const levelA = a.challengeId?.requiredLevel || 0;
            const levelB = b.challengeId?.requiredLevel || 0;
            if (levelA !== levelB) return levelA - levelB;
            // Natural sort by title (treats numbers numerically: 1, 2, 10 instead of 1, 10, 2)
            const titleA = a.challengeId?.title || '';
            const titleB = b.challengeId?.title || '';
            return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
        })
        .reduce((acc, p) => {
            const category = p.challengeId?.category || 'UNKNOWN';
            if (!acc[category]) acc[category] = [];
            acc[category].push(p);
            return acc;
        }, {} as Record<string, ChallengeProgress[]>);

    const categoryNames: Record<string, string> = {
        SYNTAX: 'Syntax Valley',
        LOGIC: 'Logic Labyrinth',
        ALGORITHMS: 'Algorithm Abyss',
        DATA_STRUCTURES: 'Data Structure Dungeon',
        DATABASES: 'Database Depths',
    };

    return (
        <>
            <Navbar />
            <div className="container mx-auto px-6 pt-24 pb-20">
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Profile Summary Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <Card>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`
                    w-16 h-16 bg-primary/20 border border-primary rounded-xl 
                    flex items-center justify-center text-primary
                  `}>
                                        <User size={32} />
                                    </div>
                                    <div>
                                        <h3 className="font-black italic uppercase text-xl">{character.name}</h3>
                                        <p className={`text-xs font-bold uppercase tracking-widest ${getClassColor(character.class)}`}>
                                            {getClassDisplayName(character.class)}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 text-sm">
                                    <ProgressBar
                                        value={character.xp}
                                        max={character.maxXp}
                                        color="primary"
                                        showLabel
                                        label={`Level ${character.level}`}
                                    />

                                    <div className="flex justify-between items-center py-3 border-t border-white/5 mt-4">
                                        <span className="flex items-center gap-2 text-yellow-400 font-bold italic">
                                            <ShoppingCart size={16} /> Credit
                                        </span>
                                        <span className="font-mono text-xl">
                                            {character.gold} <span className="text-xs text-slate-500">CQ</span>
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <Card>
                                <h4 className="font-black italic uppercase mb-4 text-sm flex items-center gap-2">
                                    <Layers size={16} className="text-secondary" /> Neural Skills
                                </h4>
                                <div className="space-y-3">
                                    {Object.entries(character.skills).map(([skill, val]) => (
                                        <div key={skill}>
                                            <div className="flex justify-between text-[10px] uppercase font-bold mb-1 tracking-widest">
                                                <span>{skill}</span>
                                                <span>{val}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-white/5 rounded-full">
                                                <div
                                                    className="h-full bg-secondary rounded-full transition-all"
                                                    style={{ width: `${val}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>

                        {/* Stats */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card>
                                <h4 className="font-black italic uppercase mb-4 text-sm">Statistics</h4>
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="bg-white/5 rounded-lg p-3">
                                        <div className="text-2xl font-mono font-bold text-primary">
                                            {progress.filter(p => p.status === 'COMPLETED').length}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Completed</div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3">
                                        <div className="text-2xl font-mono font-bold text-yellow-400">
                                            {progress.filter(p => p.status === 'UNLOCKED' || p.status === 'IN_PROGRESS').length}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Available</div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Quest Network */}
                    <div className="lg:col-span-8">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-black italic uppercase flex items-center gap-3">
                                <Map className="text-primary" /> Quest <span className="text-primary">Network</span>
                            </h2>
                            <div className="flex gap-2">
                                <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">
                                    <Search size={18} />
                                </button>
                            </div>
                        </div>

                        {Object.entries(groupedChallenges).map(([category, challenges], catIndex) => (
                            <motion.div
                                key={category}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: catIndex * 0.1 }}
                                className="mb-8"
                            >
                                <h3 className="text-lg font-black italic uppercase mb-4 text-slate-400">
                                    {categoryNames[category] || category}
                                </h3>
                                <div className="grid gap-4">
                                    {challenges.map((p) => {
                                        const challenge = p.challengeId;
                                        if (!challenge) return null;

                                        const isUnlocked = p.status !== 'LOCKED';
                                        const isCompleted = p.status === 'COMPLETED';

                                        return (
                                            <div
                                                key={p._id}
                                                className={`
                          p-6 rounded-2xl border transition-all flex items-center justify-between group
                          ${isUnlocked
                                                        ? 'bg-dark-100 border-white/10 cursor-pointer hover:border-primary/50'
                                                        : 'bg-black/40 border-white/5 opacity-50 grayscale cursor-not-allowed'}
                        `}
                                                onClick={() => isUnlocked && router.push(`/battle/${challenge._id}`)}
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className={`
                            w-12 h-12 rounded-lg flex items-center justify-center
                            ${isCompleted ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white'}
                          `}>
                                                        {isCompleted ? <CheckCircle2 /> : <Sword size={24} />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black italic uppercase text-lg">{challenge.title}</h4>
                                                        <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">
                                                            Lv. {challenge.requiredLevel} •
                                                            <span className={`ml-1 ${getDifficultyColor(challenge.difficulty)}`}>
                                                                {challenge.difficulty}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>

                                                {isUnlocked ? (
                                                    <div className="flex items-center gap-4">
                                                        {isCompleted && (
                                                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded font-bold uppercase tracking-widest">
                                                                Completed
                                                            </span>
                                                        )}
                                                        <button className="w-10 h-10 bg-primary text-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            <Play size={20} fill="currentColor" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <Shield size={20} className="text-slate-700" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ))}

                        {Object.keys(groupedChallenges).length === 0 && (
                            <div className="text-center py-20 text-slate-500">
                                <Sword size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="italic">No challenges available yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
