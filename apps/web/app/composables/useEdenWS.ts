import type { Treaty } from '@elysiajs/eden/treaty2';
import type { InputSchema } from 'elysia';

export const useEdenWS = <T extends InputSchema<any>>(fn: () => EdenWS<T>) => {
  type MessageEvent = Treaty.WSEvent<'message', T['response']>;

  const open = ref(false);
  const data = ref<T['response']>();
  const error = shallowRef<Event>();
  const rawMessage = shallowRef<MessageEvent>();

  function onMessage(message: MessageEvent) {
    console.log((data.value = message.data));
    error.value = undefined;
    rawMessage.value = message;
  }

  function onError(err: Event) {
    error.value = err;
  }

  onMounted(() => {
    const ws = fn();

    ws.on('message', onMessage);
    ws.on('error', onError);
    ws.on('open', (e) => (open.value = true), { once: true });

    onUnmounted(() => {
      ws.removeEventListener('error', onError);
      ws.removeEventListener('message', <any>onMessage);
      ws.close();
    });
  });

  return { open, data, error, rawMessage };
};

interface EdenWS<in out Schema extends InputSchema<any> = {}> {
  url: string;
  ws: WebSocket;
  send(data: Schema['body'] | Schema['body'][]): this;
  on<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (event: Treaty.WSEvent<K, Schema['response']>) => void,
    options?: boolean | AddEventListenerOptions
  ): this;
  off<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): this;
  subscribe(
    onMessage: (event: Treaty.WSEvent<'message', Schema['response']>) => void,
    options?: boolean | AddEventListenerOptions
  ): this;
  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (event: Treaty.WSEvent<K, Schema['response']>) => void,
    options?: boolean | AddEventListenerOptions
  ): this;
  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): this;
  close(): this;
}
