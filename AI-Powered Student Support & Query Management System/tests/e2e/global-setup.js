import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '../../../backend');

export default async function globalSetup() {
  execSync('php artisan migrate:fresh --seed --force', {
    cwd: backendDir,
    stdio: 'inherit',
  });
}

