import { getDb, saveDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { userId, scoreDelta } = await request.json();
        const db = await getDb();

        if (!db.users[userId]) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        db.users[userId].total_score += scoreDelta;
        db.users[userId].last_played_at = new Date().toISOString();

        await saveDb(db);

        return NextResponse.json(db.users[userId]);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update score' }, { status: 500 });
    }
}
