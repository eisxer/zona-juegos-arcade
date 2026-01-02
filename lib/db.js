import { join } from 'path';
import { promises as fs } from 'fs';

const dataDir = join(process.cwd(), 'data');
const dbPath = join(dataDir, 'db.json');

// Ensure data directory and db file exist
async function ensureDb() {
    try {
        await fs.mkdir(dataDir, { recursive: true });
        try {
            await fs.access(dbPath);
        } catch {
            await fs.writeFile(dbPath, JSON.stringify({ users: {} }, null, 2));
        }
    } catch (error) {
        console.error("DB Init Error:", error);
    }
}

export async function getDb() {
    await ensureDb();
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
}

export async function saveDb(data) {
    await ensureDb();
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}
