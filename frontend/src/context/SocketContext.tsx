import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

const rawSocketUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim();
const normalizeSocketUrl = (url?: string): string => {
  if (!url) {
    return import.meta.env.DEV ? '' : 'http://localhost:3000';
  }
  return url.replace(/\/+$/, '').replace(/\/api(\/v\d+)?$/, '');
};

const SOCKET_BASE_URL = normalizeSocketUrl(rawSocketUrl);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketEndpoint = SOCKET_BASE_URL ? `${SOCKET_BASE_URL}/chat` : '/chat';
    const newSocket = io(socketEndpoint, {
      auth: {
        token: `Bearer ${token}`,
      },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
