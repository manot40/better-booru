import type { ErrorContext } from 'elysia';

const Html404 = Bun.file('./public/404.html');

const handleError = ({ code, path, redirect, request, set }: Context) => {
  const isSuspicious = request.method === 'PROPFIND' || /\/(wp-|\.)\w+/.test(path);

  if (isSuspicious) {
    return redirect('https://youtu.be/dQw4w9WgXcQ', 301);
  } else if (code === 'NOT_FOUND') {
    set.status = 404;
    set.headers['content-type'] = 'text/html';
    set.headers['content-length'] = Html404.size;
    return Html404.bytes();
  }
};

type Context = ErrorContext & { code: ErrorCode };
type ErrorCode =
  | number
  | 'PARSE'
  | 'UNKNOWN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'INVALID_FILE_TYPE'
  | 'INTERNAL_SERVER_ERROR'
  | 'INVALID_COOKIE_SIGNATURE';

export default handleError;
