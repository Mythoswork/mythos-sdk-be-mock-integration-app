import type { NextApiRequest, NextApiResponse } from 'next';
import { requireLaunchToken } from '@mythos-work/sdk';
import type { MythosSession } from '@mythos-work/sdk';

const handler = requireLaunchToken();

export default function verifySession(req: NextApiRequest, res: NextApiResponse) {
  return handler(req as any, res as any, () => {
    const session = (req as unknown as { mythos: MythosSession }).mythos;
    res.status(200).json({ success: true, data: session });
  });
}
