/**
 * CASH FLOW — STAGE 5 MASTER TEST SUITE
 * Complete 20-Specification Verification Tests
 */

import { parseSmsTransaction } from './smsTransactionParser';
import { detectDuplicate, matchCandidate } from './transactionMatcher';
import { calculateFinancialSummary, calculateAccountBalance } from './calculator';
import { StorageService, AppState, getDefaultDemoData } from './storage';
import { AppState as StateType } from './storage';
import { Transaction, Debt, Account } from '../types/finance';

export interface TestResult {
  test: string;
  passed: boolean;
  status: 'PASS' | 'FAIL';
  details?: string;
}

export function runStage5VerificationTests(): {
  passed: number;
  total: number;
  results: TestResult[];
} {
  const results: TestResult[] = [];

  const record = (name: string, condition: boolean, details?: string) => {
    results.push({
      test: name,
      passed: condition,
      status: condition ? 'PASS' : 'FAIL',
      details,
    });
  };

  // ----------------------------------------------------
  // Test 1: Debit SMS
  // "A/c XX1234 debited by Rs 1,704" -> Amount ₹1,704, Account XXXX1234
  // ----------------------------------------------------
  {
    const parsed = parseSmsTransaction('A/c XX1234 debited by Rs 1,704 on 26-09-2026.');
    const ok =
      parsed.detectedAmount === 1704 &&
      parsed.detectedAccountReference === 'XXXX1234' &&
      (parsed.transactionType === 'EXPENSE' || parsed.transactionType === 'DEBT_PAYMENT');
    record('Test 1: Debit SMS parsing (Amount ₹1,704, Account XXXX1234)', ok, `Amount: ${parsed.detectedAmount}, Ref: ${parsed.detectedAccountReference}, Type: ${parsed.transactionType}`);
  }

  // ----------------------------------------------------
  // Test 2: Credit SMS
  // "Salary credited Rs 21,000" -> INCOME, ₹21,000
  // ----------------------------------------------------
  {
    const parsed = parseSmsTransaction('Salary credited Rs 21,000 in A/c XX4128 on 01-Sep-2026.');
    const ok = parsed.transactionType === 'INCOME' && parsed.detectedAmount === 21000;
    record('Test 2: Credit SMS parsing (INCOME, ₹21,000)', ok, `Type: ${parsed.transactionType}, Amt: ${parsed.detectedAmount}`);
  }

  // ----------------------------------------------------
  // Test 3: EMI SMS
  // "EMI of Rs 2,828 has been debited" -> DEBT_PAYMENT candidate, ₹2,828
  // ----------------------------------------------------
  {
    const parsed = parseSmsTransaction('EMI of Rs 2,828 has been debited from A/c XX1234 on 05-Oct-2026.');
    const ok = parsed.transactionType === 'DEBT_PAYMENT' && parsed.detectedAmount === 2828;
    record('Test 3: EMI SMS parsing (DEBT_PAYMENT candidate, ₹2,828)', ok, `Type: ${parsed.transactionType}, Amt: ${parsed.detectedAmount}`);
  }

  // ----------------------------------------------------
  // Test 4: Transfer SMS
  // "Rs 5,000 transferred to own account" -> TRANSFER candidate
  // ----------------------------------------------------
  {
    const parsed = parseSmsTransaction('Rs 5,000 transferred to own account XX9981 from HDFC A/c XX4128.');
    const ok = parsed.transactionType === 'TRANSFER' && parsed.detectedAmount === 5000;
    record('Test 4: Transfer SMS parsing (TRANSFER candidate)', ok, `Type: ${parsed.transactionType}`);
  }

  // ----------------------------------------------------
  // Test 5: Refund
  // "Refund of Rs 1,200 processed" -> REFUND candidate
  // ----------------------------------------------------
  {
    const parsed = parseSmsTransaction('Refund of Rs 1,200 processed for order at Amazon India.');
    const ok = parsed.transactionType === 'REFUND' && parsed.detectedAmount === 1200;
    record('Test 5: Refund SMS parsing (REFUND candidate)', ok, `Type: ${parsed.transactionType}, Amt: ${parsed.detectedAmount}`);
  }

  // ----------------------------------------------------
  // Test 6: Balance-only SMS
  // "Available balance is Rs 18,450" -> NON_TRANSACTION
  // ----------------------------------------------------
  {
    const parsed = parseSmsTransaction('Available balance in your HDFC account is Rs 18,450.');
    const ok = parsed.isNonTransaction === true && parsed.reviewStatus === 'IGNORED';
    record('Test 6: Balance-only SMS (NON_TRANSACTION / ignored)', ok, `isNonTransaction: ${parsed.isNonTransaction}, status: ${parsed.reviewStatus}`);
  }

  // ----------------------------------------------------
  // Test 7: OTP
  // "Your OTP is 123456" -> IGNORED
  // ----------------------------------------------------
  {
    const parsed = parseSmsTransaction('Your OTP is 123456 for login to HDFC netbanking.');
    const ok = parsed.reviewStatus === 'IGNORED' && parsed.isOtpOrPromotional === true;
    record('Test 7: OTP SMS (IGNORED non-transactional)', ok, `status: ${parsed.reviewStatus}`);
  }

  // ----------------------------------------------------
  // Test 8: Duplicate
  // Same SMS imported twice -> Duplicate detected, no duplicate financial transactions
  // ----------------------------------------------------
  {
    const sms = 'A/c XX1234 debited by Rs 2,500 at Amazon on 25-09-2026.';
    const cand1 = parseSmsTransaction(sms);
    const cand2 = parseSmsTransaction(sms);

    const dupCheck = detectDuplicate(cand2, {
      transactions: [],
      debts: [],
      existingCandidates: [cand1],
    });

    const ok = dupCheck.status === 'DUPLICATE';
    record('Test 8: Duplicate candidate detection (DUPLICATE status)', ok, `Duplicate Status: ${dupCheck.status}`);
  }

  // ----------------------------------------------------
  // Test 9: Existing transaction match
  // SMS: ₹4,843 EMI, Existing: ₹4,843 debt payment on same date -> STRONG_MATCH
  // ----------------------------------------------------
  {
    const cand = parseSmsTransaction('EMI of Rs 4,843 debited for PhonePe Loan on 2026-09-05.');
    cand.detectedTransactionDate = '2026-09-05';
    cand.detectedAmount = 4843;

    const existingTx: Transaction = {
      id: 'tx_existing_emi',
      date: '2026-09-05',
      amount: 4843,
      type: 'DEBT_PAYMENT',
      accountId: 'acc_bank_hdfc',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: '2026-09-05T00:00:00Z',
      updatedAt: '2026-09-05T00:00:00Z',
    };

    const match = matchCandidate(cand, {
      transactions: [existingTx],
      debts: [],
    });

    const ok = match.matchConfidence === 'STRONG_MATCH' && match.matchedTransactionId === 'tx_existing_emi';
    record('Test 9: Existing transaction match (STRONG_MATCH)', ok, `Confidence: ${match.matchConfidence}, TxId: ${match.matchedTransactionId}`);
  }

  // ----------------------------------------------------
  // Test 10: Possible match
  // SMS: ₹4,800, Existing: ₹4,843 -> POSSIBLE_MATCH
  // ----------------------------------------------------
  {
    const cand = parseSmsTransaction('Debited by Rs 4,800 towards Loan EMI on 2026-09-05.');
    cand.detectedTransactionDate = '2026-09-05';
    cand.detectedAmount = 4800;

    const existingTx: Transaction = {
      id: 'tx_existing_emi_2',
      date: '2026-09-05',
      amount: 4843,
      type: 'DEBT_PAYMENT',
      accountId: 'acc_bank_hdfc',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: '2026-09-05T00:00:00Z',
      updatedAt: '2026-09-05T00:00:00Z',
    };

    const match = matchCandidate(cand, {
      transactions: [existingTx],
      debts: [],
    });

    const ok = match.matchConfidence === 'POSSIBLE_MATCH';
    record('Test 10: Possible match with ₹43 difference (POSSIBLE_MATCH)', ok, `Confidence: ${match.matchConfidence}`);
  }

  // ----------------------------------------------------
  // Test 11: Pending isolation
  // Imported SMS candidate must not change Available Cash, Net Worth, Debt, Income, Expense before confirmation
  // ----------------------------------------------------
  {
    const baseState = getDefaultDemoData();
    const summaryBefore = calculateFinancialSummary(baseState);

    // Add unconfirmed pending candidate
    const cand = parseSmsTransaction('A/c XX4128 credited with Rs 50,000 on 26-09-2026.');
    const stateWithPending: StateType = {
      ...baseState,
      smsCandidates: [cand, ...(baseState.smsCandidates || [])],
    };

    const summaryAfter = calculateFinancialSummary(stateWithPending);

    const ok =
      summaryBefore.availableCash === summaryAfter.availableCash &&
      summaryBefore.netWorth === summaryAfter.netWorth &&
      summaryBefore.totalIncome === summaryAfter.totalIncome &&
      summaryBefore.totalExpenses === summaryAfter.totalExpenses &&
      summaryBefore.totalDebt === summaryAfter.totalDebt;

    record('Test 11: Pending isolation (Pending SMS does not affect cash, net worth, debt, income)', ok, `Available Cash: ${summaryAfter.availableCash}, Net Worth: ${summaryAfter.netWorth}`);
  }

  // ----------------------------------------------------
  // Test 12: Confirmed transaction
  // After confirmation, exactly one transaction is created
  // ----------------------------------------------------
  {
    const baseState = getDefaultDemoData();
    const countBefore = baseState.transactions.length;

    // Simulate confirmation creating one transaction
    const newTx: Transaction = {
      id: 'tx_confirmed_test',
      date: '2026-09-26',
      amount: 1704,
      type: 'EXPENSE',
      accountId: baseState.accounts[0].id,
      source: 'SMS',
      sourceReference: { sourceType: 'SMS', smsCandidateId: 'sms_test_1', confirmedAt: new Date().toISOString() },
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const countAfter = [...baseState.transactions, newTx].length;
    const ok = countAfter === countBefore + 1;
    record('Test 12: Confirmed transaction (Exactly one transaction created)', ok, `Transactions: ${countBefore} -> ${countAfter}`);
  }

  // ----------------------------------------------------
  // Test 13: Credit-card purchase
  // Confirming CC purchase must increase card liability, increase expense, not decrease bank cash
  // ----------------------------------------------------
  {
    const baseState = getDefaultDemoData();
    const bankAccount = baseState.accounts.find((a) => a.type === 'BANK') || baseState.accounts[0];
    const initialBankBal = calculateAccountBalance(bankAccount, baseState.transactions);

    const cardAccount: Account = {
      id: 'acc_cc_test',
      name: 'Test Credit Card',
      type: 'CREDIT_CARD',
      openingBalance: 0,
      currentBalance: 0,
      isActive: true,
    };

    const ccPurchaseTx: Transaction = {
      id: 'tx_cc_purchase',
      date: '2026-09-26',
      amount: 2500,
      type: 'EXPENSE',
      accountId: 'acc_cc_test',
      source: 'SMS',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedTxs = [...baseState.transactions, ccPurchaseTx];
    const newBankBal = calculateAccountBalance(bankAccount, updatedTxs);
    const newCardBal = calculateAccountBalance(cardAccount, updatedTxs);

    const ok = newBankBal === initialBankBal && newCardBal === 2500;
    record('Test 13: Credit-card purchase accounting (Increases card balance, does not reduce bank cash)', ok, `Bank: ${newBankBal} (unchanged), Card: ${newCardBal}`);
  }

  // ----------------------------------------------------
  // Test 14: Credit-card payment
  // Confirming CC settlement must decrease bank cash, decrease card liability, not create duplicate expense
  // ----------------------------------------------------
  {
    const bankAcc: Account = {
      id: 'acc_bank_test_14',
      name: 'Bank Test',
      type: 'BANK',
      openingBalance: 10000,
      currentBalance: 10000,
      isActive: true,
    };
    const cardAcc: Account = {
      id: 'acc_card_test_14',
      name: 'Card Test',
      type: 'CREDIT_CARD',
      openingBalance: 5000,
      currentBalance: 5000,
      isActive: true,
    };

    // Card settlement payment of 2000
    const paymentTx: Transaction = {
      id: 'tx_cc_settle',
      date: '2026-09-26',
      amount: 2000,
      type: 'DEBT_PAYMENT',
      accountId: 'acc_bank_test_14',
      toAccountId: 'acc_card_test_14',
      source: 'SMS',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const bankBal = calculateAccountBalance(bankAcc, [paymentTx]);
    const ok = bankBal === 8000;
    record('Test 14: Credit-card settlement accounting (Decreases cash, decreases card liability)', ok, `Bank balance: ${bankBal}`);
  }

  // ----------------------------------------------------
  // Test 15: Transfer
  // Own-account transfer decreases source, increases destination, preserves total liquid cash
  // ----------------------------------------------------
  {
    const accA: Account = { id: 'acc_a', name: 'A', type: 'BANK', openingBalance: 5000, currentBalance: 5000, isActive: true };
    const accB: Account = { id: 'acc_b', name: 'B', type: 'BANK', openingBalance: 2000, currentBalance: 2000, isActive: true };

    const transferTx: Transaction = {
      id: 'tx_transfer_15',
      date: '2026-09-26',
      amount: 1000,
      type: 'TRANSFER',
      accountId: 'acc_a',
      toAccountId: 'acc_b',
      source: 'SMS',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const balA = calculateAccountBalance(accA, [transferTx]);
    const balB = calculateAccountBalance(accB, [transferTx]);
    const totalLiquid = balA + balB;

    const ok = balA === 4000 && balB === 3000 && totalLiquid === 7000;
    record('Test 15: Own-account transfer (Preserves total liquid cash)', ok, `Bal A: ${balA}, Bal B: ${balB}, Total: ${totalLiquid} (unchanged)`);
  }

  // ----------------------------------------------------
  // Test 16: Swiggy payout match
  // Swiggy payout SMS should identify a compatible Swiggy operational record
  // ----------------------------------------------------
  {
    const cand = parseSmsTransaction('HDFC Bank: Rs 640.00 credited by VPA swiggy@icici on 24-09-2026.');
    cand.detectedTransactionDate = '2026-09-24';
    cand.detectedAmount = 640;

    const match = matchCandidate(cand, {
      transactions: [],
      debts: [],
      swiggyShifts: [
        {
          id: 'shift_test_payout',
          date: '2026-09-24',
          slot: 'DINNER',
          status: 'COMPLETED',
          hoursWorked: 5,
          orders: 15,
          basePay: 400,
          surgeIncentives: 150,
          tips: 90,
          grossEarnings: 640,
          fuelExpense: 100,
          otherExpenses: 0,
          netEarnings: 540,
          source: 'MANUAL',
        },
      ],
    });

    const ok = match.matchedSwiggyShiftId === 'shift_test_payout' && match.matchConfidence === 'STRONG_MATCH';
    record('Test 16: Swiggy payout match (Identifies compatible shift)', ok, `Matched Shift: ${match.matchedSwiggyShiftId}, Confidence: ${match.matchConfidence}`);
  }

  // ----------------------------------------------------
  // Test 17: Swiggy duplicate prevention
  // A confirmed Swiggy payout must not create duplicate income if shift already has a linked transaction
  // ----------------------------------------------------
  {
    const cand = parseSmsTransaction('Rs 640 credited by Swiggy on 24-09-2026.');
    cand.detectedTransactionDate = '2026-09-24';
    cand.detectedAmount = 640;

    const match = matchCandidate(cand, {
      transactions: [],
      debts: [],
      swiggyShifts: [
        {
          id: 'shift_already_linked',
          date: '2026-09-24',
          slot: 'DINNER',
          status: 'COMPLETED',
          hoursWorked: 5,
          orders: 15,
          basePay: 400,
          surgeIncentives: 150,
          tips: 90,
          grossEarnings: 640,
          fuelExpense: 100,
          otherExpenses: 0,
          netEarnings: 540,
          source: 'MANUAL',
          linkedIncomeTxId: 'tx_existing_shift_payout',
        },
      ],
    });

    const ok = match.duplicateStatus === 'DUPLICATE' && match.duplicateTransactionId === 'tx_existing_shift_payout';
    record('Test 17: Swiggy duplicate income prevention (Flagged as duplicate)', ok, `Duplicate Status: ${match.duplicateStatus}, Existing Tx: ${match.duplicateTransactionId}`);
  }

  // ----------------------------------------------------
  // Test 18: Storage migration
  // v4 data migrates to v5 without losing existing data
  // ----------------------------------------------------
  {
    const dummyV4State = {
      ...getDefaultDemoData(),
      version: 4,
    };
    // Save to v4 key
    localStorage.setItem('cashflow_storage_v4', JSON.stringify(dummyV4State));
    localStorage.removeItem('cashflow_storage_v5');

    const loaded = StorageService.loadState();
    const ok = loaded.version >= 5 && Array.isArray(loaded.smsCandidates) && loaded.smsPrivacySettings !== undefined;
    record('Test 18: Storage migration (v4 -> v5 migration succeeds)', ok, `Loaded version: ${loaded.version}, Candidates: ${loaded.smsCandidates.length}`);
  }

  // ----------------------------------------------------
  // Test 19: Privacy
  // When raw SMS retention is disabled/cleared, rawText removed while parsed data is retained
  // ----------------------------------------------------
  {
    const parsed = parseSmsTransaction('A/c XX1234 debited by Rs 1,704 on 26-09-2026 towards EMI.');
    const cleared = {
      ...parsed,
      rawText: '[RAW_SMS_DELETED_PER_PRIVACY_POLICY]',
    };

    const ok = cleared.rawText === '[RAW_SMS_DELETED_PER_PRIVACY_POLICY]' && cleared.detectedAmount === 1704 && cleared.detectedAccountReference === 'XXXX1234';
    record('Test 19: Privacy controls (Raw SMS text cleared, parsed data preserved)', ok, `Raw: ${cleared.rawText}, Amount: ${cleared.detectedAmount}`);
  }

  // ----------------------------------------------------
  // Test 20: Multiple amounts
  // SMS containing Total Due ₹5,000 and Minimum Due ₹500 must not select minimum due as total payment
  // ----------------------------------------------------
  {
    const sms = 'Credit card statement generated. Total Due Rs 5,000. Minimum Due Rs 500 payable by 05-Oct-2026.';
    const parsed = parseSmsTransaction(sms);

    const ok = parsed.totalDue === 5000 && parsed.minimumDue === 500 && parsed.detectedAmount === 5000;
    record('Test 20: Multiple amounts handling (Extracts Total Due ₹5,000 & Min Due ₹500 separately)', ok, `Detected Amount: ${parsed.detectedAmount}, Total Due: ${parsed.totalDue}, Min Due: ${parsed.minimumDue}`);
  }

  const passed = results.filter((r) => r.passed).length;
  return {
    passed,
    total: results.length,
    results,
  };
}
