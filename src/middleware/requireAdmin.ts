// src/middleware/requireAdmin.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import type { NextApiRequest, NextApiResponse } from 'next';

export async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return session;
}
