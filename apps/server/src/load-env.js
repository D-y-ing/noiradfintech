import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Workspace scripts run from apps/server; the app's environment lives at repo root.
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env') });
