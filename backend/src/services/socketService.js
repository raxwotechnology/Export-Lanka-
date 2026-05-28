import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: function (origin, callback) {
                const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
        }
    });

    io.on('connection', (socket) => {
        console.log('⚡ New client connected:', socket.id);

        // Join user-specific room for private notifications
        socket.on('join_room', (userId) => {
            socket.join(`user:${userId}`);
            console.log(`👤 User ${userId} joined their notification room`);
        });

        socket.on('disconnect', () => {
            console.log('🔥 Client disconnected:', socket.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

// Send notification to a specific user
export const sendToUser = (userId, event, data) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};

// Broadcast to all connected clients
export const broadcast = (event, data) => {
    if (io) {
        io.emit(event, data);
    }
};
