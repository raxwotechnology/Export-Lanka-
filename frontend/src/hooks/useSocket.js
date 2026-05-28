import { useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

let socket;

export const useSocket = () => {
    const { user } = useAuthStore();

    useEffect(() => {
        if (user && !socket) {
            // Strip /api from VITE_API_URL to get the base socket server URL
            const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');

            socket = io(baseUrl, {
                auth: { userId: user._id },
                transports: ['websocket', 'polling'],
            });

            socket.on('connect', () => {
                console.log('⚡ Connected to socket server');
                socket.emit('join_room', user._id);
            });

            socket.on('connect_error', (err) => {
                console.warn('⚡ Socket connection error:', err.message);
            });

            socket.on('new_notification', (notification) => {
                toast(notification.message, {
                    icon: '🔔',
                    duration: 5000,
                });
            });

            socket.on('disconnect', () => {
                console.log('⚡ Disconnected from socket server');
            });
        }

        return () => {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        };
    }, [user]);

    const emitEvent = useCallback((event, data) => {
        if (socket) {
            socket.emit(event, data);
        }
    }, []);

    return { socket, emitEvent };
};
