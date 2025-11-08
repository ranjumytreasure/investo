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
import { registerPaymentRoutes } from './routes/payments';
import { startAuctionCron } from './cron/auctions';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
    // Join group room when user subscribes to a group's auction
    socket.on('auction:join', (data: { group_id: string, user_id?: string }) => {
        // Join group room if group_id is provided
        if (data.group_id) {
            socket.join(`group:${data.group_id}`);
        }
        
        // Join user room if user_id is provided (can be done independently)
        if (data.user_id) {
            socket.join(`user:${data.user_id}`);
        }
    });

    // Leave group room
    socket.on('auction:leave', (data: { group_id: string }) => {
        if (data.group_id) {
            socket.leave(`group:${data.group_id}`);
        }
    });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

registerAuthRoutes(app, io);
registerGroupRoutes(app, io);
registerAdminRoutes(app);
registerProfileRoutes(app);
registerPaymentRoutes(app);

// Cron job disabled - uncomment to enable
// startAuctionCron(io);

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


