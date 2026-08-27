import mongoose from 'mongoose';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Which of the three configured environments answered this request. Vercel
// sets VERCEL_ENV to production, preview, or development per deployment, so
// the endpoint reports the environment instead of it only being visible to
// somebody signed in to the hosting dashboard.
function currentEnvironment() {
  const target = process.env.VERCEL_ENV;
  if (target === 'preview') return 'staging';
  return target ?? env.NODE_ENV;
}

export function live(req, res) {
  res.json({
    success: true,
    service: 'deci-project-api',
    status: 'up',
    environment: currentEnvironment(),
    timestamp: new Date().toISOString(),
  });
}

export const ready = asyncHandler(async (req, res) => {
  const checks = {
    postgresql: false,
    mongodb: mongoose.connection.readyState === 1,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgresql = true;
  } catch {
    checks.postgresql = false;
  }

  const isReady = Object.values(checks).every(Boolean);
  res.status(isReady ? 200 : 503).json({
    success: isReady,
    status: isReady ? 'ready' : 'not-ready',
    environment: currentEnvironment(),
    checks,
    timestamp: new Date().toISOString(),
  });
});

export const overview = asyncHandler(async (req, res) => {
  const checks = {
    api: true,
    postgresql: false,
    mongodb: mongoose.connection.readyState === 1,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgresql = true;
  } catch {
    checks.postgresql = false;
  }

  const allHealthy = Object.values(checks).every(Boolean);
  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    project: 'DECI.Project',
    status: allHealthy ? 'healthy' : 'degraded',
    environment: currentEnvironment(),
    checks,
    timestamp: new Date().toISOString(),
  });
});
