const fs = require('fs');
const redis = require('./redisClient');
const LOG_FILE = 'task_log.txt';
const MAX_TASKS_PER_MINUTE = 20;
const ONE_SECOND = 1000;
const ONE_MINUTE = 60000;

// Log task completion to a file
const logTask = (userId) => {
  const logEntry = `${userId} - task completed at ${Date.now()}\n`;
  fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
};

// The task function that logs the user_id and timestamp to a file
async function task(user_id) {
  logTask(user_id);
  console.log(`${user_id} - task completed at - ${Date.now()}`);
}

async function taskQueueMiddleware(req, res) {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).send({ error: 'user_id is required' });
  }

  const userKey = `tasks:${user_id}`;
  const currentTimestamp = Date.now();

  const taskCount = await redis.get(userKey) || 0;
  const lastTaskTimeKey = `lastTaskTime:${user_id}`;
  const lastTaskTime = await redis.get(lastTaskTimeKey) || 0;
  const timeSinceLastTask = currentTimestamp - lastTaskTime;

  if (taskCount >= MAX_TASKS_PER_MINUTE) {
    console.log(`User ${user_id} exceeded 20 tasks in 1 minute. Queuing task.`);
    setTimeout(() => {
      task(user_id);
      redis.incr(userKey);
      redis.set(lastTaskTimeKey, Date.now());
    }, ONE_MINUTE);
  } else {
    if (timeSinceLastTask >= ONE_SECOND) {
      task(user_id);
      await redis.incr(userKey);
      await redis.set(lastTaskTimeKey, Date.now());
    } else {
      console.log(`Task for ${user_id} is too frequent. Waiting for 1 second.`);
      setTimeout(() => {
        task(user_id);
        redis.incr(userKey);
        redis.set(lastTaskTimeKey, Date.now());
      }, ONE_SECOND - timeSinceLastTask);
    }
  }

  res.status(200).send({ message: 'Task queued or processed.' });

  setTimeout(() => {
    redis.set(userKey, 0);
  }, ONE_MINUTE);
}

module.exports = taskQueueMiddleware;
