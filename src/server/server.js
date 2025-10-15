// server.js
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
const rooms = {};

console.log("シグナリングサーバーがポート8080で起動しました");

wss.on('connection', ws => {
  let roomId = null;

  ws.on('message', message => {
    const data = JSON.parse(message);

    if (data.type === 'join') {
      roomId = data.roomId;
      if (!rooms[roomId]) {
        rooms[roomId] = new Set();
      }
      rooms[roomId].add(ws);
      console.log(`クライアントがルーム[${roomId}]に参加しました`);
    } else if (roomId && rooms[roomId]) {
      // 受け取ったメッセージを同じルームの他のクライアントに転送
      rooms[roomId].forEach(client => {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(message.toString());
        }
      });
    }
  });

  ws.on('close', () => {
    if (roomId && rooms[roomId]) {
      rooms[roomId].delete(ws);
      if (rooms[roomId].size === 0) {
        delete rooms[roomId];
      }
      console.log(`クライアントがルーム[${roomId}]から退出しました`);
    }
  });
});