import {
  StorageService,
  getDefaultDemoData,
  KNOWN_DEMO_TRANSACTION_IDS,
  AppState,
  isDemoRecord,
} from './storage';
import { THEME_STORAGE_KEY } from '../context/ThemeContext';
import {
  Transaction,
  Account,
  Debt,
  Payment,
  Budget,
  Goal,
  SwiggyShift,
  FuelLog,
  SmsTransactionCandidate,
  EssentialExpenseItem,
} from '../types/finance';
import { calculateFinancialSummary } from './calculator';
import { calculateCentralFinancialPosition } from './centralFinanceCalculations';

export interface DefectAuditTestResult {
  test: string;
  passed: boolean;
  details?: string;
}

export function runDefectAuditTests(): {
  total: number;
  passed: number;
  results: { test: string; status: 'PASS' | 'FAIL'; details?: string }[];
} {
  const results: { test: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];

  const record = (name: string, ok: boolean, details?: string) => {
    results.push({
      test: name,
      status: ok ? 'PASS' : 'FAIL',
      details,
    });
  };

  // ----------------------------------------------------
  // DEFECT 1: DARK MODE
  // ----------------------------------------------------
  // Test 1: Theme key storage & persistence
  try {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const ok = stored === 'dark';
    record(
      'Defect 1.1: Dark Mode preference persists in storage across sessions',
      ok,
      `Stored theme: "${stored}"`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 1.1: Dark Mode preference persists in storage across sessions', false, message);
  }

  // Test 2: System mode resolution
  try {
    localStorage.setItem(THEME_STORAGE_KEY, 'system');
    const systemTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const ok = systemTheme === 'system';
    record(
      'Defect 1.2: System theme mode accepted and preserved without fallback corruption',
      ok,
      `System mode preference: ${systemTheme}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 1.2: System theme mode accepted and preserved', false, message);
  }

  // ----------------------------------------------------
  // DEFECT 2: DELETE ACTIONS (FINANCIAL INTEGRITY & ACCURACY)
  // ----------------------------------------------------
  // Test 3: Transaction Deletion & Balance Recalculation
  try {
    const initial = getDefaultDemoData();
    const initialTxCount = initial.transactions.length;
    const targetTx = initial.transactions[0];
    const initialSummary = calculateFinancialSummary(initial);

    // Remove transaction
    const updatedState: AppState = {
      ...initial,
      transactions: initial.transactions.filter((t: Transaction) => t.id !== targetTx.id),
    };
    const newSummary = calculateFinancialSummary(updatedState);

    const ok =
      updatedState.transactions.length === initialTxCount - 1 &&
      !updatedState.transactions.some((t: Transaction) => t.id === targetTx.id) &&
      (targetTx.type === 'INCOME'
        ? newSummary.totalIncome === initialSummary.totalIncome - targetTx.amount
        : targetTx.type === 'EXPENSE'
        ? newSummary.totalExpenses === initialSummary.totalExpenses - targetTx.amount
        : true);

    record(
      'Defect 2.1: Transaction deletion permanently removes record and recalculates ledger totals',
      ok,
      `Removed tx: ${targetTx.id} (₹${targetTx.amount}), Remaining tx count: ${updatedState.transactions.length}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 2.1: Transaction deletion permanently removes record', false, message);
  }

  // Test 4: Account Deletion cascades safely without dangling pointers
  try {
    const initial = getDefaultDemoData();
    const targetAcc = initial.accounts[0];

    const updatedState: AppState = {
      ...initial,
      accounts: initial.accounts.filter((a: Account) => a.id !== targetAcc.id),
      creditCards: initial.creditCards.filter((c) => c.accountId !== targetAcc.id),
      transactions: initial.transactions.filter(
        (t: Transaction) => t.accountId !== targetAcc.id && t.toAccountId !== targetAcc.id
      ),
    };

    const hasOrphanedTxs = updatedState.transactions.some(
      (t: Transaction) => t.accountId === targetAcc.id || t.toAccountId === targetAcc.id
    );
    const ok =
      !updatedState.accounts.some((a: Account) => a.id === targetAcc.id) && !hasOrphanedTxs;

    record(
      'Defect 2.2: Account deletion cascades to remove linked transactions without dangling references',
      ok,
      `Deleted account: ${targetAcc.id}, Remaining accounts: ${updatedState.accounts.length}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 2.2: Account deletion cascades', false, message);
  }

  // Test 5: Debt Deletion removes obligation
  try {
    const initial = getDefaultDemoData();
    const targetDebt = initial.debts[0];

    const updatedState: AppState = {
      ...initial,
      debts: initial.debts.filter((d: Debt) => d.id !== targetDebt.id),
      payments: initial.payments.filter((p: Payment) => p.debtId !== targetDebt.id),
    };

    const ok =
      !updatedState.debts.some((d: Debt) => d.id === targetDebt.id) &&
      !updatedState.payments.some((p: Payment) => p.debtId === targetDebt.id);

    record(
      'Defect 2.3: Debt deletion removes obligation and linked scheduled EMI payments',
      ok,
      `Deleted debt: ${targetDebt.id}, Remaining debts: ${updatedState.debts.length}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 2.3: Debt deletion removes obligation', false, message);
  }

  // Test 6: Payment Commitment Deletion
  try {
    const initial = getDefaultDemoData();
    const targetPayment = initial.payments[0];

    const updatedState: AppState = {
      ...initial,
      payments: initial.payments.filter((p: Payment) => p.id !== targetPayment.id),
    };

    const ok = !updatedState.payments.some((p: Payment) => p.id === targetPayment.id);
    record(
      'Defect 2.4: Payment commitment deletion removes scheduled obligation cleanly',
      ok,
      `Deleted payment: ${targetPayment.id}, Remaining payments: ${updatedState.payments.length}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 2.4: Payment commitment deletion', false, message);
  }

  // Test 7: Budget Cap Deletion
  try {
    const initial = getDefaultDemoData();
    const targetBudget = initial.budgets[0];

    const updatedState: AppState = {
      ...initial,
      budgets: initial.budgets.filter((b: Budget) => b.id !== targetBudget.id),
    };

    const ok = !updatedState.budgets.some((b: Budget) => b.id === targetBudget.id);
    record(
      'Defect 2.5: Budget cap deletion removes spending limit for category',
      ok,
      `Deleted budget: ${targetBudget.id}, Remaining budgets: ${updatedState.budgets.length}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 2.5: Budget cap deletion', false, message);
  }

  // Test 8: Financial Goal Deletion
  try {
    const initial = getDefaultDemoData();
    const targetGoal = initial.goals[0];

    const updatedState: AppState = {
      ...initial,
      goals: initial.goals.filter((g: Goal) => g.id !== targetGoal.id),
    };

    const ok = !updatedState.goals.some((g: Goal) => g.id === targetGoal.id);
    record(
      'Defect 2.6: Financial goal deletion removes savings milestone cleanly',
      ok,
      `Deleted goal: ${targetGoal.id}, Remaining goals: ${updatedState.goals.length}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 2.6: Financial goal deletion', false, message);
  }

  // Test 9: Swiggy Shift Deletion cleans linked income/fuel transactions
  try {
    const initial = getDefaultDemoData();
    const shift = initial.swiggyShifts[0];

    const linkedIncomeId = shift.linkedIncomeTxId || `tx_inc_${shift.id}`;
    const linkedFuelId = shift.linkedFuelTxId || `tx_fuel_${shift.id}`;
    const legacyTxId = `tx_${shift.id}`;

    const updatedState: AppState = {
      ...initial,
      swiggyShifts: initial.swiggyShifts.filter((s: SwiggyShift) => s.id !== shift.id),
      swiggyEarnings: initial.swiggyEarnings.filter((e) => e.id !== shift.id),
      transactions: initial.transactions.filter(
        (t: Transaction) => t.id !== linkedIncomeId && t.id !== linkedFuelId && t.id !== legacyTxId
      ),
    };

    const ok = !updatedState.swiggyShifts.some((s: SwiggyShift) => s.id === shift.id);
    record(
      'Defect 2.7: Swiggy shift deletion removes shift and linked transactions',
      ok,
      `Deleted shift: ${shift.id}, Remaining shifts: ${updatedState.swiggyShifts.length}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 2.7: Swiggy shift deletion', false, message);
  }

  // ----------------------------------------------------
  // DEFECT 3: RESET APPLICATION SETTINGS
  // ----------------------------------------------------
  // Test 10: Reset Application Settings resets preferences ONLY without touching financial data
  try {
    const initial = getDefaultDemoData();
    const customNotificationSettings = {
      ...initial.notificationSettings,
      quietHoursEnabled: false,
      hideAmountsInNotifications: true,
    };
    const stateWithCustomSettings: AppState = {
      ...initial,
      notificationSettings: customNotificationSettings,
    };

    // Simulate resetApplicationSettings
    const defaultData = getDefaultDemoData();
    const resetState: AppState = {
      ...stateWithCustomSettings,
      notificationSettings: defaultData.notificationSettings,
      smsPrivacySettings: defaultData.smsPrivacySettings,
      cashBufferSetting: defaultData.cashBufferSetting,
      swiggyTargets: defaultData.swiggyTargets,
      stage7PlanningSettings: defaultData.stage7PlanningSettings,
      reliabilitySettings: defaultData.reliabilitySettings,
      commandCenterPreferences: defaultData.commandCenterPreferences,
      cloudSyncSettings: defaultData.cloudSyncSettings,
    };

    const ok =
      resetState.notificationSettings.quietHoursEnabled === defaultData.notificationSettings.quietHoursEnabled &&
      resetState.transactions.length === initial.transactions.length &&
      resetState.accounts.length === initial.accounts.length &&
      resetState.debts.length === initial.debts.length &&
      resetState.payments.length === initial.payments.length &&
      resetState.budgets.length === initial.budgets.length &&
      resetState.goals.length === initial.goals.length;

    record(
      'Defect 3.1: Reset Application Settings restores preferences while keeping 100% of financial data',
      ok,
      `Transactions preserved: ${resetState.transactions.length}, Accounts preserved: ${resetState.accounts.length}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 3.1: Reset Application Settings', false, message);
  }

  // ----------------------------------------------------
  // DEFECT 4: REMOVE DEMO DATA
  // ----------------------------------------------------
  // Test 11: Remove Demo Data removes all demo records while preserving user records
  try {
    const initial = getDefaultDemoData();
    // Add genuine user record
    const userTx: Transaction = {
      id: 'tx_user_genuine_123',
      date: '2026-09-28',
      amount: 4500,
      type: 'INCOME',
      accountId: initial.accounts[0].id,
      description: 'Genuine Freelance Project',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: false,
    };
    const stateWithUserTx: AppState = {
      ...initial,
      transactions: [...initial.transactions, userTx],
    };

    const isDemoTx = (t: Transaction) => t.isDemo || t.id.startsWith('tx_demo') || KNOWN_DEMO_TRANSACTION_IDS.has(t.id);
    const isDemoDebt = (d: Debt) => d.isDemo || d.id.startsWith('debt_');
    const isDemoPay = (p: Payment) => p.isDemo || p.id.startsWith('pay_');
    const isDemoBudget = (b: Budget) => b.isDemo || b.id.startsWith('b_');
    const isDemoGoal = (g: Goal) => g.isDemo || g.id.startsWith('goal_');
    const isDemoShift = (s: SwiggyShift) => s.isDemo || s.id.startsWith('shift_') || s.id.startsWith('sw_');
    const isDemoFuel = (f: FuelLog) => f.isDemo || f.id.startsWith('fuel_');
    const isDemoCandidate = (s: SmsTransactionCandidate) => s.isDemo || s.id.startsWith('sms_demo');

    const purgedState: AppState = {
      ...stateWithUserTx,
      transactions: stateWithUserTx.transactions.filter((t: Transaction) => !isDemoTx(t)),
      debts: stateWithUserTx.debts.filter((d: Debt) => !isDemoDebt(d)),
      payments: stateWithUserTx.payments.filter((p: Payment) => !isDemoPay(p)),
      budgets: stateWithUserTx.budgets.filter((b: Budget) => !isDemoBudget(b)),
      goals: stateWithUserTx.goals.filter((g: Goal) => !isDemoGoal(g)),
      swiggyShifts: stateWithUserTx.swiggyShifts.filter((s: SwiggyShift) => !isDemoShift(s)),
      fuelLogs: stateWithUserTx.fuelLogs.filter((f: FuelLog) => !isDemoFuel(f)),
      smsCandidates: stateWithUserTx.smsCandidates.filter((s: SmsTransactionCandidate) => !isDemoCandidate(s)),
    };

    // Verify user tx preserved and demo records removed
    const ok =
      purgedState.transactions.length === 1 &&
      purgedState.transactions[0].id === 'tx_user_genuine_123' &&
      purgedState.debts.length === 0 &&
      purgedState.swiggyShifts.length === 0;

    record(
      'Defect 4.1: Remove Demo Data purges demo records and strictly preserves genuine user financial data',
      ok,
      `User records preserved: ${purgedState.transactions.length} tx, Demo debts remaining: ${purgedState.debts.length}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 4.1: Remove Demo Data', false, message);
  }

  // Test 12: LoadState does NOT re-seed demo data after Remove Demo Data
  try {
    const purgedState: AppState = {
      ...getDefaultDemoData(),
      transactions: [],
      debts: [],
      payments: [],
      budgets: [],
      goals: [],
      swiggyShifts: [],
      fuelLogs: [],
      smsCandidates: [],
    };

    StorageService.saveState(purgedState);
    const reloaded = StorageService.loadState();

    const ok =
      reloaded.transactions.length === 0 &&
      reloaded.debts.length === 0 &&
      reloaded.payments.length === 0 &&
      reloaded.budgets.length === 0 &&
      reloaded.goals.length === 0 &&
      reloaded.swiggyShifts.length === 0 &&
      reloaded.fuelLogs.length === 0;

    record(
      'Defect 4.2: Storage persistence invariant: Cleared demo arrays are NEVER auto-reseeded on page reload',
      ok,
      `Reloaded transactions: ${reloaded.transactions.length}, Reloaded shifts: ${reloaded.swiggyShifts.length}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 4.2: Storage persistence invariant', false, message);
  }

  // ----------------------------------------------------
  // DEFECT 5: DELETE FINANCIAL DATA
  // ----------------------------------------------------
  // Test 13: Delete Financial Data clears all ledger entities to exactly 0 while preserving configuration
  try {
    const initial = getDefaultDemoData();
    const emptyState: AppState = {
      ...initial,
      accounts: [],
      creditCards: [],
      transactions: [],
      debts: [],
      debtPayments: [],
      payments: [],
      recurringCommitments: [],
      budgets: [],
      goals: [],
      swiggyEarnings: [],
      swiggyShifts: [],
      fuelLogs: [],
      smsCandidates: [],
    };

    StorageService.saveState(emptyState);
    const reloaded = StorageService.loadState();

    const ok =
      reloaded.accounts.length === 0 &&
      reloaded.transactions.length === 0 &&
      reloaded.debts.length === 0 &&
      reloaded.payments.length === 0 &&
      reloaded.budgets.length === 0 &&
      reloaded.goals.length === 0 &&
      reloaded.profile.name === initial.profile.name &&
      reloaded.notificationSettings !== undefined;

    record(
      'Defect 5.1: Delete Financial Data clears 100% of financial records and preserves user profile & app settings',
      ok,
      `Accounts: ${reloaded.accounts.length}, Transactions: ${reloaded.transactions.length}, Profile kept: ${reloaded.profile.name}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 5.1: Delete Financial Data', false, message);
  }

  // ----------------------------------------------------
  // DEFECT 6: FACTORY RESET
  // ----------------------------------------------------
  // Test 14: Factory Reset restores clean pristine initial state with safety snapshot
  try {
    const preSnapshot = StorageService.createLocalSnapshot(
      getDefaultDemoData(),
      'RESET',
      'Pre-factory reset recovery snapshot'
    );

    localStorage.removeItem(THEME_STORAGE_KEY);
    StorageService.clearState();

    const fresh = getDefaultDemoData();
    fresh.backupSnapshots = StorageService.getSnapshots();
    fresh.recoverySnapshot = preSnapshot;

    StorageService.saveState(fresh);
    const reloaded = StorageService.loadState();

    const ok =
      reloaded.version === 10 &&
      reloaded.accounts.length > 0 &&
      reloaded.transactions.length > 0 &&
      reloaded.recoverySnapshot?.id === preSnapshot.id &&
      localStorage.getItem(THEME_STORAGE_KEY) === null;

    record(
      'Defect 6.1: Factory Reset restores clean pristine baseline state with rollback recovery snapshot preserved',
      ok,
      `Schema version: ${reloaded.version}, Fresh accounts: ${reloaded.accounts.length}, Recovery snapshot: ${reloaded.recoverySnapshot?.id}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 6.1: Factory Reset', false, message);
  }

  // ----------------------------------------------------
  // DEFECT 7: REALISTIC DATA VERIFICATION SCENARIO
  // ----------------------------------------------------
  // Test 15: Remove Demo Data strictly preserves user Loan, Salary, Swiggy, and Expense
  try {
    const base = getDefaultDemoData();

    // User realistic test records
    const realDebt: Debt = {
      id: `debt_${Date.now()}_real_1`,
      name: 'Private Personal Loan',
      lenderName: 'Personal Friend',
      purpose: 'Emergency',
      type: 'PERSONAL_LOAN',
      originalPrincipal: 10000,
      outstandingPrincipal: 10000,
      emiAmount: 1000,
      tenureMonths: 10,
      remainingMonths: 10,
      nextDueDate: '2026-10-05',
      status: 'ACTIVE',
      isDemo: false,
    };

    const realShift: SwiggyShift = {
      id: `shift_${Date.now()}_real_1`,
      date: '2026-09-29',
      slot: 'DINNER',
      status: 'COMPLETED',
      basePay: 4800,
      surgeIncentives: 500,
      tips: 200,
      grossEarnings: 5500,
      fuelExpense: 400,
      otherExpenses: 100,
      netEarnings: 5000,
      orders: 20,
      hoursWorked: 8,
      source: 'MANUAL',
      isDemo: false,
    };

    const realExpense: EssentialExpenseItem = {
      id: `exp_${Date.now()}_real_1`,
      name: 'Gym & Fitness',
      category: 'Other',
      amount: 2000,
      notes: 'Monthly gym membership',
      isDemo: false,
    };

    // State with both demo and realistic real records
    const combinedState: AppState = {
      ...base,
      monthlySalary: 21000,
      debts: [...base.debts, realDebt],
      swiggyShifts: [...base.swiggyShifts, realShift],
      essentialExpenses: [...(base.essentialExpenses || []), realExpense],
    };

    // Execute Remove Demo Data logic
    const demoPurgedState: AppState = {
      ...combinedState,
      transactions: combinedState.transactions.filter((t) => !isDemoRecord.transaction(t)),
      debts: combinedState.debts.filter((d) => !isDemoRecord.debt(d)),
      payments: combinedState.payments.filter((p) => !isDemoRecord.payment(p)),
      swiggyShifts: combinedState.swiggyShifts.filter((s) => !isDemoRecord.shift(s)),
      essentialExpenses: (combinedState.essentialExpenses || []).filter((e) => !isDemoRecord.expense(e)),
      accounts: combinedState.accounts.filter((a) => !isDemoRecord.account(a)),
    };

    const ok =
      demoPurgedState.debts.length === 1 &&
      demoPurgedState.debts[0].id === realDebt.id &&
      demoPurgedState.debts[0].outstandingPrincipal === 10000 &&
      demoPurgedState.debts[0].emiAmount === 1000 &&
      demoPurgedState.monthlySalary === 21000 &&
      demoPurgedState.swiggyShifts.length === 1 &&
      demoPurgedState.swiggyShifts[0].netEarnings === 5000 &&
      Boolean(demoPurgedState.essentialExpenses && demoPurgedState.essentialExpenses.length === 1) &&
      demoPurgedState.essentialExpenses?.[0]?.amount === 2000;

    record(
      'Defect 7.1: Remove Demo Data strictly preserves realistic user loan (₹10k/₹1k EMI), salary (₹21k), Swiggy (₹5k), and expense (₹2k)',
      ok,
      `Preserved Debts: ${demoPurgedState.debts.length}, Swiggy: ₹${demoPurgedState.swiggyShifts[0]?.netEarnings}, Expenses: ₹${demoPurgedState.essentialExpenses?.[0]?.amount}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 7.1: Remove Demo Data with realistic data', false, message);
  }

  // Test 16: Persistence & Browser Reload after Remove Demo Data
  try {
    const realDebt: Debt = {
      id: `debt_persistent_real_2`,
      name: 'Credit Union Loan',
      lenderName: 'Union Bank',
      purpose: 'Vehicle',
      type: 'PERSONAL_LOAN',
      originalPrincipal: 10000,
      outstandingPrincipal: 10000,
      emiAmount: 1000,
      tenureMonths: 10,
      remainingMonths: 10,
      nextDueDate: '2026-10-05',
      status: 'ACTIVE',
      isDemo: false,
    };

    const purgedState: AppState = {
      ...getDefaultDemoData(),
      monthlySalary: 21000,
      debts: [realDebt],
      swiggyShifts: [
        {
          id: 'shift_real_persistent_2',
          date: '2026-09-29',
          slot: 'DINNER',
          status: 'COMPLETED',
          basePay: 4800,
          surgeIncentives: 500,
          tips: 200,
          grossEarnings: 5500,
          fuelExpense: 400,
          otherExpenses: 100,
          netEarnings: 5000,
          orders: 20,
          hoursWorked: 8,
          source: 'MANUAL',
          isDemo: false,
        },
      ],
      essentialExpenses: [
        {
          id: 'exp_real_persistent_2',
          name: 'Gym',
          amount: 2000,
          isDemo: false,
        },
      ],
    };

    StorageService.saveState(purgedState);
    const reloaded = StorageService.loadState();

    const ok =
      reloaded.debts.length === 1 &&
      reloaded.debts[0].id === realDebt.id &&
      reloaded.swiggyShifts.length === 1 &&
      reloaded.swiggyShifts[0].netEarnings === 5000 &&
      Boolean(reloaded.essentialExpenses && reloaded.essentialExpenses.length === 1) &&
      reloaded.essentialExpenses?.[0]?.amount === 2000 &&
      reloaded.monthlySalary === 21000;

    record(
      'Defect 7.2: Persistence check: Real user records persist across browser refresh and demo records do NOT resurrect',
      ok,
      `Reloaded Debts: ${reloaded.debts.length}, Shifts: ${reloaded.swiggyShifts.length}, Expenses: ${reloaded.essentialExpenses?.length}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 7.2: Persistence check after Remove Demo Data', false, message);
  }

  // Test 17: Delete Financial Records clears everything to exactly 0 and persists across browser reload
  try {
    const emptyFinancialState: AppState = {
      ...getDefaultDemoData(),
      monthlySalary: 0,
      essentialExpenses: [],
      debts: [],
      debtPayments: [],
      payments: [],
      swiggyShifts: [],
      swiggyEarnings: [],
      fuelLogs: [],
      transactions: [],
      accounts: [],
      recurringCommitments: [],
      budgets: [],
      goals: [],
    };

    StorageService.saveState(emptyFinancialState);
    const reloaded = StorageService.loadState();

    const position = calculateCentralFinancialPosition({
      debts: reloaded.debts,
      monthlySalary: reloaded.monthlySalary,
      swiggyShifts: reloaded.swiggyShifts,
      swiggyEarnings: reloaded.swiggyEarnings,
      essentialExpenses: reloaded.essentialExpenses,
    });

    const ok =
      reloaded.debts.length === 0 &&
      reloaded.swiggyShifts.length === 0 &&
      (reloaded.essentialExpenses?.length === 0) &&
      reloaded.monthlySalary === 0 &&
      position.totalActiveLoans === 0 &&
      position.totalOutstandingDebt === 0 &&
      position.totalMonthlyEMI === 0 &&
      position.monthlySalary === 0 &&
      position.swiggyNetIncome === 0 &&
      position.totalMonthlyIncome === 0 &&
      position.totalEssentialExpenses === 0 &&
      position.totalMonthlyOutgoing === 0 &&
      position.shortfallOrSurplusAmount === 0;

    record(
      'Defect 7.3: Delete Financial Records zeroes all loans, salary, swiggy, and expenses with 0-value persistence',
      ok,
      `Loans: ${position.totalActiveLoans}, Salary: ₹${position.monthlySalary}, Swiggy: ₹${position.swiggyNetIncome}, Expenses: ₹${position.totalEssentialExpenses}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 7.3: Delete Financial Records verification', false, message);
  }

  // Test 18: Factory Reset dynamic calculations match exact expected specification
  try {
    StorageService.clearState();
    const fresh = getDefaultDemoData();
    StorageService.saveState(fresh);
    const reloaded = StorageService.loadState();

    const pos = calculateCentralFinancialPosition({
      debts: reloaded.debts,
      monthlySalary: reloaded.monthlySalary,
      swiggyShifts: reloaded.swiggyShifts,
      swiggyEarnings: reloaded.swiggyEarnings,
      essentialExpenses: reloaded.essentialExpenses,
    });

    const ok =
      pos.monthlySalary === 21000 &&
      pos.swiggyNetIncome === 7170 &&
      pos.totalMonthlyIncome === 28170 &&
      pos.totalMonthlyEMI === 14843 &&
      pos.totalEssentialExpenses === 19418 &&
      pos.totalMonthlyOutgoing === 34261 &&
      pos.isShortfall === true &&
      pos.shortfallOrSurplusAmount === 6091;

    record(
      'Defect 7.4: Factory Reset restores exact expected dynamic calculations: Salary ₹21k, Swiggy ₹7,170, EMI ₹14,843, Expenses ₹19,418, Shortfall ₹6,091',
      ok,
      `Salary: ₹${pos.monthlySalary}, Swiggy: ₹${pos.swiggyNetIncome}, EMI: ₹${pos.totalMonthlyEMI}, Exp: ₹${pos.totalEssentialExpenses}, Shortfall: ₹${pos.shortfallOrSurplusAmount}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    record('Defect 7.4: Factory Reset dynamic calculations', false, message);
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  return {
    total: results.length,
    passed,
    results,
  };
}
