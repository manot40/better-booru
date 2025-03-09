type Unwrapped<T, E> = { data: T; error?: never } | { data?: never; error: E };

/**
 * Unwraps a promise and returns the result along with any potential error.
 *
 * @template T - The type of the data returned by the promise.
 * @template E - The type of the error returned by the promise.
 */
async function unwrapPromise<T = unknown, E = unknown>(promise: Promise<T>): Promise<Unwrapped<T, E>> {
  try {
    const data = await promise;
    return { data };
  } catch (error: any) {
    return { error };
  }
}

export default unwrapPromise;
