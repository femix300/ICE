import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const sessionBodySchema = z.object({
  apiKey: z.string().max(200).optional(),
  merchantId: z.string().max(200).optional(),
  vendorId: z.string().max(200).optional(),
});

const isProduction = process.env.NODE_ENV === 'production';
const secureFlag = isProduction ? '; Secure' : '';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const parsed = sessionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'Invalid session body' });
    }
    const { apiKey, merchantId, vendorId } = parsed.data;
    const cookies: string[] = [];
    if (apiKey !== undefined) {
      cookies.push(
        `ice_api_key=${encodeURIComponent(apiKey)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secureFlag}`,
      );
    }
    if (merchantId !== undefined) {
      cookies.push(
        `ice_merchant_id=${encodeURIComponent(merchantId)}; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`,
      );
    }
    if (vendorId !== undefined) {
      cookies.push(
        `ice_vendor_id=${encodeURIComponent(vendorId)}; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`,
      );
    }
    if (cookies.length > 0) {
      res.setHeader('Set-Cookie', cookies);
    }
    return res.status(200).json({ ok: true });
  } else if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', [
      `ice_api_key=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`,
      `ice_merchant_id=; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`,
      `ice_vendor_id=; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`,
    ]);
    return res.status(200).json({ ok: true });
  }
  res.status(405).json({ ok: false, error: 'Method not allowed' });
}
