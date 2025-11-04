import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import i18next from 'i18next';
import i18nextMiddleware from 'i18next-http-middleware';
import { sequelize } from './lib/sequelize';
import { registerAuthRoutes } from './routes/auth';
import { registerGroupRoutes } from './routes/groups';
import { registerAdminRoutes } from './routes/admin';
import { registerProfileRoutes } from './routes/profile';
import { startAuctionCron } from './cron/auctions';

const app = express();
app.use(cors());
app.use(express.json());

i18next.use(i18nextMiddleware.LanguageDetector).init({
    resources: {
        en: { translation: { hello: 'Hello' } },
        hi: { translation: { hello: 'नमस्ते' } }
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
});
app.use(i18nextMiddleware.handle(i18next));

const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    // Join group room when user subscribes to a group's auction
    socket.on('auction:join', (data: { group_id: string, user_id?: string }) => {
        if (data.group_id) {
            socket.join(`group:${data.group_id}`);
            console.log(`👤 User ${socket.id} joined group room: group:${data.group_id}`);
            
            if (data.user_id) {
                socket.join(`user:${data.user_id}`);
                console.log(`👤 User ${socket.id} joined user room: user:${data.user_id}`);
            }
        }
    });

    // Leave group room
    socket.on('auction:leave', (data: { group_id: string }) => {
        if (data.group_id) {
            socket.leave(`group:${data.group_id}`);
            console.log(`👤 User ${socket.id} left group room: group:${data.group_id}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
    });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

registerAuthRoutes(app, io);
registerGroupRoutes(app, io);
registerAdminRoutes(app);
registerProfileRoutes(app);

startAuctionCron(io);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

async function start() {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        server.listen(PORT, () => console.log(`Server listening on :${PORT}`));
    } catch (err) {
        console.error('Failed to start server', err);
        process.exit(1);
    }
}

start();


