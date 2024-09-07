const express = require('express');
const redis = require('./redisClient');
const taskQueueMiddleware = require('./taskQueueMiddleware');

const app = express();
app.use(express.json());

app.post('/process-task', taskQueueMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
