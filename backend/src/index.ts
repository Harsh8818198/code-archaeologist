import eventsRouter from './routes/events';

// Add after other routes
app.use('/api/events', eventsRouter);
