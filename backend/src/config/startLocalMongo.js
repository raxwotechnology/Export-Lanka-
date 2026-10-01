import { spawn } from 'child_process';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isPortOpen(port, host = '127.0.0.1') {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('error', () => {
            resolve(false);
        });
        socket.connect(port, host);
    });
}

export async function ensureLocalMongo() {
    const mongoUri = process.env.MONGO_URI || '';
    if (!mongoUri.includes('127.0.0.1') && !mongoUri.includes('localhost')) {
        return; // Remote database (Atlas, etc.)
    }

    const port = 27017;
    const running = await isPortOpen(port);
    if (running) {
        console.log(`✓ MongoDB is already running on port ${port}`);
        return;
    }

    // Look for mongod.exe
    const possiblePaths = [
        path.resolve(__dirname, '../../mongod.exe'),
        path.resolve(process.cwd(), 'mongod.exe'),
        path.resolve(process.cwd(), 'backend/mongod.exe'),
    ];

    let mongodPath = possiblePaths.find(p => fs.existsSync(p));
    if (!mongodPath) {
        mongodPath = 'mongod';
    }

    const dataDir = path.resolve(__dirname, '../../data/db');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log(`[LocalMongo] Starting local MongoDB instance from ${mongodPath}...`);
    try {
        const child = spawn(mongodPath, ['--dbpath', dataDir, '--bind_ip', '127.0.0.1', '--port', String(port)], {
            detached: true,
            stdio: 'ignore',
        });
        child.unref();

        // Wait for port to become available
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 500));
            if (await isPortOpen(port)) {
                console.log(`✓ Local MongoDB started successfully on port ${port}`);
                return;
            }
        }
        console.warn('⚠️ [LocalMongo] Spawned MongoDB process, but port 27017 did not open in time.');
    } catch (err) {
        console.error('⚠️ [LocalMongo] Failed to spawn mongod.exe:', err.message);
    }
}

export default ensureLocalMongo;
