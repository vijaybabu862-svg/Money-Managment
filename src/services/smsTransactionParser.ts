/**
 * CASH FLOW — Stage 5 Master Service
 * SMS Transaction Parser
 *
 * Local-first, private parser for Indian banking, UPI, credit-card, and delivery SMS text.
 * Strictly does NOT write directly to the financial ledger (transactions[]).
 */

import {
  ParserConfidence,
  SmsCandidateSource,
  SmsCandidateType,
  SmsReviewStatus,
  SmsTransactionCandidate,
} from '../types/finance';
import { getCurrentDateISO } from '../utils/dates';

/**
 * Normalizes raw SMS text:
 * - cleans excess whitespace & line breaks
 * - normalizes Indian currency notation (₹, Rs., Rs, INR)
 * - removes thousands separators in numbers (1,704.00 -> 1704.00)
 */
export function normalizeSmsText(raw: string): string {
  if (!raw) return '';

  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Collapse whitespace per line
  text = text
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join(' ');

  // Standardize currency tokens
  text = text.replace(/₹\s*/g, 'Rs ');
  text = text.replace(/inr\s*/gi, 'Rs ');
  text = text.replace(/rs\.\s*/gi, 'Rs ');

  return text.trim();
}

/**
 * Splits pasted text containing one or multiple SMS messages.
 * Separated by double newlines or lines starting with '---' or '==='.
 */
export function splitMultiSmsText(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Split on triple hyphens, double equals, or double empty lines
  const rawChunks = rawText.split(/(?:\r?\n\s*[-=]{3,}\s*\r?\n)|(?:\r?\n\s*\r?\n)/);
  const results: string[] = [];

  for (const chunk of rawChunks) {
    const trimmed = chunk.trim();
    if (trimmed.length > 5) {
      results.push(trimmed);
    }
  }

  return results.length > 0 ? results : [rawText.trim()];
}

/**
 * Masks sensitive account or card references to prevent displaying full numbers.
 * E.g., "1234" -> "XXXX1234"
 */
export function maskFinancialReference(digits: string, prefix = 'XXXX'): string {
  const clean = digits.replace(/\D/g, '');
  if (!clean) return '';
  const last4 = clean.slice(-4);
  return `${prefix}${last4}`;
}

/**
 * Extracts account and card references from SMS
 */
function extractAccountOrCard(text: string): {
  accountRef?: string;
  cardRef?: string;
} {
  let accountRef: string | undefined;
  let cardRef: string | undefined;

  // Credit card detection: "credit card ending 1234", "card ending in 1234", "card no. XX1234"
  const cardMatch = text.match(/(?:credit\s*card|card)[\s\w]*?(?:ending\s*(?:in\s*)?|no\.?\s*|[x*]{2,})([0-9]{3,4})/i);
  if (cardMatch) {
    cardRef = maskFinancialReference(cardMatch[1]);
  }

  // Bank account detection: "A/c XX1234", "Account ending 4921", "a/c no 1234"
  const accMatch = text.match(/(?:a\/c|account)[\s\w]*?(?:ending\s*(?:in\s*)?|no\.?\s*|[x*]{2,})([0-9]{3,4})/i);
  if (accMatch) {
    accountRef = maskFinancialReference(accMatch[1]);
  }

  return { accountRef, cardRef };
}

/**
 * Detects known Indian bank, UPI provider, or sender
 */
function detectSender(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('hdfc')) return 'HDFC Bank';
  if (lower.includes('sbi') || lower.includes('state bank')) return 'State Bank of India';
  if (lower.includes('icici')) return 'ICICI Bank';
  if (lower.includes('axis')) return 'Axis Bank';
  if (lower.includes('kotak')) return 'Kotak Mahindra Bank';
  if (lower.includes('paytm')) return 'Paytm Payments Bank';
  if (lower.includes('phonepe')) return 'PhonePe';
  if (lower.includes('gpay') || lower.includes('google pay')) return 'Google Pay';
  if (lower.includes('bob') || lower.includes('bank of baroda')) return 'Bank of Baroda';
  if (lower.includes('pnb') || lower.includes('punjab national')) return 'Punjab National Bank';
  if (lower.includes('canara')) return 'Canara Bank';
  if (lower.includes('indusind')) return 'IndusInd Bank';
  if (lower.includes('yes bank')) return 'Yes Bank';
  if (lower.includes('federal')) return 'Federal Bank';
  if (lower.includes('idfc')) return 'IDFC First Bank';
  return undefined;
}

/**
 * Parses date string from Indian bank SMS formats
 * E.g. "26-09-2026", "26/09/2026", "26 Sep 2026", "26 September 2026", "2026-09-26", "26-Sep-26"
 */
function extractTransactionDate(text: string): { date?: string; isInferred: boolean } {
  const monthMap: Record<string, string> = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    may: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12',
  };

  // 1. Match DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return { date: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`, isInferred: false };
  }

  const ddmmyyyyMatch = text.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2}|\d{2})\b/);
  if (ddmmyyyyMatch) {
    const day = ddmmyyyyMatch[1].padStart(2, '0');
    const month = ddmmyyyyMatch[2].padStart(2, '0');
    let year = ddmmyyyyMatch[3];
    if (year.length === 2) year = `20${year}`;
    return { date: `${year}-${month}-${day}`, isInferred: false };
  }

  // 2. Match DD-MMM-YYYY or DD MMM YYYY (e.g., 26 Sep 2026, 26-Sep-26, 26-September-2026)
  const textDateMatch = text.match(/\b(0?[1-9]|[12]\d|3[01])[-/\s]+([a-zA-Z]{3,9})[-/\s]+(20\d{2}|\d{2})?\b/);
  if (textDateMatch) {
    const day = textDateMatch[1].padStart(2, '0');
    const monKey = textDateMatch[2].toLowerCase().substring(0, 3);
    const month = monthMap[monKey];
    if (month) {
      let year = textDateMatch[3] || '2026';
      if (year.length === 2) year = `20${year}`;
      return { date: `${year}-${month}-${day}`, isInferred: false };
    }
  }

  return { date: getCurrentDateISO(), isInferred: true };
}

/**
 * Extracts amounts, handling multiple amounts such as Total Due and Minimum Due
 */
function extractAmounts(text: string): {
  primaryAmount?: number;
  totalDue?: number;
  minimumDue?: number;
  allAmounts: number[];
} {
  const lower = text.toLowerCase();

  // Check for Total Due & Minimum Due
  let totalDue: number | undefined;
  let minimumDue: number | undefined;

  const totalDueMatch = text.match(/(?:total\s*(?:amount\s*)?due|amt\s*due)[\s:=-]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (totalDueMatch) {
    totalDue = parseFloat(totalDueMatch[1].replace(/,/g, ''));
  }

  const minDueMatch = text.match(/(?:min(?:imum)?\s*(?:amount\s*)?due)[\s:=-]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (minDueMatch) {
    minimumDue = parseFloat(minDueMatch[1].replace(/,/g, ''));
  }

  // Find all standard currency amount patterns
  // Matches "Rs 1,704", "Rs. 1,704.00", "INR 1704", "₹1,704", "debited by 1704", "credited with 1704"
  const amountRegex = /(?:(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?))|(?:(?:debited|credited|spent|received|transferred|paid)\s*(?:by|with|of)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?))/gi;

  const allAmounts: number[] = [];
  let match: RegExpExecArray | null;

  while ((match = amountRegex.exec(text)) !== null) {
    const rawVal = match[1] || match[2];
    if (rawVal) {
      const parsed = parseFloat(rawVal.replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0 && !allAmounts.includes(parsed)) {
        allAmounts.push(parsed);
      }
    }
  }

  // Fallback pattern if none matched explicitly
  if (allAmounts.length === 0) {
    const genericMatch = text.match(/(?:rs|inr)\.?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
    if (genericMatch) {
      const num = parseFloat(genericMatch[1]);
      if (!isNaN(num) && num > 0) allAmounts.push(num);
    }
  }

  // Choose primary amount:
  // If Total Due is present, default to Total Due rather than Minimum Due (Section 70 / 71)
  let primaryAmount = totalDue || (allAmounts.length > 0 ? allAmounts[0] : undefined);

  // If there are multiple amounts and the first one is an account balance (e.g. "Avail Bal: Rs 15,000"),
  // look specifically for debited/credited amount first
  const specificActionMatch = text.match(/(?:debited\s*(?:by|with|for)?|credited\s*(?:by|with|for)?|paid\s*for|used\s*for|emi\s*of)\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (specificActionMatch) {
    primaryAmount = parseFloat(specificActionMatch[1].replace(/,/g, ''));
  }

  return { primaryAmount, totalDue, minimumDue, allAmounts };
}

/**
 * Detects merchant, payee, or counterparty from SMS text
 */
function extractMerchantOrPayee(text: string): { merchant?: string; payee?: string } {
  const lower = text.toLowerCase();

  // Known delivery & food
  if (lower.includes('swiggy') || lower.includes('bundl')) {
    return { merchant: 'Swiggy', payee: 'Swiggy / Bundl Technologies' };
  }
  if (lower.includes('zomato')) {
    return { merchant: 'Zomato', payee: 'Zomato' };
  }

  // Known petrol & fuel
  if (lower.includes('indian oil') || lower.includes('ioc')) {
    return { merchant: 'Indian Oil Petrol Bunk', payee: 'Indian Oil Corp' };
  }
  if (lower.includes('hpcl') || lower.includes('hindustan petroleum')) {
    return { merchant: 'HPCL Petrol Pump', payee: 'Hindustan Petroleum' };
  }
  if (lower.includes('bpcl') || lower.includes('bharat petroleum')) {
    return { merchant: 'BPCL Petrol Pump', payee: 'Bharat Petroleum' };
  }
  if (lower.includes('fuel station') || lower.includes('petrol pump')) {
    return { merchant: 'Fuel Station', payee: 'Fuel Station' };
  }

  // Known e-commerce & shopping
  if (lower.includes('amazon')) {
    return { merchant: 'Amazon India', payee: 'Amazon Pay' };
  }
  if (lower.includes('flipkart')) {
    return { merchant: 'Flipkart', payee: 'Flipkart Internet' };
  }
  if (lower.includes('myntra')) {
    return { merchant: 'Myntra', payee: 'Myntra Designs' };
  }
  if (lower.includes('reliance')) {
    return { merchant: 'Reliance Retail', payee: 'Reliance' };
  }
  if (lower.includes('uber')) {
    return { merchant: 'Uber India', payee: 'Uber' };
  }
  if (lower.includes('ola')) {
    return { merchant: 'Ola Cabs', payee: 'ANI Technologies' };
  }

  // Generic merchant extraction e.g., "at Amazon", "to Vijay", "vpa merchant@upi"
  const atMatch = text.match(/(?:at|info:\s*upi\/|vpa\s+)([\w\s.-]+?)(?:\s+on|\s+via|\.|\s+avail|$)/i);
  if (atMatch && atMatch[1].trim().length > 2 && atMatch[1].trim().length < 30) {
    return { merchant: atMatch[1].trim() };
  }

  const toMatch = text.match(/(?:paid to|transferred to|sent to)\s+([\w\s.-]+?)(?:\s+on|\s+ref|\.|$)/i);
  if (toMatch && toMatch[1].trim().length > 2 && toMatch[1].trim().length < 30) {
    return { payee: toMatch[1].trim() };
  }

  return {};
}

/**
 * Suggests category based on merchant, text keywords, and transaction type
 */
function suggestCategory(
  type: SmsCandidateType,
  merchant?: string,
  text?: string
): string {
  const lower = (text || '').toLowerCase();
  const merchLower = (merchant || '').toLowerCase();

  if (type === 'INCOME') {
    if (lower.includes('salary') || lower.includes('monthly pay')) return 'cat_salary';
    if (lower.includes('swiggy') || merchLower.includes('swiggy')) return 'cat_swiggy_inc';
    return 'cat_other_inc';
  }

  if (type === 'DEBT_PAYMENT') {
    return 'cat_loan_interest';
  }

  if (type === 'REFUND') {
    return 'cat_other_inc';
  }

  // Expenses
  if (
    merchLower.includes('fuel') ||
    merchLower.includes('oil') ||
    merchLower.includes('hpcl') ||
    merchLower.includes('bpcl') ||
    lower.includes('petrol')
  ) {
    return 'cat_fuel';
  }

  if (merchLower.includes('swiggy') || merchLower.includes('zomato') || lower.includes('restaurant') || lower.includes('cafe')) {
    return 'cat_dining';
  }

  if (merchLower.includes('amazon') || merchLower.includes('flipkart') || merchLower.includes('myntra') || lower.includes('shopping')) {
    return 'cat_shopping';
  }

  if (lower.includes('rent') || lower.includes('landlord')) {
    return 'cat_rent';
  }

  if (lower.includes('electricity') || lower.includes('power') || lower.includes('bescom')) {
    return 'cat_electricity';
  }

  if (lower.includes('mobile') || lower.includes('recharge') || lower.includes('airtel') || lower.includes('jio')) {
    return 'cat_mobile';
  }

  return 'cat_misc';
}

/**
 * Main Stage 5 SMS Transaction Parser.
 * Pure, local, and non-destructive. Returns a structured SmsTransactionCandidate.
 */
export function parseSmsTransaction(
  rawText: string,
  source: SmsCandidateSource = 'MANUAL_PASTE',
  receivedAt?: string
): SmsTransactionCandidate {
  const normalized = normalizeSmsText(rawText);
  const lower = normalized.toLowerCase();
  const now = new Date().toISOString();
  const candidateId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Detect OTP / Promotional (Section 47 / Test 7)
  const isOtp =
    lower.includes('otp') ||
    lower.includes('one time password') ||
    lower.includes('verification code') ||
    lower.includes('login code') ||
    lower.includes('special offer') ||
    lower.includes('flat discount') ||
    lower.includes('cashback promotion');

  if (isOtp) {
    return {
      id: candidateId,
      rawText,
      normalizedText: normalized,
      receivedAt: receivedAt || now,
      transactionType: 'UNKNOWN',
      parserConfidence: 'LOW',
      reviewStatus: 'IGNORED',
      source,
      isOtpOrPromotional: true,
      isNonTransaction: true,
      createdAt: now,
      reviewNotes: 'Classified as OTP / Promotional alert. Non-transactional.',
    };
  }

  // 2. Detect Balance-Only Alert (Section 46, 48 / Test 6)
  // E.g., "Available balance is Rs 18,450", "Clear balance in A/c XX1234 is INR 12,000" without debited/credited
  const isBalanceOnly =
    (lower.includes('available balance') ||
      lower.includes('account balance') ||
      lower.includes('clear balance') ||
      lower.includes('bal:')) &&
    !lower.includes('debited') &&
    !lower.includes('credited') &&
    !lower.includes('spent') &&
    !lower.includes('received') &&
    !lower.includes('transferred') &&
    !lower.includes('paid');

  if (isBalanceOnly) {
    const { primaryAmount } = extractAmounts(normalized);
    const { accountRef } = extractAccountOrCard(normalized);
    return {
      id: candidateId,
      rawText,
      normalizedText: normalized,
      receivedAt: receivedAt || now,
      detectedAmount: primaryAmount,
      detectedAccountReference: accountRef,
      transactionType: 'UNKNOWN',
      parserConfidence: 'LOW',
      reviewStatus: 'IGNORED',
      source,
      isBalanceAlert: true,
      isNonTransaction: true,
      createdAt: now,
      reviewNotes: 'Bank balance alert only. No debited or credited transaction event.',
    };
  }

  // 3. Detect Due Reminder / Upcoming Commitment (Section 49, 50)
  // E.g., "Your EMI of Rs 4,843 is due on 05 Oct"
  const isUpcomingReminder =
    (lower.includes('is due') || lower.includes('payment due') || lower.includes('bill generated')) &&
    !lower.includes('has been debited') &&
    !lower.includes('debited by') &&
    !lower.includes('successfully paid');

  // 4. Extract Amounts
  const { primaryAmount, totalDue, minimumDue } = extractAmounts(normalized);

  // 5. Extract Date
  const { date: detectedDate, isInferred } = extractTransactionDate(normalized);

  // 6. Extract Account and Card references (Masked)
  const { accountRef, cardRef } = extractAccountOrCard(normalized);

  // 7. Extract Sender
  const sender = detectSender(normalized);

  // 8. Extract Merchant / Payee
  const { merchant, payee } = extractMerchantOrPayee(normalized);

  // 9. Classify Transaction Type
  let type: SmsCandidateType = 'EXPENSE';

  // Refund detection (Section 12 / Test 5)
  if (
    lower.includes('refund') ||
    lower.includes('refunded') ||
    lower.includes('reversal') ||
    lower.includes('reverted') ||
    lower.includes('amount reversed')
  ) {
    type = 'REFUND';
  }
  // Debt / EMI payment detection (Section 10, 14, 15 / Test 3)
  else if (
    lower.includes('emi') ||
    lower.includes('loan repayment') ||
    lower.includes('loan payment') ||
    lower.includes('instalment') ||
    lower.includes('installment') ||
    (lower.includes('towards your credit card') && (lower.includes('payment') || lower.includes('received')))
  ) {
    type = 'DEBT_PAYMENT';
  }
  // Own-Account Transfer detection (Section 11 / Test 4)
  else if (
    lower.includes('to own account') ||
    lower.includes('self transfer') ||
    lower.includes('fund transfer') ||
    lower.includes('neft') ||
    lower.includes('imps') ||
    lower.includes('transferred to')
  ) {
    type = 'TRANSFER';
  }
  // Income detection (Section 10 / Test 2)
  else if (
    lower.includes('credited') ||
    lower.includes('credit to') ||
    lower.includes('received') ||
    lower.includes('deposit') ||
    lower.includes('salary') ||
    lower.includes('added to') ||
    lower.includes('payout')
  ) {
    type = 'INCOME';
  }
  // Expense detection (Section 10 / Test 1)
  else if (
    lower.includes('debited') ||
    lower.includes('spent') ||
    lower.includes('purchase') ||
    lower.includes('paid') ||
    lower.includes('withdrawn') ||
    lower.includes('transaction at')
  ) {
    type = 'EXPENSE';
  } else {
    type = 'UNKNOWN';
  }

  // 10. Suggest Category
  const suggestedCat = suggestCategory(type, merchant, normalized);

  // 11. Determine Confidence (Section 20)
  // HIGH: Amount + date + type + account/card reference clearly detected.
  // MEDIUM: Amount and type are clear but one or more fields are uncertain.
  // LOW: Detected possible transaction but important info is ambiguous.
  let confidence: ParserConfidence = 'LOW';
  if (primaryAmount && primaryAmount > 0 && type !== 'UNKNOWN') {
    if (!isInferred && (accountRef || cardRef)) {
      confidence = 'HIGH';
    } else {
      confidence = 'MEDIUM';
    }
  }

  // Construct description
  const description = merchant
    ? `${type === 'INCOME' ? 'Credit from' : 'Payment at'} ${merchant}`
    : payee
    ? `Transfer to ${payee}`
    : `${type} transaction via SMS`;

  return {
    id: candidateId,
    rawText,
    normalizedText: normalized,
    sender,
    receivedAt: receivedAt || now,
    detectedTransactionDate: detectedDate,
    detectedAmount: primaryAmount,
    currency: 'INR',
    transactionType: type,
    detectedAccountReference: accountRef,
    detectedCardReference: cardRef,
    detectedMerchant: merchant,
    detectedPayee: payee,
    detectedDescription: description,
    detectedCategory: suggestedCat,
    parserConfidence: confidence,
    reviewStatus: 'PENDING',
    source,
    createdAt: now,
    totalDue,
    minimumDue,
    isUpcomingCommitment: isUpcomingReminder,
    reviewNotes: isInferred
      ? 'Transaction date inferred from SMS receipt time.'
      : undefined,
  };
}

/**
 * Parses multiple SMS messages from a single text block
 */
export function parseBatchSms(
  rawBatchText: string,
  source: SmsCandidateSource = 'MANUAL_PASTE'
): SmsTransactionCandidate[] {
  const chunks = splitMultiSmsText(rawBatchText);
  return chunks.map((chunk) => parseSmsTransaction(chunk, source));
}
