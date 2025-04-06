import { type ErrorContext, file } from 'elysia';

const handleError = ({ code }: Context) => {
  if (code === 'NOT_FOUND') return file('./public/404.html');
};

type Context = ErrorContext & { code: ErrorCode };
type ErrorCode =
  | number
  | 'UNKNOWN'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'PARSE'
  | 'INTERNAL_SERVER_ERROR'
  | 'INVALID_COOKIE_SIGNATURE';

export default handleError;
