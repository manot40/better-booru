import type { Setup } from 'index';

export const handler = {
  async open(ws) {
    const interval = setInterval(() => {
      ws.send(Date.now());
    }, 1000);
  },
  async message(ws, msg) {
    ws.send(msg);
  },
  async close(ws, code, reason) {
    ws.send('Goodbye!');
  },
} satisfies ElysiaWS;

type ElysiaWS = Parameters<Setup['ws']>[1];
