import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { apiKey, merchantId, vendorId } = req.body;
    res.setHeader('Set-Cookie', [
      `ice_api_key=${apiKey || ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      `ice_merchant_id=${merchantId || ''}; Path=/; SameSite=Lax; Max-Age=86400`,
      `ice_vendor_id=${vendorId || ''}; Path=/; SameSite=Lax; Max-Age=86400`
    ]);
    return res.status(200).json({ ok: true });
  } else if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', [
      'ice_api_key=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      'ice_merchant_id=; Path=/; SameSite=Lax; Max-Age=0',
      'ice_vendor_id=; Path=/; SameSite=Lax; Max-Age=0'
    ]);
    return res.status(200).json({ ok: true });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
