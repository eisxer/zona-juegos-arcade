import { getDb, saveDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { id, display_name, avatar_emoji } = await request.json();
        const db = await getDb();

        if (!db.users[id]) {
            // New User
            db.users[id] = {
                id,
                display_name,
                avatar_emoji,
                total_score: 0,
                created_at: new Date().toISOString(),
                last_played_at: new Date().toISOString()
            };
        } else {
            // Update existing (optional, if we want to allow editing profile)
            db.users[id].display_name = display_name;
            db.users[id].avatar_emoji = avatar_emoji;
        }

        await saveDb(db);

        return NextResponse.json(db.users[id]);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create/update user' }, { status: 500 });
    }
}

export async function GET(request) {
    // Helper to get single user if needed
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const db = await getDb();
    const user = db.users[id];

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json(user);
}
