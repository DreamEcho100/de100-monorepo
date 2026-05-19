import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.deploy.local' });

const url = process.env.APP_LMS_UPSTASH_REDIS_URL;
const token = process.env.APP_LMS_UPSTASH_REDIS_TOKEN;

if (!url || !token) {
  console.error('Failure: APP_LMS_UPSTASH_REDIS_URL or APP_LMS_UPSTASH_REDIS_TOKEN is missing in .env.deploy.local');
  process.exit(1);
}

try {
  const redis = new Redis({
    url: url,
    token: token,
  });

  const result = await redis.ping();
  if (result === 'PONG') {
    console.log('Success: Redis PING successful');
    process.exit(0);
  } else {
    console.error('Failure: Unexpected Redis PING response:', result);
    process.exit(1);
  }
} catch (error) {
  console.error('Failure: Redis connection or PING failed:', error.message);
  process.exit(1);
}
