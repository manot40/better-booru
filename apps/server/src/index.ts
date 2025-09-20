import { app, type Backend } from './server';

app.listen({
  port: Bun.env.PORT || 3000,
  hostname: Bun.env.HOST,
  reusePort: true,
  idleTimeout: 60,
});

export { Backend };
