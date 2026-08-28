import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { corsOptions } from './middleware/corsOptions.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import adminRoutes from './routes/adminRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import { bootstrapAdminFromEnv } from './services/adminBootstrapService.js';

const app = express();

app.use(cors(corsOptions));
app.use(express.json({ limit: '8mb' }));

app.use('/api', healthRoutes);
app.use('/api', studentRoutes);
app.use('/api', enquiryRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  await connectDatabase();
  await bootstrapAdminFromEnv();
  app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
};

startServer().catch((error) => {
  console.error('Unable to start server:', error);
  process.exit(1);
});
