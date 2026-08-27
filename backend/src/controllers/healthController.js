import mongoose from 'mongoose';
import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function live(req, res) {
  res.json({
    success: true,
    service: 'deci-project-api',
    status: 'up',
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
    checks,
    timestamp: new Date().toISOString(),
  });
});
