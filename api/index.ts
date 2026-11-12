// Vercel serverless entry: the same Express app as `npm start`, without the static files (Vercel serves dist/).
// Migrations are not run here; run `npm run migrate` (or `supabase db push`) once per release.
import { createApp } from '../server/app';

export default createApp();
