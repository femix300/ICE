import crypto from 'node:crypto';

type NombaSignaturePayload = {
  event_type: string;
  requestId: string;
  data: {
    merchant: { userId: string; walletId: string };
    transaction: {
      transactionId: string;
      type: string;
      time: string;
      responseCode?: string;
    };
  };
};

export function verifySignature(
  payload: NombaSignaturePayload,
  signature: string,
  timestamp: string,
  secret: string,
): boolean {
  const { merchant: m, transaction: t } = payload.data;
  const signedString = [
    payload.event_type,
    payload.requestId,
    m.userId,
    m.walletId,
    t.transactionId,
    t.type,
    t.time,
    t.responseCode ?? '',
    timestamp,
  ].join(':');

  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedString)
    .digest('base64');

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(signatureBuf, expectedBuf);
}
