import { createApp } from './app';
import { migrate } from './db';

const port = Number(process.env.PORT || 4381);
migrate()
  .then(() => createApp().listen(port, () => console.log(`Oliskey Lab is running on port ${port}.`)))
  .catch((e) => { console.error('Could not start:', e.message); process.exit(1); });
