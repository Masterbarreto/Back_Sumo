import { Server } from "socket.io";

let io = null;

export const initSocket = (httpServer, origin) => {
  io = new Server(httpServer, {
    cors: {
      origin: (requestOrigin, callback) => {
        // Permite conexões do frontend (Vercel, localhost, etc.)
        callback(null, true);
      },
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket conectado: ${socket.id} 🔌`);

    socket.on("join:tournament", (tournamentId) => {
      socket.join(tournamentId);
      console.log(`Socket ${socket.id} se juntou ao torneio: ${tournamentId}`);
    });

    socket.on("projection:update", ({ tournamentId, state }) => {
      socket.to(tournamentId).emit("projection:updated", state);
    });

    socket.on("disconnect", () => {
      console.log(`Socket desconectado: ${socket.id} ❌`);
    });
  });

  return io;
};

export const getIo = () => {
  return io;
};
