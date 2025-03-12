import type { FetchError } from 'ofetch';

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('error', async (e, { event }) => {
    if (!event || !('data' in e)) return;

    const error = e as FetchError;
    if (error.statusCode !== 403 || typeof error.data != 'string') return;
    if (error.data.toLowerCase().includes('just a moment...')) {
      sendError(
        event,
        createError({
          status: 503,
          statusMessage: "Data couldn't be fetched. Upstream source currently under protection mode.",
        })
      );
      event.node.res.setHeader = () => event.node.res;
      return;
    }
  });
});
