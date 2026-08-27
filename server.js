import app from './src/app.js';
import env from './src/config/env.js';

const PORT = env.port;

app.listen(PORT, () => {
  console.log(`FBCS Reunion API running on http://localhost:${PORT}`);
  console.log(`Environment: ${env.nodeEnv}`);
});
