import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyLaunchToken, reportUsage, InsufficientFundsError, SessionNotFoundError } from '@mythos-work/sdk';

const CREDITS_PER_CALCULATION = 1;

type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

function compute(operation: Operation, a: number, b: number): number {
  switch (operation) {
    case 'add':
      return a + b;
    case 'subtract':
      return a - b;
    case 'multiply':
      return a * b;
    case 'divide':
      return a / b;
  }
}

export default async function calculate(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const { lt, operation, a, b } = req.body as { lt?: string; operation?: Operation; a?: number; b?: number };

  if (!lt || !operation || typeof a !== 'number' || typeof b !== 'number') {
    res.status(400).json({ success: false, error: 'Missing lt, operation, a, or b' });
    return;
  }

  if (operation === 'divide' && b === 0) {
    res.status(400).json({ success: false, error: 'Division by zero' });
    return;
  }

  try {
    const session = await verifyLaunchToken(lt);
    const result = compute(operation, a, b);
    await reportUsage(session.sessionJti, { credits: CREDITS_PER_CALCULATION, reason: `calculator:${operation}` });
    res.status(200).json({ success: true, data: { result, creditsCharged: CREDITS_PER_CALCULATION } });
  } catch (err: unknown) {
    if (err instanceof InsufficientFundsError) {
      res.status(402).json({ success: false, error: 'Insufficient funds' });
      return;
    }
    if (err instanceof SessionNotFoundError) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(401).json({ success: false, error: message });
  }
}
