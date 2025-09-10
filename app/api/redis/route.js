import { createClient } from 'redis';
import { NextResponse } from 'next/server';

const redis = createClient({
  url: process.env.REDIS_URL
});

export const POST = async () => {
  await redis.connect();
  const result = await redis.get("item");
  await redis.disconnect();
  
  return NextResponse.json({ result });
};