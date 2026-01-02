import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const db = await getDb();
        const users = Object.values(db.users);

        // Sort by score DESC
        const ranking = users
            .sort((a, b) => b.total_score - a.total_score)
            .slice(0, 20) // Top 20
            .map((user, index) => ({
                ...user,
                rank: index + 1
            }));

        return NextResponse.json(ranking);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
