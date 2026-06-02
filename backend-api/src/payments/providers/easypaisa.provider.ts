import * as crypto from 'crypto';

/**
 * EasyPaisa Hosted Checkout Helper
 *
 * Required env vars:
 *   EASYPAISA_STORE_ID
 *   EASYPAISA_HASH_KEY
 *   EASYPAISA_SANDBOX   ("true" for sandbox)
 */

const SANDBOX_URL = 'https://easypay.easypaisa.com.pk/easypay/Index.jsf';
const LIVE_URL    = 'https://easypay.easypaisa.com.pk/easypay/Index.jsf';

function isSandbox(): boolean {
  return process.env.EASYPAISA_SANDBOX === 'true';
}

export function getEasyPaisaFormUrl(): string {
  return isSandbox() ? SANDBOX_URL : LIVE_URL;
}

function getStoreId(): string {
  return process.env.EASYPAISA_STORE_ID || '';
}

function getHashKey(): string {
  return process.env.EASYPAISA_HASH_KEY || '';
}

/**
 * Format date as EasyPaisa expects: YYYYMMDD HHmmss
 */
function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())} ` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/**
 * Compute HMAC-SHA256 hash for EasyPaisa.
 */
function computeHash(dataString: string): string {
  return crypto
    .createHmac('sha256', getHashKey())
    .update(dataString)
    .digest('hex');
}

/**
 * Build EasyPaisa hosted checkout parameters.
 */
export function buildEasyPaisaPayload(opts: {
  merchantRef: string;
  amount: number;
  returnUrl: string;
  callbackUrl: string;
  mobileNumber?: string;
}): Record<string, string> {
  const now = new Date();
  const expiry = new Date(now.getTime() + 60 * 60 * 1000);

  const amount = opts.amount.toFixed(1); // EasyPaisa expects decimal e.g. "1500.0"

  const params: Record<string, string> = {
    storeId:           getStoreId(),
    amount:            amount,
    postBackURL:       opts.returnUrl,
    orderRefNum:       opts.merchantRef,
    expiryDate:        formatDateTime(expiry),
    autoRedirect:      '1',
    paymentMethod:     'MA_PAYMENT_METHOD',  // Mobile Account
    emailAddr:         '',
    mobileNum:         opts.mobileNumber || '',
  };

  // Hash: storeId + amount + postBackURL + orderRefNum + expiryDate + autoRedirect + paymentMethod + emailAddr + mobileNum
  const hashInput = [
    params.amount,
    params.autoRedirect,
    params.emailAddr,
    params.expiryDate,
    params.mobileNum,
    params.orderRefNum,
    params.paymentMethod,
    params.postBackURL,
    params.storeId,
  ].join('&');

  params.merchantHashedReq = computeHash(hashInput);

  return params;
}

/**
 * Verify the hash on an EasyPaisa callback.
 */
export function verifyEasyPaisaHash(payload: Record<string, string>): boolean {
  const receivedHash = payload.merchantHashedReq || payload.hash;
  if (!receivedHash) return false;

  const copy = { ...payload };
  delete copy.merchantHashedReq;
  delete copy.hash;

  const sortedKeys = Object.keys(copy).sort();
  const hashInput = sortedKeys
    .filter(k => copy[k] !== '' && copy[k] !== undefined)
    .map(k => copy[k])
    .join('&');

  const computed = computeHash(hashInput);
  return computed.toLowerCase() === receivedHash.toLowerCase();
}

/**
 * Check if an EasyPaisa response code indicates success.
 */
export function isEasyPaisaSuccess(responseCode: string): boolean {
  return responseCode === '0000';
}
