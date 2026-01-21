import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { connectDB } from './config/database.js';
import { apiLimiter, errorHandler } from './middleware/index.js';
import routes from './routes/index.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Rate limiting
app.use('/api', apiLimiter);

// API routes
app.use('/api', routes);

// Error handler
app.use(errorHandler);

// Connect to MongoDB (for serverless, connection is cached)
let isConnected = false;

const connectOnce = async () => {
    if (!isConnected) {
        await connectDB();
        isConnected = true;
    }
};

// For serverless: connect on each request
app.use(async (_req, _res, next) => {
    await connectOnce();
    next();
});

// Start server (only in development/local)
const startServer = async () => {
    try {
        await connectOnce();

        const PORT = parseInt(env.PORT);
        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   🎮 CodeQuest RPG API Server                 ║
║                                               ║
║   Environment: ${env.NODE_ENV.padEnd(28)}║
║   Port: ${PORT.toString().padEnd(36)}║
║   Frontend: ${env.FRONTEND_URL.padEnd(32)}║
║                                               ║
╚═══════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Only start server if not in serverless environment
if (process.env.VERCEL !== '1') {
    startServer();
}

// Export for Vercel serverless
export default app;
