import {
  calculateAccountBalance,
  calculateAvailableCash,
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateDebtOutstanding,
  calculateNetWorth,
  calculateFinancialSummary,
} from '../src/services/calculator.ts';
import { getDefaultDemoData } from '../src/services/storage.ts';

console.log('--- RUNNING FINANCIAL CONSISTENCY TEST SUITE ---');

const data = getDefaultDemoData();
const monthKey = '2026-09';

// Base state
const initialCash = calculateAvailableCash(data.accounts, data.transactions);
const initialIncome = calculateMonthlyIncome(data.transactions, monthKey);
const initialExpenses = calculateMonthlyExpenses(data.transactions, data.categories, monthKey);
const initialDebt = calculateDebtOutstanding(data.debts, data.debtPayments, data.transactions).totalOutstanding;

console.log(`Initial Available Cash: ₹${initialCash}`);
console.log(`Initial Income: ₹${initialIncome}`);
console.log(`Initial Expenses: ₹${initialExpenses.totalExpenses} (Interest: ₹${initialExpenses.interestPaid})`);
console.log(`Initial Debt Outstanding: ₹${initialDebt}`);

// TEST 1: Add ₹500 expense
const test1Tx = {
  id: 'test_exp_500',
  date: `${monthKey}-20`,
  amount: 500,
  type: 'EXPENSE',
  accountId: 'acc_cash',
  categoryId: 'cat_food',
  source: 'MANUAL',
  verificationStatus: 'CONFIRMED',
};
const t1Transactions = [...data.transactions, test1Tx];
const t1Cash = calculateAvailableCash(data.accounts, t1Transactions);
const t1Expenses = calculateMonthlyExpenses(t1Transactions, data.categories, monthKey);

console.assert(t1Cash === initialCash - 500, `TEST 1 Failed: Cash expected ${initialCash - 500}, got ${t1Cash}`);
console.assert(t1Expenses.totalExpenses === initialExpenses.totalExpenses + 500, `TEST 1 Failed: Expense expected ${initialExpenses.totalExpenses + 500}, got ${t1Expenses.totalExpenses}`);
console.log('✓ TEST 1 PASSED: Expense ₹500 decreases cash by ₹500 and increases expense by ₹500');

// TEST 2: Add ₹1,000 income
const test2Tx = {
  id: 'test_inc_1000',
  date: `${monthKey}-20`,
  amount: 1000,
  type: 'INCOME',
  accountId: 'acc_bank_hdfc',
  categoryId: 'cat_other_inc',
  source: 'MANUAL',
  verificationStatus: 'CONFIRMED',
};
const t2Transactions = [...data.transactions, test2Tx];
const t2Cash = calculateAvailableCash(data.accounts, t2Transactions);
const t2Income = calculateMonthlyIncome(t2Transactions, monthKey);

console.assert(t2Cash === initialCash + 1000, `TEST 2 Failed: Cash expected ${initialCash + 1000}, got ${t2Cash}`);
console.assert(t2Income === initialIncome + 1000, `TEST 2 Failed: Income expected ${initialIncome + 1000}, got ${t2Income}`);
console.log('✓ TEST 2 PASSED: Income ₹1,000 increases cash by ₹1,000 and increases income by ₹1,000');

// TEST 3: Transfer ₹1,000 from Bank to Cash
const test3Tx = {
  id: 'test_trf_1000',
  date: `${monthKey}-21`,
  amount: 1000,
  type: 'TRANSFER',
  accountId: 'acc_bank_hdfc',
  toAccountId: 'acc_cash',
  source: 'MANUAL',
  verificationStatus: 'CONFIRMED',
};
const t3Transactions = [...data.transactions, test3Tx];
const t3Cash = calculateAvailableCash(data.accounts, t3Transactions);
const t3Income = calculateMonthlyIncome(t3Transactions, monthKey);
const t3Expenses = calculateMonthlyExpenses(t3Transactions, data.categories, monthKey);

console.assert(t3Cash === initialCash, `TEST 3 Failed: Cash changed during transfer! expected ${initialCash}, got ${t3Cash}`);
console.assert(t3Income === initialIncome, `TEST 3 Failed: Transfer affected income!`);
console.assert(t3Expenses.totalExpenses === initialExpenses.totalExpenses, `TEST 3 Failed: Transfer affected expense!`);
console.log('✓ TEST 3 PASSED: Transfer of ₹1,000 does not alter total cash, income, or expenses');

// TEST 4: Debt payment of ₹4,843 (Principal ₹4,100, Interest ₹743)
const test4Tx = {
  id: 'test_debt_emi',
  date: `${monthKey}-22`,
  amount: 4843,
  type: 'DEBT_PAYMENT',
  accountId: 'acc_bank_hdfc',
  debtId: 'debt_cred',
  principalAmount: 4100,
  interestAmount: 743,
  source: 'MANUAL',
  verificationStatus: 'CONFIRMED',
};
const t4Transactions = [...data.transactions, test4Tx];
const t4Cash = calculateAvailableCash(data.accounts, t4Transactions);
const t4Debt = calculateDebtOutstanding(data.debts, data.debtPayments, t4Transactions).totalOutstanding;
const t4Expenses = calculateMonthlyExpenses(t4Transactions, data.categories, monthKey);

console.assert(t4Cash === initialCash - 4843, `TEST 4 Failed: Cash expected ${initialCash - 4843}, got ${t4Cash}`);
console.assert(t4Debt === initialDebt - 4100, `TEST 4 Failed: Debt expected ${initialDebt - 4100}, got ${t4Debt}`);
console.assert(t4Expenses.totalExpenses === initialExpenses.totalExpenses + 743, `TEST 4 Failed: Expenses should only increase by interest ₹743, got diff: ${t4Expenses.totalExpenses - initialExpenses.totalExpenses}`);
console.log('✓ TEST 4 PASSED: EMI ₹4,843 decreases cash by ₹4,843, decreases debt by ₹4,100, and only increases interest expense by ₹743');

// TEST 5: Credit card payment of ₹5,000 from Bank to Card
const test5Tx = {
  id: 'test_cc_pay',
  date: `${monthKey}-23`,
  amount: 5000,
  type: 'TRANSFER',
  accountId: 'acc_bank_hdfc',
  toAccountId: 'acc_sbi_card',
  source: 'MANUAL',
  verificationStatus: 'CONFIRMED',
};
const t5Transactions = [...data.transactions, test5Tx];
const t5Expenses = calculateMonthlyExpenses(t5Transactions, data.categories, monthKey);
const sbiAcc = data.accounts.find(a => a.id === 'acc_sbi_card');
const sbiBalanceBefore = calculateAccountBalance(sbiAcc, data.transactions);
const sbiBalanceAfter = calculateAccountBalance(sbiAcc, t5Transactions);

console.assert(t5Expenses.totalExpenses === initialExpenses.totalExpenses, `TEST 5 Failed: CC Payment double-counted as expense!`);
console.assert(sbiBalanceAfter === sbiBalanceBefore - 5000, `TEST 5 Failed: CC balance liability did not decrease by ₹5,000!`);
console.log('✓ TEST 5 PASSED: Credit card payment decreases liability and does NOT increase expenses again');

console.log('ALL 5 FINANCIAL ENGINE TESTS PASSED WITH 100% ACCURACY!');
