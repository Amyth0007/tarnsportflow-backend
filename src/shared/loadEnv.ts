import path from 'path';
import dotenv from 'dotenv';

/** Load backend/.env by path so Atlas URI is used even if cwd is the repo root. */
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
  override: true,
});
