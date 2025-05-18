import { type ErrorContext, file, ErrorHandler } from 'elysia';

const handleError = ({ code }: Context) => {
  if (code === 'NOT_FOUND') return file('./public/404.html');
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
