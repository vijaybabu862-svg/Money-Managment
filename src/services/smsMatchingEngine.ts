/**
 * SMS Detection & Matching Engine for Swiggy Operational Workflow
 *
 * Implements the complete pipeline:
 * Swiggy Shift → Operational Record → Financial Transaction Link → SMS Detection → Matching / Review → Confirm OR Link Existing Transaction
 */

import { SwiggyShift, Transaction, TransactionType } from '../types/finance';
import { getCurrentDateISO } from '../utils/dates';

export interface ParsedSmsTransaction {
  amount: number;
  type: TransactionType;
  date: string;
  bankName: string;
  counterparty: string;
  reference?: string;
  accountNumber?: string;
  rawText: string;
  isSwiggyRelated: boolean;
  isFuelRelated: boolean;
  suggestedCategoryId: string;
}

export interface ShiftMatchCandidate {
  shift: SwiggyShift;
  confidenceScore: number; // 0 to 100
  recommendation: 'STRONG_MATCH' | 'POSSIBLE_MATCH' | 'LOW_CONFIDENCE';
  matchReasons: string[];
  linkType: 'INCOME' | 'FUEL';
}

export interface TxMatchCandidate {
  transaction: Transaction;
  confidenceScore: number;
  recommendation: 'STRONG_MATCH' | 'POSSIBLE_MATCH' | 'LOW_CONFIDENCE';
  matchReasons: string[];
  linkType: 'INCOME' | 'FUEL';
}

/**
 * Standard Indian Bank SMS Templates for Swiggy Payouts & Fuel
 */
export const SAMPLE_INDIAN_BANK_SMS = [
  {
    label: 'HDFC Swiggy UPI Credit (₹640)',
    bank: 'HDFC Bank',
    text: 'HDFC Bank: Rs 640.00 credited to a/c **4128 on 24-09-2026 by VPA swiggy@icici (UPI Ref 426819238129). Bal: Rs 15,640.00',
  },
  {
    label: 'SBI Swiggy Daily Payout (₹500)',
    bank: 'State Bank of India',
    text: 'SBI: INR 500.00 credited to A/C ending 4128 on 25-Sep-26 by BUNDL TECHNOLOGIES (SWIGGY) UPI/42681999201. Avail Bal: INR 16,140.00',
  },
  {
    label: 'ICICI Swiggy Dinner Payout (₹680)',
    bank: 'ICICI Bank',
    text: 'ICICI Bank: Rs 680.00 deposited into A/C **4128 on 25-09-2026. Info: UPI/swiggy@icici/Rider Payout. Available Balance is Rs 16,820.00',
  },
  {
    label: 'Indian Oil Petrol Refill (₹110)',
    bank: 'HDFC Bank',
    text: 'HDFC Bank: Rs 110.00 debited from a/c **4128 at INDIAN OIL CORP HYD on 24-09-26 via UPI 42681938210.',
  },
  {
    label: 'HPCL Petrol Refill (₹300)',
    bank: 'SBI',
    text: 'SBI: INR 300.00 debited from A/C ending 4128 on 25-Sep-26 at HPCL AUTO FUEL PUMP. Info: UPI Ref 42682910381.',
  },
];

/**
 * Parses raw transactional SMS text from Indian banks & UPI apps
 */
export function parseIndianBankSMS(rawText: string): ParsedSmsTransaction | null {
  if (!rawText || typeof rawText !== 'string') return null;

  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Detect Transaction Type (Credit/Income vs Debit/Expense)
  let type: TransactionType = 'EXPENSE';
  if (
    lower.includes('credited') ||
    lower.includes('credit to') ||
    lower.includes('deposited') ||
    lower.includes('received') ||
    lower.includes('added to') ||
    lower.includes('payout')
  ) {
    type = 'INCOME';
  } else if (
    lower.includes('debited') ||
    lower.includes('spent') ||
    lower.includes('paid to') ||
    lower.includes('withdrawn')
  ) {
    type = 'EXPENSE';
  }

  // 2. Extract Amount
  // Matches: "Rs 640.00", "Rs. 640", "INR 640", "₹640", "Rs 640"
  const amountRegex = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
  const amountMatch = text.match(amountRegex);
  if (!amountMatch) return null;

  const cleanAmountStr = amountMatch[1].replace(/,/g, '');
  const amount = parseFloat(cleanAmountStr);
  if (isNaN(amount) || amount <= 0) return null;

  // 3. Detect Bank Name
  let bankName = 'Bank Alert';
  if (lower.includes('hdfc')) bankName = 'HDFC Bank';
  else if (lower.includes('sbi') || lower.includes('state bank')) bankName = 'State Bank of India';
  else if (lower.includes('icici')) bankName = 'ICICI Bank';
  else if (lower.includes('axis')) bankName = 'Axis Bank';
  else if (lower.includes('paytm')) bankName = 'Paytm Payments Bank';
  else if (lower.includes('kotak')) bankName = 'Kotak Bank';
  else if (lower.includes('upi')) bankName = 'UPI Transfer';

  // 4. Detect Counterparty / Vendor / Payer
  const isSwiggy = lower.includes('swiggy') || lower.includes('bundl');
  const isFuel =
    lower.includes('fuel') ||
    lower.includes('petrol') ||
    lower.includes('indian oil') ||
    lower.includes('hpcl') ||
    lower.includes('bpcl') ||
    lower.includes('bunk') ||
    lower.includes('oil corp');

  let counterparty = 'Vendor';
  if (isSwiggy) counterparty = 'Swiggy / Bundl Technologies';
  else if (lower.includes('indian oil')) counterparty = 'Indian Oil Petrol Bunk';
  else if (lower.includes('hpcl')) counterparty = 'HPCL Petrol Pump';
  else if (lower.includes('bpcl')) counterparty = 'Bharat Petroleum';
  else if (isFuel) counterparty = 'Petrol Bunk Refill';
  else if (type === 'INCOME') counterparty = 'Direct Credit Payout';
  else counterparty = 'Merchant Payment';

  // 5. Extract Reference / UPI Ref
  const refRegex = /(?:ref|upi ref|rrn|txn)[:\s]*([a-zA-Z0-9]+)/i;
  const refMatch = text.match(refRegex);
  const reference = refMatch ? refMatch[1] : undefined;

  // 6. Extract Account Number (e.g., "**4128", "ending 4128")
  const accRegex = /(?:a\/c|account)[\s\w\*]*?([0-9]{3,4})/i;
  const accMatch = text.match(accRegex);
  const accountNumber = accMatch ? accMatch[1] : undefined;

  // 7. Extract Date (or default to current ISO date)
  let date = getCurrentDateISO();
  // Try matching DD-MM-YYYY or DD-MMM-YY
  const dateMatch = text.match(/(\d{1,2})[-/.](\d{1,2}|[a-zA-Z]{3})[-/.](\d{2,4})/);
  if (dateMatch) {
    try {
      const day = dateMatch[1].padStart(2, '0');
      let month = dateMatch[2];
      const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];

      const monthNames: Record<string, string> = {
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

      if (isNaN(Number(month))) {
        const monKey = month.toLowerCase().substring(0, 3);
        month = monthNames[monKey] || '09';
      } else {
        month = month.padStart(2, '0');
      }

      date = `${year}-${month}-${day}`;
    } catch {
      date = getCurrentDateISO();
    }
  }

  const suggestedCategoryId = isSwiggy
    ? 'cat_swiggy_inc'
    : isFuel
    ? 'cat_fuel'
    : type === 'INCOME'
    ? 'cat_salary'
    : 'cat_dining';

  return {
    amount,
    type,
    date,
    bankName,
    counterparty,
    reference,
    accountNumber,
    rawText: text,
    isSwiggyRelated: isSwiggy,
    isFuelRelated: isFuel,
    suggestedCategoryId,
  };
}

/**
 * Intelligent Matching Engine:
 * Compares an SMS transaction against Swiggy Shifts to find high-probability operational matches.
 */
export function matchSmsToSwiggyShifts(
  smsTx: Transaction,
  shifts: SwiggyShift[]
): ShiftMatchCandidate[] {
  const candidates: ShiftMatchCandidate[] = [];

  for (const shift of shifts) {
    let score = 0;
    const matchReasons: string[] = [];
    const linkType: 'INCOME' | 'FUEL' = smsTx.type === 'INCOME' ? 'INCOME' : 'FUEL';

    const targetAmount = linkType === 'INCOME' ? shift.grossEarnings : shift.fuelExpense;

    if (targetAmount <= 0) continue;

    // 1. Amount Scoring (Max 55 points)
    const amountDiff = Math.abs(smsTx.amount - targetAmount);
    if (amountDiff === 0) {
      score += 55;
      matchReasons.push(`Exact amount match (₹${smsTx.amount})`);
    } else if (amountDiff <= 20) {
      score += 42;
      matchReasons.push(`Very close amount (diff: ₹${amountDiff})`);
    } else if (amountDiff <= 50) {
      score += 25;
      matchReasons.push(`Within tip/deduction margin (diff: ₹${amountDiff})`);
    }

    // 2. Date Scoring (Max 30 points)
    const txTime = new Date(smsTx.date).getTime();
    const shiftTime = new Date(shift.date).getTime();
    const dayDiff = Math.abs(Math.round((txTime - shiftTime) / (1000 * 60 * 60 * 24)));

    if (dayDiff === 0) {
      score += 30;
      matchReasons.push(`Same date (${shift.date})`);
    } else if (dayDiff === 1) {
      score += 22;
      matchReasons.push(`Next-day payout/refill (${shift.date})`);
    } else if (dayDiff <= 3) {
      score += 10;
      matchReasons.push(`Within 3 days (${shift.date})`);
    }

    // 3. Operational Metadata Scoring (Max 15 points)
    const descLower = (smsTx.description || '').toLowerCase();
    const notesLower = (smsTx.notes || '').toLowerCase();

    if (linkType === 'INCOME' && (descLower.includes('swiggy') || notesLower.includes('swiggy') || descLower.includes('bundl'))) {
      score += 15;
      matchReasons.push('Verified Swiggy payout header in SMS');
    } else if (linkType === 'FUEL' && (descLower.includes('fuel') || descLower.includes('petrol') || descLower.includes('oil'))) {
      score += 15;
      matchReasons.push('Verified petrol pump merchant in SMS');
    }

    // Already linked check
    const isLinkedToThis =
      (linkType === 'INCOME' && shift.linkedIncomeTxId === smsTx.id) ||
      (linkType === 'FUEL' && shift.linkedFuelTxId === smsTx.id);

    if (isLinkedToThis) {
      score = 100;
      matchReasons.unshift('Already linked to this operational record');
    }

    if (score >= 35) {
      let recommendation: 'STRONG_MATCH' | 'POSSIBLE_MATCH' | 'LOW_CONFIDENCE' = 'LOW_CONFIDENCE';
      if (score >= 80) recommendation = 'STRONG_MATCH';
      else if (score >= 50) recommendation = 'POSSIBLE_MATCH';

      candidates.push({
        shift,
        confidenceScore: Math.min(100, score),
        recommendation,
        matchReasons,
        linkType,
      });
    }
  }

  // Sort by highest confidence score first
  return candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Finds candidate existing financial transactions in the ledger for an unlinked Swiggy Shift
 */
export function matchShiftToTransactions(
  shift: SwiggyShift,
  transactions: Transaction[],
  linkType: 'INCOME' | 'FUEL' = 'INCOME'
): TxMatchCandidate[] {
  const candidates: TxMatchCandidate[] = [];
  const targetAmount = linkType === 'INCOME' ? shift.grossEarnings : shift.fuelExpense;
  const targetType: TransactionType = linkType === 'INCOME' ? 'INCOME' : 'EXPENSE';

  if (targetAmount <= 0) return candidates;

  for (const tx of transactions) {
    if (tx.type !== targetType) continue;

    let score = 0;
    const matchReasons: string[] = [];

    // Amount match
    const amountDiff = Math.abs(tx.amount - targetAmount);
    if (amountDiff === 0) {
      score += 55;
      matchReasons.push(`Exact amount (₹${tx.amount})`);
    } else if (amountDiff <= 20) {
      score += 40;
      matchReasons.push(`Close amount (diff: ₹${amountDiff})`);
    } else if (amountDiff <= 50) {
      score += 25;
      matchReasons.push(`Within ₹50 margin`);
    }

    // Date match
    const txTime = new Date(tx.date).getTime();
    const shiftTime = new Date(shift.date).getTime();
    const dayDiff = Math.abs(Math.round((txTime - shiftTime) / (1000 * 60 * 60 * 24)));

    if (dayDiff === 0) {
      score += 30;
      matchReasons.push(`Same date (${tx.date})`);
    } else if (dayDiff === 1) {
      score += 22;
      matchReasons.push(`Adjacent date (${tx.date})`);
    } else if (dayDiff <= 3) {
      score += 10;
      matchReasons.push(`Within 3 days (${tx.date})`);
    }

    // Category / Keyword match
    const descLower = (tx.description || '').toLowerCase();
    if (linkType === 'INCOME' && (descLower.includes('swiggy') || descLower.includes('delivery'))) {
      score += 15;
      matchReasons.push('Swiggy / Delivery description');
    } else if (linkType === 'FUEL' && (descLower.includes('fuel') || descLower.includes('petrol') || descLower.includes('oil'))) {
      score += 15;
      matchReasons.push('Fuel description');
    }

    // Already linked
    const isCurrentlyLinked =
      (linkType === 'INCOME' && shift.linkedIncomeTxId === tx.id) ||
      (linkType === 'FUEL' && shift.linkedFuelTxId === tx.id);

    if (isCurrentlyLinked) {
      score = 100;
      matchReasons.unshift('Currently linked');
    }

    if (score >= 35) {
      let recommendation: 'STRONG_MATCH' | 'POSSIBLE_MATCH' | 'LOW_CONFIDENCE' = 'LOW_CONFIDENCE';
      if (score >= 80) recommendation = 'STRONG_MATCH';
      else if (score >= 50) recommendation = 'POSSIBLE_MATCH';

      candidates.push({
        transaction: tx,
        confidenceScore: Math.min(100, score),
        recommendation,
        matchReasons,
        linkType,
      });
    }
  }

  return candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
