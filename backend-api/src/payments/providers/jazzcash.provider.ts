import * as crypto from 'crypto';

/**
 * JazzCash Hosted Checkout Helper
 *
 * Builds the form-data parameters needed for a redirect-based payment.
 * The user's browser POSTs this form to JazzCash, completes payment,
 * and JazzCash POSTs back to our callback URL.
 *
 * Required env vars:
 *   JAZZCASH_MERCHANT_ID
 *   JAZZCASH_PASSWORD
 *   JAZZCASH_HASH_KEY
 *   JAZZCASH_SANDBOX   ("true" for sandbox)
 */

const SANDBOX_URL  = 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform';
const LIVE_URL     = 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform';
const STATUS_SANDBOX = 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction';
const STATUS_LIVE    = 'https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction';

function isSandbox(): boolean {
  return process.env.JAZZCASH_SANDBOX === 'true';
}

export function getJazzCashFormUrl(): string {
  return isSandbox() ? SANDBOX_URL : LIVE_URL;
}

export function getJazzCashStatusUrl(): string {
  return isSandbox() ? STATUS_SANDBOX : STATUS_LIVE;
}

function getMerchantId(): string {
  return process.env.JAZZCASH_MERCHANT_ID || '';
}

function getPassword(): string {
  return process.env.JAZZCASH_PASSWORD || '';
}

function getHashKey(): string {
  return process.env.JAZZCASH_HASH_KEY || '';
}

/**
 * Generate HMAC-SHA256 hash for JazzCash request integrity.
 */
function computeHash(dataString: string): string {
  return crypto
    .createHmac('sha256', getHashKey())
    .update(dataString)
    .digest('hex');
}

/**
 * Format the current date+time as JazzCash expects: YYYYMMDDHHmmss
 */
function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/**
 * Build the complete set of parameters for a JazzCash hosted checkout POST.
 */
export function buildJazzCashPayload(opts: {
  merchantRef: string;
  amount: number;       // in PKR whole units (e.g. 1500)
  description: string;
  returnUrl: string;    // where JazzCash redirects user after payment
  callbackUrl: string;  // server-to-server IPN notification
  mobileNumber?: string;
}): Record<string, string> {
  const now = new Date();
  const expiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour window

  const params: Record<string, string> = {
    pp_Version:        '1.1',
    pp_TxnType:        'MWALLET',           // Mobile Wallet
    pp_Language:       'EN',
    pp_MerchantID:     getMerchantId(),
    pp_SubMerchantID:  '',
    pp_Password:       getPassword(),
    pp_BankID:         'TBANK',
    pp_ProductID:      'RETL',
    pp_TxnRefNo:       opts.merchantRef,
    pp_Amount:         String(Math.round(opts.amount * 100)),  // in paisa
    pp_TxnCurrency:    'PKR',
    pp_TxnDateTime:    formatDateTime(now),
    pp_TxnExpiryDateTime: formatDateTime(expiry),
    pp_BillReference:  opts.merchantRef,
    pp_Description:    opts.description.slice(0, 50),
    pp_ReturnURL:      opts.returnUrl,
    ppmpf_1:           opts.mobileNumber || '',
    ppmpf_2:           '',
    ppmpf_3:           '',
    ppmpf_4:           '',
    ppmpf_5:           '',
  };

  // Hash computation — sorted alphabetically, joined with &, prefixed by hash key
  const sortedKeys = Object.keys(params).sort();
  const hashInput = getHashKey() + '&' + sortedKeys
    .filter(k => params[k] !== '')
    .map(k => params[k])
    .join('&');

  params.pp_SecureHash = computeHash(hashInput);

  return params;
}

/**
 * Verify the secure hash on a JazzCash callback/return POST.
 */
export function verifyJazzCashHash(payload: Record<string, string>): boolean {
  const receivedHash = payload.pp_SecureHash;
  if (!receivedHash) return false;

  const copy = { ...payload };
  delete copy.pp_SecureHash;

  const sortedKeys = Object.keys(copy).sort();
  const hashInput = getHashKey() + '&' + sortedKeys
    .filter(k => copy[k] !== '' && copy[k] !== undefined && copy[k] !== null)
    .map(k => copy[k])
    .join('&');

  const computed = computeHash(hashInput);
  return computed.toLowerCase() === receivedHash.toLowerCase();
}

/**
 * Check if a JazzCash response code indicates success.
 */
export function isJazzCashSuccess(responseCode: string): boolean {
  return responseCode === '000';
}
