import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Account,
  Budget,
  Category,
  CategorySpendingSummary,
  CreditCard,
  Debt,
  DebtPayment,
  FinancialSummary,
  Goal,
  Payment,
  PaymentStatus,
  RecurringCommitment,
  SwiggyEarning,
  SwiggyShift,
  FuelLog,
  SwiggyOperationalTargets,
  SwiggyOperationalSummary,
  SwiggyShiftSlot,
  Transaction,
  UserProfile,
  CashFlowMonthPoint,
  DebtObligationSummary,
  CashFlowPlan,
  CashBufferSetting,
  CashFlowForecast,
  ForecastPoint,
  CashPressurePeriod,
  FinancialInsight,
  BudgetForecastItem,
  SmsTransactionCandidate,
  SmsPrivacySettings,
  SmsCandidateType,
  FinancialNotification,
  NotificationSettings,
  NotificationSchedulerState,
  AdvancedFinancialSummary,
  DataQualityReport,
  DebtProjectionResult,
  GoalProjectionResult,
  FinancialMilestone,
  FinancialExplanation,
  SavedScenario,
  Stage7PlanningSettings,
  IntegrityIssue,
  DuplicateCandidate,
  BackupSnapshot,
  SnapshotReason,
  AuditEvent,
  AppError,
  AppDiagnostics,
  CommandCenterPreferences,
  BackupPayload,
  EssentialExpenseItem,
} from '../types/finance';
import {
  CentralFinancialPosition,
  calculateCentralFinancialPosition,
  resolveLoanPurpose,
} from '../services/centralFinanceCalculations';
import { AppState, StorageService, KNOWN_DEMO_TRANSACTION_IDS, getDefaultDemoData, isDemoRecord } from '../services/storage';
import { runDataIntegrityCheck, repairSafeStructuralIssues } from '../services/dataIntegrity';
import { findDuplicateTransactions } from '../services/duplicateDetector';
import { createBackupPayload, validateAndPreviewBackup } from '../services/backupService';
import { RecoveryService } from '../services/recoveryService';
import {
  OverallSyncStatus,
  SyncConflict,
  ConflictResolution,
  CloudBackupRecord,
  DeviceRecord,
} from '../types/sync';
import { globalSyncEngine } from '../services/syncEngine';
import { enqueueSyncMutation, getPendingQueueCount, clearCompletedAndFailedQueue } from '../services/syncQueue';
import { loadStoredConflicts, resolveSyncConflict, saveStoredConflicts } from '../services/conflictResolver';
import { CloudRepository } from '../services/cloudRepository';
import { getLocalKnownDevices, setDeviceFriendlyName } from '../services/deviceService';
import { THEME_STORAGE_KEY } from './ThemeContext';

import { createAuditEvent, appendAuditEventWithRetention } from '../services/auditService';
import { buildAppDiagnostics, logAppError } from '../services/diagnosticsService';

import {
  calculateAdvancedFinancialSummary,
  calculateDataQualityReport,
  generateFinancialMilestones,
} from '../services/advancedFinancialIntelligence';
import { calculateDebtProjections } from '../services/debtProjectionEngine';
import { calculateGoalProjections } from '../services/goalPlanningEngine';
import { explainMetric } from '../services/financialExplanation';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../services/notificationEngine';
import {
  evaluateAndScheduleNotifications,
  triggerBrowserNotificationIfEligible,
} from '../services/reminderScheduler';
import {
  calculateAccountBalance,
  calculateCategorySpending,
  calculateDebtOutstanding,
  calculateFinancialSummary,
  calculateCashFlowHistory,
  calculateDebtObligations,
  calculateCashFlowPlan,
  calculateSwiggyOperationalMetrics,
  normalizeSwiggyShift,
} from '../services/calculator';
import {
  calculateCashFlowForecast,
  calculateDailyCashForecast,
  calculateCashPressureAnalysis,
  calculateNextExpectedIncome,
  calculateBudgetForecasts,
  calculateUpcomingCashCommitments,
  generateFinancialInsights,
} from '../services/financialIntelligence';
import { getCurrentDateISO } from '../utils/dates';
import { parseIndianBankSMS } from '../services/smsMatchingEngine';

interface AccountWithBalance extends Account {
  computedBalance: number;
}

interface DebtWithDetails extends Debt {
  currentOutstanding: number;
  percentPaid: number;
}

interface FinanceContextType {
  state: AppState;
  summary: FinancialSummary;
  accountsWithBalances: AccountWithBalance[];
  debtsWithDetails: DebtWithDetails[];
  centralPosition: CentralFinancialPosition;
  monthlySalary: number;
  updateSalary: (amount: number) => void;
  essentialExpenses: EssentialExpenseItem[];
  addEssentialExpense: (expense: Omit<EssentialExpenseItem, 'id'>) => void;
  updateEssentialExpense: (expense: EssentialExpenseItem) => void;
  deleteEssentialExpense: (id: string) => void;
  categorySpending: CategorySpendingSummary[];
  cashFlowHistory: CashFlowMonthPoint[];
  debtObligations: DebtObligationSummary;
  cashFlowPlan: CashFlowPlan;
  
  // Stage 3 Financial Intelligence
  forecast30Days: CashFlowForecast;
  cashPressure: CashPressurePeriod;
  financialInsights: FinancialInsight[];
  budgetForecasts: BudgetForecastItem[];
  dailyForecastPoints: ForecastPoint[];
  nextExpectedIncome: { date: string; amount: number; source: string; daysUntil: number } | null;
  upcomingCommitments: {
    next7Days: Payment[];
    next14Days: Payment[];
    next30Days: Payment[];
    totalNext7Days: number;
    totalNext14Days: number;
    totalNext30Days: number;
  };
  updateCashBufferSetting: (setting: CashBufferSetting) => void;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;

  addAccount: (acc: Omit<Account, 'id' | 'currentBalance'>) => void;
  updateAccount: (acc: Account) => void;
  deleteAccount: (id: string) => void;

  addDebt: (debt: Omit<Debt, 'id' | 'outstandingPrincipal'>) => void;
  updateDebt: (debt: Debt) => void;
  deleteDebt: (id: string) => void;
  recordDebtPayment: (params: {
    debtId: string;
    accountId: string;
    amount: number;
    principalAmount: number;
    interestAmount: number;
    feesAmount?: number;
    date: string;
    notes?: string;
  }) => void;

  addPayment: (payment: Omit<Payment, 'id'>) => void;
  updatePaymentStatus: (id: string, status: PaymentStatus) => void;
  deletePayment: (id: string) => void;
  payAndSettlePayment: (params: {
    paymentId: string;
    accountId: string;
    amount: number;
    date: string;
    principalAmount?: number;
    interestAmount?: number;
    notes?: string;
  }) => void;

  reconcileAccountBalance: (params: {
    accountId: string;
    statementBalance: number;
    statementDate: string;
    adjustmentAmount?: number;
    notes?: string;
  }) => void;

  addBudget: (budget: Omit<Budget, 'id'>) => void;
  updateBudget: (budget: Budget) => void;
  deleteBudget: (id: string) => void;

  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (id: string) => void;

  addSwiggyEarning: (earning: Omit<SwiggyEarning, 'id'>) => void;

  // Swiggy Operational Engine
  swiggyOperations: SwiggyOperationalSummary;
  addSwiggyShift: (shift: Omit<SwiggyShift, 'id'>) => void;
  updateSwiggyShift: (shift: SwiggyShift) => void;
  deleteSwiggyShift: (id: string) => void;
  planSwiggyShift: (date: string, slot: SwiggyShiftSlot, targetOrders: number, notes?: string) => void;
  addFuelLog: (log: Omit<FuelLog, 'id'>, accountId?: string) => void;
  deleteFuelLog: (id: string) => void;
  updateSwiggyTargets: (targets: Partial<SwiggyOperationalTargets>) => void;

  // SMS Detection & Shift Linking Engine
  linkShiftToTransaction: (shiftId: string, txId: string, linkType: 'INCOME' | 'FUEL') => void;
  unlinkShiftTransaction: (shiftId: string, linkType: 'INCOME' | 'FUEL') => void;
  confirmSmsAndLinkShift: (txId: string, shiftId: string, linkType?: 'INCOME' | 'FUEL') => void;
  detectAndIngestSms: (rawSms: string, targetAccountId?: string) => { success: boolean; transaction?: Transaction; error?: string };

  // Stage 5 SMS Transaction Detection, Review & Matching
  smsCandidates: SmsTransactionCandidate[];
  smsPrivacySettings: SmsPrivacySettings;
  addSmsCandidate: (candidate: SmsTransactionCandidate) => void;
  addSmsCandidates: (candidates: SmsTransactionCandidate[]) => void;
  updateSmsCandidate: (candidate: SmsTransactionCandidate) => void;
  confirmSmsTransaction: (
    candidateId: string,
    overrides?: {
      amount?: number;
      date?: string;
      type?: SmsCandidateType;
      accountId?: string;
      toAccountId?: string;
      categoryId?: string;
      debtId?: string;
      description?: string;
      notes?: string;
      principalAmount?: number;
      interestAmount?: number;
      feesAmount?: number;
      matchedShiftId?: string;
    }
  ) => { success: boolean; transactionId?: string; error?: string };
  rejectSmsCandidate: (candidateId: string, reviewNotes?: string) => void;
  ignoreSmsCandidate: (candidateId: string) => void;
  linkSmsCandidate: (
    candidateId: string,
    targetTxId?: string,
    targetShiftId?: string,
    targetDebtId?: string
  ) => void;
  markSmsDuplicate: (candidateId: string, duplicateOfTxId?: string) => void;
  clearSmsRawText: (candidateId?: string) => void;
  deleteSmsCandidate: (candidateId: string) => void;
  updateSmsPrivacySettings: (settings: Partial<SmsPrivacySettings>) => void;

  // Stage 6 Notifications, Reminders & Financial Automation
  notifications: FinancialNotification[];
  notificationSettings: NotificationSettings;
  unreadNotificationCount: number;
  urgentNotificationCount: number;
  addNotification: (notification: FinancialNotification) => void;
  markNotificationRead: (id: string) => void;
  markNotificationUnread: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  actionNotification: (id: string) => void;
  clearReadNotifications: () => void;
  clearAllNotifications: () => void;
  deleteNotification: (id: string) => void;
  evaluateNotifications: () => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  requestBrowserNotificationPermission: () => Promise<NotificationPermission | 'unsupported'>;

  // Stage 7 Advanced Financial Intelligence, Debt-Free & Command Center
  advancedSummary: AdvancedFinancialSummary;
  dataQualityReport: DataQualityReport;
  debtProjections: DebtProjectionResult;
  goalProjections: GoalProjectionResult[];
  financialMilestones: FinancialMilestone[];
  stage7PlanningSettings: Stage7PlanningSettings;
  updatePlanningSettings: (settings: Partial<Stage7PlanningSettings>) => void;
  saveScenario: (scenario: SavedScenario) => void;
  deleteScenario: (scenarioId: string) => void;
  explainFinancialMetric: (metricKey: string) => FinancialExplanation;

  // Stage 8 Production Hardening, Recovery, Audit & UX
  auditEvents: AuditEvent[];
  backupSnapshots: BackupSnapshot[];
  integrityIssues: IntegrityIssue[];
  duplicateCandidates: DuplicateCandidate[];
  appDiagnostics: AppDiagnostics;
  errorLogs: AppError[];
  commandCenterPreferences: CommandCenterPreferences;
  recoverySnapshot: BackupSnapshot | null;

  createBackup: () => { payload: BackupPayload; jsonString: string; filename: string };
  restoreBackup: (jsonString: string) => { success: boolean; error?: string };
  createSnapshot: (reason: SnapshotReason, description?: string) => BackupSnapshot;
  restoreSnapshot: (id: string) => boolean;
  deleteSnapshot: (id: string) => void;
  undoAuditEvent: (event: AuditEvent) => { success: boolean; error?: string };
  reverseTransaction: (txId: string, reason: string) => { success: boolean; error?: string };
  correctDebtPayment: (paymentId: string, reason: string) => { success: boolean; error?: string };
  runIntegrityScan: () => { issues: IntegrityIssue[]; status: 'Healthy' | 'Needs Review' | 'Recovery Available' };
  autoRepairStructuralIssues: () => { count: number; descriptions: string[] };
  resolveDuplicate: (candidateId: string, action: 'KEEP_EXISTING' | 'KEEP_INCOMING' | 'KEEP_BOTH' | 'MARK_DUPLICATE') => void;
  updateCommandCenterPreferences: (prefs: Partial<CommandCenterPreferences>) => void;
  clearErrorLogs: () => void;
  dismissRecoverySnapshot: () => void;
  safeDeleteFinancialData: () => Promise<{ success: boolean; error?: string }>;
  factoryReset: () => Promise<{ success: boolean; error?: string }>;
  removeDemoData: () => Promise<{ success: boolean; error?: string }>;
  resetApplicationSettings: () => void;

  updateProfile: (profile: Partial<UserProfile>) => void;
  resetDemoData: () => void;
  exportData: () => string;
  importData: (jsonStr: string) => boolean;

  // Stage 9 Cloud Sync & Multi-Device
  syncStatus: OverallSyncStatus;
  syncConflicts: SyncConflict[];
  pendingSyncCount: number;
  triggerSyncNow: () => Promise<{ success: boolean; syncedItemsCount: number; conflictsDetected: number; error?: string }>;
  resolveConflictAction: (conflictId: string, resolution: ConflictResolution) => void;
  createCloudBackupAction: (note?: string) => Promise<{ success: boolean; backup?: CloudBackupRecord; error?: string }>;
  listCloudBackupsAction: () => Promise<CloudBackupRecord[]>;
  restoreCloudBackupAction: (backupId: string) => Promise<{ success: boolean; error?: string }>;
  deleteCloudDataAction: () => Promise<{ success: boolean; error?: string }>;
  getKnownDevicesList: () => DeviceRecord[];
  updateDeviceFriendlyNameAction: (name: string) => void;
}


const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => StorageService.loadState());

  // Save changes to storage
  useEffect(() => {
    StorageService.saveState(state);
  }, [state]);

  // Derived financial computations using the central calculation engine
  const summary = useMemo(() => {
    return calculateFinancialSummary(state);
  }, [state]);

  const accountsWithBalances = useMemo(() => {
    return state.accounts.map((acc) => ({
      ...acc,
      computedBalance: calculateAccountBalance(acc, state.transactions),
    }));
  }, [state.accounts, state.transactions]);

  const debtsWithDetails = useMemo(() => {
    const { debtsWithOutstanding } = calculateDebtOutstanding(
      state.debts,
      state.debtPayments,
      state.transactions
    );
    return debtsWithOutstanding;
  }, [state.debts, state.debtPayments, state.transactions]);

  const monthlySalary = state.monthlySalary ?? 21000;
  const essentialExpenses = state.essentialExpenses ?? [];

  const centralPosition = useMemo(() => {
    return calculateCentralFinancialPosition({
      debts: debtsWithDetails,
      monthlySalary,
      swiggyShifts: state.swiggyShifts,
      swiggyEarnings: state.swiggyEarnings,
      essentialExpenses,
    });
  }, [debtsWithDetails, monthlySalary, state.swiggyShifts, state.swiggyEarnings, essentialExpenses]);

  const updateSalary = (amount: number) => {
    const valid = Math.max(0, Number(amount) || 0);
    setState((prev) => ({
      ...prev,
      monthlySalary: valid,
    }));
  };

  const addEssentialExpense = (exp: Omit<EssentialExpenseItem, 'id'>) => {
    const id = `exp_${Date.now()}`;
    const newExp: EssentialExpenseItem = {
      ...exp,
      id,
    };
    setState((prev) => ({
      ...prev,
      essentialExpenses: [...(prev.essentialExpenses || []), newExp],
    }));
  };

  const updateEssentialExpense = (exp: EssentialExpenseItem) => {
    setState((prev) => ({
      ...prev,
      essentialExpenses: (prev.essentialExpenses || []).map((e) => (e.id === exp.id ? exp : e)),
    }));
  };

  const deleteEssentialExpense = (id: string) => {
    setState((prev) => ({
      ...prev,
      essentialExpenses: (prev.essentialExpenses || []).filter((e) => e.id !== id),
    }));
  };

  const categorySpending = useMemo(() => {
    return calculateCategorySpending(
      state.transactions,
      state.categories,
      state.budgets
    );
  }, [state.transactions, state.categories, state.budgets]);

  const cashFlowHistory = useMemo(() => {
    return calculateCashFlowHistory(state.transactions, 6);
  }, [state.transactions]);

  const debtObligations = useMemo(() => {
    return calculateDebtObligations(
      state.debts,
      state.creditCards,
      state.accounts,
      state.transactions,
      state.payments,
      summary.totalIncome
    );
  }, [state.debts, state.creditCards, state.accounts, state.transactions, state.payments, summary.totalIncome]);

  const cashFlowPlan = useMemo(() => {
    return calculateCashFlowPlan(
      summary.totalIncome,
      debtObligations.totalMonthlyObligations,
      summary.essentialExpenses
    );
  }, [summary.totalIncome, debtObligations.totalMonthlyObligations, summary.essentialExpenses]);

  // Stage 3 Financial Intelligence Computations
  const forecast30Days = useMemo(() => {
    return calculateCashFlowForecast(state, 30);
  }, [state]);

  const cashPressure = useMemo(() => {
    return calculateCashPressureAnalysis(
      state,
      state.cashBufferSetting?.enabled ? state.cashBufferSetting.minimumCashBuffer : 0
    );
  }, [state]);

  const budgetForecasts = useMemo(() => {
    return calculateBudgetForecasts(state);
  }, [state]);

  const dailyForecastPoints = useMemo(() => {
    return calculateDailyCashForecast(state, 30);
  }, [state]);

  const nextExpectedIncome = useMemo(() => {
    return calculateNextExpectedIncome(state);
  }, [state]);

  const upcomingCommitments = useMemo(() => {
    return calculateUpcomingCashCommitments(state.payments);
  }, [state.payments]);

  const financialInsights = useMemo(() => {
    return generateFinancialInsights(state, summary, forecast30Days, cashPressure, budgetForecasts);
  }, [state, summary, forecast30Days, cashPressure, budgetForecasts]);

  // Swiggy Operational Engine Summary Computation
  const swiggyOperations = useMemo(() => {
    return calculateSwiggyOperationalMetrics(
      state.swiggyShifts || (state.swiggyEarnings || []).map(normalizeSwiggyShift),
      state.fuelLogs || [],
      state.swiggyTargets || {
        dailyEarningsTarget: 700,
        dailyOrdersTarget: 15,
        monthlyEarningsTarget: 18000,
        monthlyShiftsTarget: 26,
      }
    );
  }, [state.swiggyShifts, state.swiggyEarnings, state.fuelLogs, state.swiggyTargets]);

  // Stage 7 Advanced Financial Intelligence Computations
  const advancedSummary = useMemo(() => {
    return calculateAdvancedFinancialSummary(state);
  }, [state]);

  const dataQualityReport = useMemo(() => {
    return calculateDataQualityReport(state);
  }, [state]);

  const debtProjections = useMemo(() => {
    const strat = state.stage7PlanningSettings?.preferredDebtStrategy || 'STANDARD';
    return calculateDebtProjections(state.debts, state.debtPayments, 0, strat);
  }, [state.debts, state.debtPayments, state.stage7PlanningSettings]);

  const goalProjections = useMemo(() => {
    return calculateGoalProjections(
      state.goals,
      advancedSummary.monthlySurplus,
      advancedSummary.essentialMonthlyBurnRate
    );
  }, [state.goals, advancedSummary.monthlySurplus, advancedSummary.essentialMonthlyBurnRate]);

  const financialMilestones = useMemo(() => {
    return generateFinancialMilestones(state);
  }, [state]);

  const stage7PlanningSettings = useMemo<Stage7PlanningSettings>(() => {
    return (
      state.stage7PlanningSettings || {
        preferredDebtStrategy: 'STANDARD' as const,
        targetEmergencyMonths: 3,
        savedScenarios: [],
      }
    );
  }, [state.stage7PlanningSettings]);

  const updatePlanningSettings = (settingsUpdate: Partial<Stage7PlanningSettings>) => {
    setState((prev) => ({
      ...prev,
      stage7PlanningSettings: {
        ...(prev.stage7PlanningSettings || {
          preferredDebtStrategy: 'STANDARD',
          targetEmergencyMonths: 3,
          savedScenarios: [],
        }),
        ...settingsUpdate,
      },
    }));
  };

  const saveScenario = (scenario: SavedScenario) => {
    setState((prev) => {
      const currentSettings = prev.stage7PlanningSettings || {
        preferredDebtStrategy: 'STANDARD',
        targetEmergencyMonths: 3,
        savedScenarios: [],
      };
      const existing = currentSettings.savedScenarios || [];
      const updated = existing.some((s) => s.id === scenario.id)
        ? existing.map((s) => (s.id === scenario.id ? scenario : s))
        : [...existing, scenario];

      return {
        ...prev,
        stage7PlanningSettings: {
          ...currentSettings,
          savedScenarios: updated,
        },
      };
    });
  };

  const deleteScenario = (scenarioId: string) => {
    setState((prev) => {
      const currentSettings = prev.stage7PlanningSettings || {
        preferredDebtStrategy: 'STANDARD',
        targetEmergencyMonths: 3,
        savedScenarios: [],
      };
      return {
        ...prev,
        stage7PlanningSettings: {
          ...currentSettings,
          savedScenarios: (currentSettings.savedScenarios || []).filter((s) => s.id !== scenarioId),
        },
      };
    });
  };

  const explainFinancialMetric = (metricKey: string) => {
    return explainMetric(metricKey, state);
  };

  const updateCashBufferSetting = (setting: CashBufferSetting) => {
    setState((prev) => ({
      ...prev,
      cashBufferSetting: setting,
    }));
  };

  // Actions
  const addTransaction = (txData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTx: Transaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };

    const auditEv = createAuditEvent(
      'CREATE',
      'Transaction',
      newTx.id,
      `Added ${newTx.type} transaction: ₹${newTx.amount} (${newTx.description || 'No description'})`,
      { after: newTx, source: newTx.source, canUndo: true }
    );

    enqueueSyncMutation('TRANSACTION', newTx.id, 'CREATE', newTx);

    setState((prev) => {

      // Auto mark matching payments as PAID
      let updatedPayments = prev.payments;
      if (txData.type === 'DEBT_PAYMENT' && txData.debtId) {
        updatedPayments = prev.payments.map((p) =>
          p.debtId === txData.debtId && (p.status === 'UPCOMING' || p.status === 'OVERDUE')
            ? { ...p, status: 'PAID' }
            : p
        );
      } else if (txData.description) {
        const descLower = txData.description.toLowerCase();
        updatedPayments = prev.payments.map((p) => {
          if (
            (p.status === 'UPCOMING' || p.status === 'OVERDUE') &&
            descLower.includes(p.title.toLowerCase())
          ) {
            return { ...p, status: 'PAID' };
          }
          return p;
        });
      }

      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
        payments: updatedPayments,
        auditEvents: appendAuditEventWithRetention(
          prev.auditEvents,
          auditEv,
          prev.reliabilitySettings?.auditRetentionDays ?? 365
        ),
      };
    });
  };

  const updateTransaction = (tx: Transaction) => {
    const now = new Date().toISOString();
    enqueueSyncMutation('TRANSACTION', tx.id, 'UPDATE', { ...tx, updatedAt: now });

    setState((prev) => {
      const existing = prev.transactions.find((item) => item.id === tx.id);
      const auditEv = createAuditEvent(
        'UPDATE',
        'Transaction',
        tx.id,
        `Updated transaction: ₹${tx.amount} (${tx.description || tx.id})`,
        { before: existing, after: tx, source: tx.source, canUndo: true }
      );
      return {
        ...prev,
        transactions: prev.transactions.map((item) =>
          item.id === tx.id ? { ...tx, updatedAt: now } : item
        ),
        auditEvents: appendAuditEventWithRetention(
          prev.auditEvents,
          auditEv,
          prev.reliabilitySettings?.auditRetentionDays ?? 365
        ),
      };
    });
  };

  const deleteTransaction = (id: string) => {
    enqueueSyncMutation('TRANSACTION', id, 'DELETE', { id });

    setState((prev) => {

      const existing = prev.transactions.find((tx) => tx.id === id);
      const auditEv = createAuditEvent(
        'DELETE',
        'Transaction',
        id,
        `Deleted transaction: ₹${existing?.amount || 0} (${existing?.description || id})`,
        { before: existing, canUndo: true }
      );
      return {
        ...prev,
        transactions: prev.transactions.filter((tx) => tx.id !== id),
        auditEvents: appendAuditEventWithRetention(
          prev.auditEvents,
          auditEv,
          prev.reliabilitySettings?.auditRetentionDays ?? 365
        ),
      };
    });
  };

  const addAccount = (accData: Omit<Account, 'id' | 'currentBalance'>) => {
    const id = `acc_${Date.now()}`;
    const newAccount: Account = {
      ...accData,
      id,
      currentBalance: accData.openingBalance,
    };
    enqueueSyncMutation('ACCOUNT', newAccount.id, 'CREATE', newAccount);
    setState((prev) => ({
      ...prev,
      accounts: [...prev.accounts, newAccount],
    }));
  };

  const updateAccount = (acc: Account) => {
    enqueueSyncMutation('ACCOUNT', acc.id, 'UPDATE', acc);
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === acc.id ? acc : a)),
    }));
  };

  const deleteAccount = (id: string) => {
    enqueueSyncMutation('ACCOUNT', id, 'DELETE', { id });
    setState((prev) => {
      const existing = prev.accounts.find((a) => a.id === id);
      const auditEv = createAuditEvent(
        'DELETE',
        'Account',
        id,
        `Deleted account: ${existing?.name || id}`,
        { before: existing, canUndo: true }
      );
      return {
        ...prev,
        accounts: prev.accounts.filter((a) => a.id !== id),
        creditCards: prev.creditCards.filter((c) => c.accountId !== id),
        transactions: prev.transactions.filter((tx) => tx.accountId !== id && tx.toAccountId !== id),
        auditEvents: appendAuditEventWithRetention(
          prev.auditEvents,
          auditEv,
          prev.reliabilitySettings?.auditRetentionDays ?? 365
        ),
      };
    });
  };

  const addDebt = (debtData: Omit<Debt, 'id' | 'outstandingPrincipal'>) => {
    const id = `debt_${Date.now()}`;
    const newDebt: Debt = {
      ...debtData,
      id,
      outstandingPrincipal: debtData.originalPrincipal,
    };
    enqueueSyncMutation('DEBT', newDebt.id, 'CREATE', newDebt);
    setState((prev) => ({
      ...prev,
      debts: [...prev.debts, newDebt],
    }));
  };

  const updateDebt = (debt: Debt) => {
    enqueueSyncMutation('DEBT', debt.id, 'UPDATE', debt);
    setState((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => (d.id === debt.id ? debt : d)),
    }));
  };

  const deleteDebt = (id: string) => {
    enqueueSyncMutation('DEBT', id, 'DELETE', { id });
    setState((prev) => {
      const existing = prev.debts.find((d) => d.id === id);
      const auditEv = createAuditEvent(
        'DELETE',
        'Debt',
        id,
        `Deleted debt obligation: ${existing?.name || id}`,
        { before: existing, canUndo: true }
      );
      return {
        ...prev,
        debts: prev.debts.filter((d) => d.id !== id),
        debtPayments: prev.debtPayments.filter((dp) => dp.debtId !== id),
        payments: prev.payments.filter((p) => p.debtId !== id),
        auditEvents: appendAuditEventWithRetention(
          prev.auditEvents,
          auditEv,
          prev.reliabilitySettings?.auditRetentionDays ?? 365
        ),
      };
    });
  };


  const recordDebtPayment = (params: {
    debtId: string;
    accountId: string;
    amount: number;
    principalAmount: number;
    interestAmount: number;
    feesAmount?: number;
    date: string;
    notes?: string;
  }) => {
    const debt = state.debts.find((d) => d.id === params.debtId);
    const now = new Date().toISOString();
    const txId = `tx_debt_${Date.now()}`;

    // 1. Create debt payment transaction
    const newTx: Transaction = {
      id: txId,
      date: params.date,
      amount: params.amount,
      type: 'DEBT_PAYMENT',
      accountId: params.accountId,
      debtId: params.debtId,
      principalAmount: params.principalAmount,
      interestAmount: params.interestAmount,
      feesAmount: params.feesAmount || 0,
      description: `${debt?.name || 'Loan'} EMI Payment`,
      notes: params.notes || `Principal ₹${params.principalAmount} + Interest ₹${params.interestAmount}`,
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: now,
      updatedAt: now,
    };

    // 2. Create debt payment ledger record
    const newDebtPayment: DebtPayment = {
      id: `dp_${Date.now()}`,
      debtId: params.debtId,
      transactionId: txId,
      amount: params.amount,
      principalAmount: params.principalAmount,
      interestAmount: params.interestAmount,
      feesAmount: params.feesAmount || 0,
      paymentDate: params.date,
    };

    setState((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
      debtPayments: [...prev.debtPayments, newDebtPayment],
      // If linked to an upcoming payment, mark it paid
      payments: prev.payments.map((p) =>
        p.debtId === params.debtId && p.status === 'UPCOMING'
          ? { ...p, status: 'PAID' }
          : p
      ),
    }));
  };

  const addPayment = (paymentData: Omit<Payment, 'id'>) => {
    const newPayment: Payment = {
      ...paymentData,
      id: `pay_${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      payments: [newPayment, ...prev.payments],
    }));
  };

  const updatePaymentStatus = (id: string, status: PaymentStatus) => {
    setState((prev) => ({
      ...prev,
      payments: prev.payments.map((p) => (p.id === id ? { ...p, status } : p)),
    }));
  };

  const deletePayment = (id: string) => {
    enqueueSyncMutation('PAYMENT', id, 'DELETE', { id });
    setState((prev) => {
      const existing = prev.payments.find((p) => p.id === id);
      const auditEv = createAuditEvent(
        'DELETE',
        'Payment',
        id,
        `Deleted payment obligation: ${existing?.title || id}`,
        { before: existing, canUndo: true }
      );
      return {
        ...prev,
        payments: prev.payments.filter((p) => p.id !== id),
        auditEvents: appendAuditEventWithRetention(
          prev.auditEvents,
          auditEv,
          prev.reliabilitySettings?.auditRetentionDays ?? 365
        ),
      };
    });
  };

  const payAndSettlePayment = (params: {
    paymentId: string;
    accountId: string;
    amount: number;
    date: string;
    principalAmount?: number;
    interestAmount?: number;
    notes?: string;
  }) => {
    const payment = state.payments.find((p) => p.id === params.paymentId);
    if (!payment) return;

    if (payment.debtId) {
      // It's a loan or debt obligation
      recordDebtPayment({
        debtId: payment.debtId,
        accountId: params.accountId,
        amount: params.amount,
        principalAmount: params.principalAmount !== undefined ? params.principalAmount : Math.round(params.amount * 0.8),
        interestAmount: params.interestAmount !== undefined ? params.interestAmount : Math.round(params.amount * 0.2),
        date: params.date,
        notes: params.notes || `Settlement of ${payment.title}`,
      });
      updatePaymentStatus(payment.id, 'PAID');
    } else {
      // It's an expense commitment (rent, utility, subscription, etc.)
      const cat = state.categories.find((c) =>
        payment.type === 'RENT'
          ? c.name.toLowerCase().includes('housing') || c.name.toLowerCase().includes('rent')
          : payment.type === 'UTILITY'
          ? c.name.toLowerCase().includes('utilit') || c.name.toLowerCase().includes('bill')
          : payment.type === 'SUBSCRIPTION'
          ? c.name.toLowerCase().includes('entertain') || c.name.toLowerCase().includes('subscript')
          : c.type === 'EXPENSE'
      );

      addTransaction({
        date: params.date,
        amount: params.amount,
        type: 'EXPENSE',
        accountId: params.accountId,
        categoryId: cat?.id || state.categories.find((c) => c.type === 'EXPENSE')?.id,
        description: payment.title,
        notes: params.notes || `Recurring payment settlement`,
        source: 'MANUAL',
        verificationStatus: 'CONFIRMED',
      });
      updatePaymentStatus(payment.id, 'PAID');
    }
  };

  const reconcileAccountBalance = (params: {
    accountId: string;
    statementBalance: number;
    statementDate: string;
    adjustmentAmount?: number;
    notes?: string;
  }) => {
    const acc = state.accounts.find((a) => a.id === params.accountId);
    if (!acc) return;

    if (params.adjustmentAmount && params.adjustmentAmount !== 0) {
      addTransaction({
        date: params.statementDate,
        amount: Math.abs(params.adjustmentAmount),
        type: 'ADJUSTMENT',
        accountId: params.accountId,
        description: `Balance Reconciliation Adjustment (${params.adjustmentAmount > 0 ? '+' : ''}₹${params.adjustmentAmount.toLocaleString('en-IN')})`,
        notes: params.notes || `Reconciliation discrepancy adjusted for bank statement on ${params.statementDate}`,
        source: 'ADJUSTMENT',
        verificationStatus: 'CONFIRMED',
      });
    }

    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === params.accountId
          ? {
              ...a,
              lastReconciledDate: params.statementDate,
              lastReconciledBalance: params.statementBalance,
            }
          : a
      ),
    }));
  };

  const addBudget = (budgetData: Omit<Budget, 'id'>) => {
    const newBudget: Budget = {
      ...budgetData,
      id: `b_${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      budgets: [...prev.budgets, newBudget],
    }));
  };

  const updateBudget = (budget: Budget) => {
    setState((prev) => ({
      ...prev,
      budgets: prev.budgets.map((b) => (b.id === budget.id ? budget : b)),
    }));
  };

  const deleteBudget = (id: string) => {
    setState((prev) => {
      const existing = prev.budgets.find((b) => b.id === id);
      const auditEv = createAuditEvent(
        'DELETE',
        'Budget',
        id,
        `Deleted budget: ${id}`,
        { before: existing, canUndo: true }
      );
      return {
        ...prev,
        budgets: prev.budgets.filter((b) => b.id !== id),
        auditEvents: appendAuditEventWithRetention(
          prev.auditEvents,
          auditEv,
          prev.reliabilitySettings?.auditRetentionDays ?? 365
        ),
      };
    });
  };

  const addGoal = (goalData: Omit<Goal, 'id'>) => {
    const newGoal: Goal = {
      ...goalData,
      id: `goal_${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      goals: [...prev.goals, newGoal],
    }));
  };

  const updateGoal = (goal: Goal) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === goal.id ? goal : g)),
    }));
  };

  const deleteGoal = (id: string) => {
    setState((prev) => {
      const existing = prev.goals.find((g) => g.id === id);
      const auditEv = createAuditEvent(
        'DELETE',
        'Goal',
        id,
        `Deleted financial goal: ${existing?.name || id}`,
        { before: existing, canUndo: true }
      );
      return {
        ...prev,
        goals: prev.goals.filter((g) => g.id !== id),
        auditEvents: appendAuditEventWithRetention(
          prev.auditEvents,
          auditEv,
          prev.reliabilitySettings?.auditRetentionDays ?? 365
        ),
      };
    });
  };

  const addSwiggyEarning = (earningData: Omit<SwiggyEarning, 'id'>) => {
    const now = new Date().toISOString();
    const earningId = `sw_${Date.now()}`;
    const newEarning: SwiggyEarning = {
      ...earningData,
      id: earningId,
    };

    // Also prompt or automatically record a linked Income transaction if bank account exists
    const bankAccount = state.accounts.find((a) => a.type === 'BANK' && a.isActive);
    const swiggyCategory = state.categories.find((c) => c.name.toLowerCase().includes('swiggy'));

    const linkedTx: Transaction = {
      id: `tx_${earningId}`,
      date: earningData.date,
      amount: earningData.amount,
      type: 'INCOME',
      accountId: bankAccount ? bankAccount.id : state.accounts[0].id,
      categoryId: swiggyCategory?.id || 'cat_swiggy_inc',
      description: `Swiggy Shift (${earningData.orders || 0} orders)`,
      notes: earningData.notes || 'Daily Swiggy delivery earning',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: now,
      updatedAt: now,
    };

    const normalized = normalizeSwiggyShift(newEarning);

    setState((prev) => ({
      ...prev,
      swiggyEarnings: [newEarning, ...prev.swiggyEarnings],
      swiggyShifts: [normalized, ...(prev.swiggyShifts || [])],
      transactions: [linkedTx, ...prev.transactions],
    }));
  };

  // Swiggy Operational Engine Actions
  const addSwiggyShift = (shiftData: Omit<SwiggyShift, 'id'>) => {
    const now = new Date().toISOString();
    const shiftId = `shift_${Date.now()}`;
    const normalized = normalizeSwiggyShift({
      ...shiftData,
      id: shiftId,
    });

    const newTransactions: Transaction[] = [];

    if (normalized.status === 'COMPLETED' && normalized.grossEarnings > 0) {
      const bankAccount = (state.accounts || []).find((a) => a.type === 'BANK' && a.isActive) || (state.accounts || [])[0];
      const swiggyCategory = (state.categories || []).find((c) => c.name.toLowerCase().includes('swiggy')) || (state.categories || [])[0];
      const incomeTxId = `tx_inc_${shiftId}`;
      normalized.linkedIncomeTxId = incomeTxId;

      newTransactions.push({
        id: incomeTxId,
        date: normalized.date,
        amount: normalized.grossEarnings,
        type: 'INCOME',
        accountId: bankAccount?.id || (state.accounts && state.accounts[0]?.id) || 'acc_default',
        categoryId: swiggyCategory?.id || 'cat_swiggy_inc',
        description: `Swiggy Delivery: ${normalized.slot} (${normalized.orders} orders)`,
        notes: `Base ₹${normalized.basePay} + Surge ₹${normalized.surgeIncentives} + Tips ₹${normalized.tips}. ${normalized.notes || ''}`.trim(),
        source: 'MANUAL',
        verificationStatus: 'CONFIRMED',
        createdAt: now,
        updatedAt: now,
      });

      if (normalized.fuelExpense > 0) {
        const cashAccount = (state.accounts || []).find((a) => a.type === 'CASH' && a.isActive) || bankAccount;
        const fuelCategory = (state.categories || []).find((c) => c.id === 'cat_fuel' || c.name.toLowerCase().includes('fuel')) || (state.categories || [])[0];
        const fuelTxId = `tx_fuel_${shiftId}`;
        normalized.linkedFuelTxId = fuelTxId;

        newTransactions.push({
          id: fuelTxId,
          date: normalized.date,
          amount: normalized.fuelExpense,
          type: 'EXPENSE',
          accountId: cashAccount?.id || bankAccount?.id || (state.accounts && state.accounts[0]?.id) || 'acc_cash',
          categoryId: fuelCategory?.id || 'cat_fuel',
          description: `Shift Fuel: ${normalized.kmDriven || 0} km (${normalized.fuelLitres || 0}L)`,
          notes: `Operational fuel cost for Swiggy shift on ${normalized.date}`,
          source: 'MANUAL',
          verificationStatus: 'CONFIRMED',
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    setState((prev) => ({
      ...prev,
      swiggyShifts: [normalized, ...(prev.swiggyShifts || [])],
      swiggyEarnings: [
        {
          id: shiftId,
          date: normalized.date,
          amount: normalized.grossEarnings,
          orders: normalized.orders,
          hoursWorked: normalized.hoursWorked,
          source: 'MANUAL',
          notes: normalized.notes,
        },
        ...(prev.swiggyEarnings || []),
      ],
      transactions: newTransactions.length > 0 ? [...newTransactions, ...prev.transactions] : prev.transactions,
    }));
  };

  const updateSwiggyShift = (updatedShift: SwiggyShift) => {
    const normalized = normalizeSwiggyShift(updatedShift);
    setState((prev) => {
      let transactions = [...prev.transactions];

      if (normalized.status === 'COMPLETED' && normalized.grossEarnings > 0) {
        const bankAccount = (prev.accounts || []).find((a) => a.type === 'BANK' && a.isActive) || (prev.accounts || [])[0];
        const swiggyCategory = (prev.categories || []).find((c) => c.name.toLowerCase().includes('swiggy')) || (prev.categories || [])[0];
        const now = new Date().toISOString();

        if (normalized.linkedIncomeTxId) {
          transactions = transactions.map((t) =>
            t.id === normalized.linkedIncomeTxId
              ? {
                  ...t,
                  date: normalized.date,
                  amount: normalized.grossEarnings,
                  description: `Swiggy Delivery: ${normalized.slot} (${normalized.orders} orders)`,
                  notes: `Base ₹${normalized.basePay} + Surge ₹${normalized.surgeIncentives} + Tips ₹${normalized.tips}. ${normalized.notes || ''}`.trim(),
                  updatedAt: now,
                }
              : t
          );
        } else {
          const incId = `tx_inc_${normalized.id}`;
          normalized.linkedIncomeTxId = incId;
          transactions.unshift({
            id: incId,
            date: normalized.date,
            amount: normalized.grossEarnings,
            type: 'INCOME',
            accountId: bankAccount?.id || (prev.accounts && prev.accounts[0]?.id) || 'acc_default',
            categoryId: swiggyCategory?.id || 'cat_swiggy_inc',
            description: `Swiggy Delivery: ${normalized.slot} (${normalized.orders} orders)`,
            notes: `Base ₹${normalized.basePay} + Surge ₹${normalized.surgeIncentives} + Tips ₹${normalized.tips}. ${normalized.notes || ''}`.trim(),
            source: 'MANUAL',
            verificationStatus: 'CONFIRMED',
            createdAt: now,
            updatedAt: now,
          });
        }

        if (normalized.fuelExpense > 0) {
          const cashAccount = (prev.accounts || []).find((a) => a.type === 'CASH' && a.isActive) || bankAccount;
          const fuelCategory = (prev.categories || []).find((c) => c.id === 'cat_fuel' || c.name.toLowerCase().includes('fuel')) || (prev.categories || [])[0];

          if (normalized.linkedFuelTxId) {
            transactions = transactions.map((t) =>
              t.id === normalized.linkedFuelTxId
                ? {
                    ...t,
                    date: normalized.date,
                    amount: normalized.fuelExpense,
                    description: `Shift Fuel: ${normalized.kmDriven || 0} km (${normalized.fuelLitres || 0}L)`,
                    updatedAt: now,
                  }
                : t
            );
          } else {
            const fuelId = `tx_fuel_${normalized.id}`;
            normalized.linkedFuelTxId = fuelId;
            transactions.unshift({
              id: fuelId,
              date: normalized.date,
              amount: normalized.fuelExpense,
              type: 'EXPENSE',
              accountId: cashAccount?.id || bankAccount?.id || (prev.accounts && prev.accounts[0]?.id) || 'acc_cash',
              categoryId: fuelCategory?.id || 'cat_fuel',
              description: `Shift Fuel: ${normalized.kmDriven || 0} km (${normalized.fuelLitres || 0}L)`,
              notes: `Operational fuel cost for Swiggy shift on ${normalized.date}`,
              source: 'MANUAL',
              verificationStatus: 'CONFIRMED',
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      }

      return {
        ...prev,
        swiggyShifts: (prev.swiggyShifts || []).map((s) => (s.id === normalized.id ? normalized : s)),
        swiggyEarnings: (prev.swiggyEarnings || []).map((e) =>
          e.id === normalized.id
            ? {
                ...e,
                date: normalized.date,
                amount: normalized.grossEarnings,
                orders: normalized.orders,
                hoursWorked: normalized.hoursWorked,
                notes: normalized.notes,
              }
            : e
        ),
        transactions,
      };
    });
  };

  const deleteSwiggyShift = (id: string) => {
    setState((prev) => {
      const shiftToDelete = (prev.swiggyShifts || []).find((s) => s.id === id);
      const linkedIncomeId = shiftToDelete?.linkedIncomeTxId || `tx_inc_${id}`;
      const linkedFuelId = shiftToDelete?.linkedFuelTxId || `tx_fuel_${id}`;
      const legacyTxId = `tx_${id}`;

      return {
        ...prev,
        swiggyShifts: (prev.swiggyShifts || []).filter((s) => s.id !== id),
        swiggyEarnings: (prev.swiggyEarnings || []).filter((e) => e.id !== id),
        transactions: prev.transactions.filter(
          (t) => t.id !== linkedIncomeId && t.id !== linkedFuelId && t.id !== legacyTxId
        ),
      };
    });
  };

  const planSwiggyShift = (date: string, slot: SwiggyShiftSlot, targetOrders: number, notes?: string) => {
    addSwiggyShift({
      date,
      slot,
      status: 'PLANNED',
      orders: 0,
      targetOrders,
      basePay: 0,
      surgeIncentives: 0,
      tips: 0,
      grossEarnings: 0,
      fuelExpense: 0,
      otherExpenses: 0,
      netEarnings: 0,
      notes: notes || 'Upcoming delivery shift planned',
      source: 'MANUAL',
    });
  };

  const addFuelLog = (fuelData: Omit<FuelLog, 'id'>, accountId?: string) => {
    const fuelId = `fuel_${Date.now()}`;
    const now = new Date().toISOString();
    const account = accountId
      ? state.accounts.find((a) => a.id === accountId)
      : state.accounts.find((a) => a.type === 'CASH' && a.isActive) || state.accounts[0];
    const fuelCat = state.categories.find((c) => c.id === 'cat_fuel' || c.name.toLowerCase().includes('fuel')) || state.categories[0];
    const linkedTxId = `tx_${fuelId}`;

    const newLog: FuelLog = {
      ...fuelData,
      id: fuelId,
      linkedTxId,
    };

    const newTx: Transaction = {
      id: linkedTxId,
      date: fuelData.date,
      amount: fuelData.amount,
      type: 'EXPENSE',
      accountId: account ? account.id : state.accounts[0].id,
      categoryId: fuelCat.id,
      description: `Fuel Refill: ${fuelData.bunkName || 'Petrol Bunk'} (${fuelData.litres}L)`,
      notes: fuelData.odometerKm ? `Odometer: ${fuelData.odometerKm} km. ${fuelData.notes || ''}`.trim() : fuelData.notes,
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: now,
      updatedAt: now,
    };

    setState((prev) => ({
      ...prev,
      fuelLogs: [newLog, ...(prev.fuelLogs || [])],
      transactions: [newTx, ...prev.transactions],
    }));
  };

  const deleteFuelLog = (id: string) => {
    setState((prev) => {
      const log = (prev.fuelLogs || []).find((f) => f.id === id);
      const txId = log?.linkedTxId || `tx_${id}`;
      return {
        ...prev,
        fuelLogs: (prev.fuelLogs || []).filter((f) => f.id !== id),
        transactions: prev.transactions.filter((t) => t.id !== txId),
      };
    });
  };

  const updateSwiggyTargets = (targetsUpdate: Partial<SwiggyOperationalTargets>) => {
    setState((prev) => ({
      ...prev,
      swiggyTargets: {
        ...(prev.swiggyTargets || {
          dailyEarningsTarget: 700,
          dailyOrdersTarget: 15,
          monthlyEarningsTarget: 18000,
          monthlyShiftsTarget: 26,
        }),
        ...targetsUpdate,
      },
    }));
  };

  const linkShiftToTransaction = (shiftId: string, txId: string, linkType: 'INCOME' | 'FUEL') => {
    setState((prev) => {
      const shift = (prev.swiggyShifts || []).find((s) => s.id === shiftId);
      const tx = prev.transactions.find((t) => t.id === txId);
      if (!shift || !tx) return prev;

      const now = new Date().toISOString();
      const updatedShift: SwiggyShift = {
        ...shift,
        linkedIncomeTxId: linkType === 'INCOME' ? txId : shift.linkedIncomeTxId,
        linkedFuelTxId: linkType === 'FUEL' ? txId : shift.linkedFuelTxId,
      };

      const updatedTx: Transaction = {
        ...tx,
        verificationStatus: 'CONFIRMED',
        updatedAt: now,
        notes: tx.notes
          ? tx.notes.includes('Linked to Swiggy Shift')
            ? tx.notes
            : `${tx.notes} • Linked to Swiggy Shift (${shift.date})`
          : `Linked to Swiggy Shift (${shift.date} ${shift.slot})`,
      };

      return {
        ...prev,
        swiggyShifts: (prev.swiggyShifts || []).map((s) => (s.id === shiftId ? updatedShift : s)),
        transactions: prev.transactions.map((t) => (t.id === txId ? updatedTx : t)),
      };
    });
  };

  const unlinkShiftTransaction = (shiftId: string, linkType: 'INCOME' | 'FUEL') => {
    setState((prev) => {
      const shift = (prev.swiggyShifts || []).find((s) => s.id === shiftId);
      if (!shift) return prev;

      const updatedShift: SwiggyShift = {
        ...shift,
        linkedIncomeTxId: linkType === 'INCOME' ? undefined : shift.linkedIncomeTxId,
        linkedFuelTxId: linkType === 'FUEL' ? undefined : shift.linkedFuelTxId,
      };

      return {
        ...prev,
        swiggyShifts: (prev.swiggyShifts || []).map((s) => (s.id === shiftId ? updatedShift : s)),
      };
    });
  };

  const confirmSmsAndLinkShift = (txId: string, shiftId: string, linkType?: 'INCOME' | 'FUEL') => {
    setState((prev) => {
      const tx = prev.transactions.find((t) => t.id === txId);
      const shift = (prev.swiggyShifts || []).find((s) => s.id === shiftId);
      if (!tx || !shift) return prev;

      const resolvedLinkType: 'INCOME' | 'FUEL' = linkType || (tx.type === 'INCOME' ? 'INCOME' : 'FUEL');
      const now = new Date().toISOString();

      const updatedTx: Transaction = {
        ...tx,
        verificationStatus: 'CONFIRMED',
        updatedAt: now,
        notes: `Confirmed & linked to Swiggy Shift on ${shift.date} (${shift.slot}). ${tx.notes || ''}`.trim(),
      };

      const updatedShift: SwiggyShift = {
        ...shift,
        linkedIncomeTxId: resolvedLinkType === 'INCOME' ? txId : shift.linkedIncomeTxId,
        linkedFuelTxId: resolvedLinkType === 'FUEL' ? txId : shift.linkedFuelTxId,
      };

      return {
        ...prev,
        transactions: prev.transactions.map((t) => (t.id === txId ? updatedTx : t)),
        swiggyShifts: (prev.swiggyShifts || []).map((s) => (s.id === shiftId ? updatedShift : s)),
      };
    });
  };

  const detectAndIngestSms = (rawSms: string, targetAccountId?: string): { success: boolean; transaction?: Transaction; error?: string } => {
    const parsed = parseIndianBankSMS(rawSms);
    if (!parsed) {
      return { success: false, error: 'Could not extract valid bank amount or transaction details from SMS' };
    }

    const txId = `tx_sms_${Date.now()}`;
    const now = new Date().toISOString();

    const account = targetAccountId
      ? state.accounts.find((a) => a.id === targetAccountId)
      : parsed.type === 'INCOME'
      ? state.accounts.find((a) => a.type === 'BANK' && a.isActive) || state.accounts[0]
      : state.accounts.find((a) => a.type === 'CASH' && a.isActive) || state.accounts[0];

    const category = state.categories.find((c) => c.id === parsed.suggestedCategoryId) || state.categories[0];

    const newTx: Transaction = {
      id: txId,
      date: parsed.date,
      amount: parsed.amount,
      type: parsed.type,
      accountId: account ? account.id : state.accounts[0].id,
      categoryId: category.id,
      description: `${parsed.bankName}: ${parsed.counterparty} (SMS Alert)`,
      notes: `Raw SMS: "${parsed.rawText.substring(0, 100)}..."`,
      source: 'SMS',
      verificationStatus: 'PENDING_REVIEW',
      createdAt: now,
      updatedAt: now,
    };

    setState((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
    }));

    return { success: true, transaction: newTx };
  };

  const addSmsCandidate = (candidate: SmsTransactionCandidate) => {
    setState((prev) => ({
      ...prev,
      smsCandidates: [candidate, ...(prev.smsCandidates || [])],
    }));
  };

  const addSmsCandidates = (candidates: SmsTransactionCandidate[]) => {
    setState((prev) => ({
      ...prev,
      smsCandidates: [...candidates, ...(prev.smsCandidates || [])],
    }));
  };

  const updateSmsCandidate = (candidate: SmsTransactionCandidate) => {
    setState((prev) => ({
      ...prev,
      smsCandidates: (prev.smsCandidates || []).map((c) => (c.id === candidate.id ? candidate : c)),
    }));
  };

  const rejectSmsCandidate = (candidateId: string, reviewNotes?: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      smsCandidates: (prev.smsCandidates || []).map((c) =>
        c.id === candidateId
          ? {
              ...c,
              reviewStatus: 'REJECTED' as const,
              reviewedAt: now,
              reviewNotes: reviewNotes || c.reviewNotes,
            }
          : c
      ),
    }));
  };

  const ignoreSmsCandidate = (candidateId: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      smsCandidates: (prev.smsCandidates || []).map((c) =>
        c.id === candidateId
          ? {
              ...c,
              reviewStatus: 'IGNORED' as const,
              reviewedAt: now,
            }
          : c
      ),
    }));
  };

  const linkSmsCandidate = (
    candidateId: string,
    targetTxId?: string,
    targetShiftId?: string,
    targetDebtId?: string
  ) => {
    const now = new Date().toISOString();
    setState((prev) => {
      let swiggyShifts = [...(prev.swiggyShifts || [])];
      let transactions = [...prev.transactions];

      if (targetShiftId && targetTxId) {
        swiggyShifts = swiggyShifts.map((s) =>
          s.id === targetShiftId ? { ...s, linkedIncomeTxId: targetTxId } : s
        );
      }

      const updatedCandidates = (prev.smsCandidates || []).map((c) =>
        c.id === candidateId
          ? {
              ...c,
              reviewStatus: 'LINKED' as const,
              reviewedAt: now,
              matchedTransactionId: targetTxId || c.matchedTransactionId,
              matchedSwiggyShiftId: targetShiftId || c.matchedSwiggyShiftId,
              matchedDebtPaymentId: targetDebtId || c.matchedDebtPaymentId,
            }
          : c
      );

      return {
        ...prev,
        swiggyShifts,
        transactions,
        smsCandidates: updatedCandidates,
      };
    });
  };

  const markSmsDuplicate = (candidateId: string, duplicateOfTxId?: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      smsCandidates: (prev.smsCandidates || []).map((c) =>
        c.id === candidateId
          ? {
              ...c,
              reviewStatus: 'DUPLICATE' as const,
              matchedTransactionId: duplicateOfTxId || c.matchedTransactionId,
              reviewedAt: now,
              reviewNotes: duplicateOfTxId
                ? `Marked as duplicate of transaction ${duplicateOfTxId}`
                : 'Marked as duplicate',
            }
          : c
      ),
    }));
  };

  const clearSmsRawText = (candidateId?: string) => {
    setState((prev) => ({
      ...prev,
      smsCandidates: (prev.smsCandidates || []).map((c) => {
        if (!candidateId || c.id === candidateId) {
          return {
            ...c,
            rawText: '[RAW_SMS_DELETED_PER_PRIVACY_POLICY]',
          };
        }
        return c;
      }),
    }));
  };

  const deleteSmsCandidate = (candidateId: string) => {
    setState((prev) => ({
      ...prev,
      smsCandidates: (prev.smsCandidates || []).filter((c) => c.id !== candidateId),
    }));
  };

  const updateSmsPrivacySettings = (settingsUpdate: Partial<SmsPrivacySettings>) => {
    setState((prev) => ({
      ...prev,
      smsPrivacySettings: {
        ...(prev.smsPrivacySettings || {
          retainRawSmsText: true,
          autoDeleteRawTextAfterReview: false,
        }),
        ...settingsUpdate,
      },
    }));
  };

  const confirmSmsTransaction = (
    candidateId: string,
    overrides?: {
      amount?: number;
      date?: string;
      type?: SmsCandidateType;
      accountId?: string;
      toAccountId?: string;
      categoryId?: string;
      debtId?: string;
      description?: string;
      notes?: string;
      principalAmount?: number;
      interestAmount?: number;
      feesAmount?: number;
      matchedShiftId?: string;
    }
  ): { success: boolean; transactionId?: string; error?: string } => {
    const candidate = (state.smsCandidates || []).find((c) => c.id === candidateId);
    if (!candidate) {
      return { success: false, error: 'SMS candidate not found' };
    }

    const now = new Date().toISOString();
    const finalAmount = overrides?.amount !== undefined ? overrides.amount : candidate.detectedAmount || 0;
    const finalDate = overrides?.date || candidate.detectedTransactionDate || getCurrentDateISO();
    const finalType = overrides?.type || candidate.transactionType;

    if (finalAmount <= 0) {
      return { success: false, error: 'Transaction amount must be greater than zero' };
    }

    // Resolve Account
    let finalAccountId = overrides?.accountId || candidate.matchedAccountId;
    if (!finalAccountId) {
      if (candidate.detectedCardReference) {
        const cardAcc = state.accounts.find((a) => a.type === 'CREDIT_CARD' && a.isActive);
        finalAccountId = cardAcc ? cardAcc.id : state.accounts[0].id;
      } else if (finalType === 'INCOME') {
        const bankAcc = state.accounts.find((a) => a.type === 'BANK' && a.isActive);
        finalAccountId = bankAcc ? bankAcc.id : state.accounts[0].id;
      } else {
        const defaultAcc = state.accounts.find((a) => a.isActive);
        finalAccountId = defaultAcc ? defaultAcc.id : state.accounts[0].id;
      }
    }

    // Resolve Category
    const finalCategoryId =
      overrides?.categoryId ||
      candidate.detectedCategory ||
      (finalType === 'INCOME'
        ? state.categories.find((c) => c.type === 'INCOME')?.id || 'cat_other_inc'
        : state.categories.find((c) => c.type === 'EXPENSE')?.id || 'cat_misc');

    const txId = `tx_sms_conf_${Date.now()}`;
    const newTx: Transaction = {
      id: txId,
      date: finalDate,
      amount: finalAmount,
      type: finalType === 'UNKNOWN' ? 'EXPENSE' : finalType,
      accountId: finalAccountId,
      toAccountId: finalType === 'TRANSFER' ? overrides?.toAccountId || state.accounts.find((a) => a.id !== finalAccountId)?.id : undefined,
      categoryId: finalCategoryId,
      debtId: overrides?.debtId || candidate.matchedDebtPaymentId,
      principalAmount: overrides?.principalAmount,
      interestAmount: overrides?.interestAmount,
      feesAmount: overrides?.feesAmount,
      description: overrides?.description || candidate.detectedDescription || `${finalType} via SMS`,
      notes: overrides?.notes || `Imported & confirmed from SMS (${candidate.sender || 'Bank Alert'})`,
      source: 'SMS',
      sourceReference: {
        sourceType: 'SMS',
        smsCandidateId: candidate.id,
        confirmedAt: now,
      },
      verificationStatus: 'CONFIRMED',
      createdAt: now,
      updatedAt: now,
    };

    setState((prev) => {
      // 1. Transactions update (ONE SMS -> ONE FINANCIAL EVENT)
      const transactions = [newTx, ...prev.transactions];

      // 2. Swiggy Shift link update (Section 17, 53 / Test 16, 17)
      let swiggyShifts = [...(prev.swiggyShifts || [])];
      const targetShiftId = overrides?.matchedShiftId || candidate.matchedSwiggyShiftId;
      if (targetShiftId) {
        swiggyShifts = swiggyShifts.map((s) =>
          s.id === targetShiftId ? { ...s, linkedIncomeTxId: txId } : s
        );
      }

      // 3. Debt update if DEBT_PAYMENT
      let debts = [...prev.debts];
      const linkedDebtId = overrides?.debtId || candidate.matchedDebtPaymentId;
      if (linkedDebtId && (finalType === 'DEBT_PAYMENT' || finalType === 'EXPENSE')) {
        const principalReduction = overrides?.principalAmount || finalAmount;
        debts = debts.map((d) => {
          if (d.id === linkedDebtId) {
            const newOutstanding = Math.max(0, d.outstandingPrincipal - principalReduction);
            return {
              ...d,
              outstandingPrincipal: newOutstanding,
              status: newOutstanding === 0 ? 'CLOSED' : d.status,
            };
          }
          return d;
        });
      }

      // 4. Update Candidate reviewStatus and apply privacy policy
      const shouldAutoDeleteRaw = prev.smsPrivacySettings?.autoDeleteRawTextAfterReview ?? false;
      const updatedCandidates = (prev.smsCandidates || []).map((c) =>
        c.id === candidateId
          ? {
              ...c,
              reviewStatus: 'CONFIRMED' as const,
              reviewedAt: now,
              matchedTransactionId: txId,
              rawText: shouldAutoDeleteRaw ? '[RAW_SMS_DELETED_PER_PRIVACY_POLICY]' : c.rawText,
            }
          : c
      );

      return {
        ...prev,
        transactions,
        swiggyShifts,
        debts,
        smsCandidates: updatedCandidates,
      };
    });

    return { success: true, transactionId: txId };
  };

  const updateProfile = (profileUpdate: Partial<UserProfile>) => {
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        ...profileUpdate,
      },
    }));
  };

  // Stage 6 Notifications & Reminders Actions
  const addNotification = (notification: FinancialNotification) => {
    setState((prev) => ({
      ...prev,
      notifications: [notification, ...(prev.notifications || [])],
    }));
  };

  const markNotificationRead = (id: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) =>
        n.id === id ? { ...n, status: 'READ' as const, readAt: now } : n
      ),
    }));
  };

  const markNotificationUnread = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) =>
        n.id === id ? { ...n, status: 'UNREAD' as const, readAt: undefined } : n
      ),
    }));
  };

  const markAllNotificationsRead = () => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) =>
        n.status === 'UNREAD' ? { ...n, status: 'READ' as const, readAt: now } : n
      ),
    }));
  };

  const dismissNotification = (id: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) =>
        n.id === id ? { ...n, status: 'DISMISSED' as const, dismissedAt: now } : n
      ),
    }));
  };

  const actionNotification = (id: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) =>
        n.id === id ? { ...n, status: 'ACTIONED' as const, actionedAt: now, readAt: n.readAt || now } : n
      ),
    }));
  };

  const clearReadNotifications = () => {
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).filter((n) => n.status === 'UNREAD'),
    }));
  };

  const clearAllNotifications = () => {
    setState((prev) => ({
      ...prev,
      notifications: [],
    }));
  };

  const deleteNotification = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).filter((n) => n.id !== id),
    }));
  };

  const updateNotificationSettings = (settingsUpdate: Partial<NotificationSettings>) => {
    setState((prev) => ({
      ...prev,
      notificationSettings: {
        ...(prev.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS),
        ...settingsUpdate,
      },
    }));
  };

  const evaluateNotifications = () => {
    setState((prev) => {
      const result = evaluateAndScheduleNotifications(prev);
      if (result.newNotifications.length === 0) {
        return prev;
      }

      // Check if browser notifications should be dispatched
      const settings = prev.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;
      if (settings.browserNotificationsEnabled) {
        for (const notif of result.newNotifications) {
          triggerBrowserNotificationIfEligible(notif, settings);
        }
      }

      return {
        ...prev,
        notifications: result.allNotifications,
        notificationSchedulerState: result.schedulerState,
      };
    });
  };

  const requestBrowserNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updateNotificationSettings({ browserNotificationsEnabled: true });
      } else {
        updateNotificationSettings({ browserNotificationsEnabled: false });
      }
      return permission;
    } catch {
      return 'unsupported';
    }
  };

  // Evaluate reminders on initial mount and when major data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      evaluateNotifications();
    }, 400);
    return () => clearTimeout(timer);
  }, [
    state.payments,
    state.debts,
    state.recurringCommitments,
    state.budgets,
    state.smsCandidates,
    state.swiggyShifts,
  ]);

  const unreadNotificationCount = useMemo(() => {
    return (state.notifications || []).filter((n) => n.status === 'UNREAD').length;
  }, [state.notifications]);

  const urgentNotificationCount = useMemo(() => {
    return (state.notifications || []).filter(
      (n) => n.status === 'UNREAD' && (n.priority === 'URGENT' || n.priority === 'HIGH')
    ).length;
  }, [state.notifications]);

  const resetDemoData = () => {
    const fresh = StorageService.resetDemoData();
    setState(fresh);
  };

  const exportData = () => {
    return StorageService.exportStateToJson();
  };

  const importData = (jsonStr: string): boolean => {
    try {
      const imported = StorageService.importStateFromJson(jsonStr);
      setState(imported);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Stage 8 Integrity, Duplicates, and Diagnostics derived states
  const integrityIssues = useMemo(() => {
    return runDataIntegrityCheck(state).issues;
  }, [state]);

  const duplicateCandidates = useMemo(() => {
    return findDuplicateTransactions(state.transactions || []);
  }, [state.transactions]);

  const appDiagnostics = useMemo(() => {
    return buildAppDiagnostics(state);
  }, [state]);

  const errorLogs = state.errorLogs || [];
  const backupSnapshots = state.backupSnapshots || [];
  const auditEvents = state.auditEvents || [];
  const commandCenterPreferences = state.commandCenterPreferences || {
    visibleWidgets: {
      surplus: true,
      emergency: true,
      debts: true,
      forecast: true,
      swiggy: true,
      recentTxs: true,
      quality: true,
    },
    widgetOrder: ['surplus', 'emergency', 'debts', 'forecast', 'swiggy', 'recentTxs', 'quality'],
    density: 'comfortable',
  };
  const recoverySnapshot = state.recoverySnapshot || null;

  const logAudit = (
    action: AuditEvent['action'],
    entityType: string,
    entityId: string,
    summary: string,
    options?: { before?: unknown; after?: unknown; source?: string; canUndo?: boolean }
  ) => {
    const ev = createAuditEvent(action, entityType, entityId, summary, options);
    setState((prev) => ({
      ...prev,
      auditEvents: appendAuditEventWithRetention(
        prev.auditEvents,
        ev,
        prev.reliabilitySettings?.auditRetentionDays ?? 365
      ),
    }));
  };

  const createBackup = () => {
    const res = createBackupPayload(state);
    logAudit('EXPORT', 'Backup', `backup_${Date.now()}`, 'Created full JSON backup');
    return res;
  };

  const restoreBackup = (jsonString: string): { success: boolean; error?: string } => {
    const preview = validateAndPreviewBackup(jsonString);
    if (!preview.isValid || !preview.extractedState) {
      return { success: false, error: preview.error || 'Invalid backup structure.' };
    }
    // Safety Snapshot before restore
    StorageService.createLocalSnapshot(state, 'RESTORE', 'Snapshot created before restoring backup');
    const restored = preview.extractedState;
    setState(restored);
    StorageService.saveState(restored);
    logAudit('RESTORE', 'Backup', `restore_${Date.now()}`, `Restored backup from ${preview.createdAt}`);
    return { success: true };
  };

  const createSnapshot = (reason: SnapshotReason, description?: string) => {
    const snap = StorageService.createLocalSnapshot(state, reason, description);
    setState((prev) => ({
      ...prev,
      backupSnapshots: StorageService.getSnapshots(),
    }));
    return snap;
  };

  const restoreSnapshot = (id: string): boolean => {
    const snap = StorageService.getSnapshots().find((s) => s.id === id);
    if (!snap) return false;
    StorageService.createLocalSnapshot(state, 'MANUAL', 'Snapshot before rollback');
    const restored = StorageService.restoreSnapshot(id);
    if (restored) {
      setState(restored);
      logAudit('RESTORE', 'Snapshot', id, `Rolled back to snapshot: ${snap.description || snap.id}`);
      return true;
    }
    return false;
  };

  const deleteSnapshot = (id: string) => {
    StorageService.deleteSnapshot(id);
    setState((prev) => ({
      ...prev,
      backupSnapshots: StorageService.getSnapshots(),
    }));
  };

  const undoAuditEvent = (event: AuditEvent): { success: boolean; error?: string } => {
    const res = RecoveryService.undoAuditEvent(state, event);
    if (res.success && res.updatedState) {
      setState(res.updatedState);
      logAudit('REVERSAL', event.entityType, event.entityId, `Undid audit event: ${event.summary}`);
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to undo action.' };
  };

  const reverseTransaction = (txId: string, reason: string): { success: boolean; error?: string } => {
    const tx = (state.transactions || []).find((t) => t.id === txId);
    if (!tx) return { success: false, error: 'Transaction not found.' };
    const res = RecoveryService.createCompensatingReversal(state, tx, reason);
    setState(res.updatedState);
    logAudit('REVERSAL', 'Transaction', txId, `Reversed transaction: ₹${tx.amount} (${reason})`);
    return { success: true };
  };

  const correctDebtPayment = (paymentId: string, reason: string): { success: boolean; error?: string } => {
    const res = RecoveryService.correctDebtPayment(state, paymentId, reason);
    if (res.success && res.updatedState) {
      setState(res.updatedState);
      logAudit('REVERSAL', 'DebtPayment', paymentId, `Corrected debt payment: ${reason}`);
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to correct debt payment.' };
  };

  const runIntegrityScan = () => {
    return runDataIntegrityCheck(state);
  };

  const autoRepairStructuralIssues = () => {
    const { repairedState, repairedCount, repairedDescriptions } = repairSafeStructuralIssues(state);
    if (repairedCount > 0) {
      setState(repairedState);
      StorageService.saveState(repairedState);
      logAudit('REPAIR', 'DataIntegrity', 'repair_auto', `Auto-repaired ${repairedCount} structural issues`);
    }
    return { count: repairedCount, descriptions: repairedDescriptions };
  };

  const resolveDuplicate = (
    candidateId: string,
    action: 'KEEP_EXISTING' | 'KEEP_INCOMING' | 'KEEP_BOTH' | 'MARK_DUPLICATE'
  ) => {
    logAudit('DUPLICATE', 'Transaction', candidateId, `Resolved duplicate candidate with action: ${action}`);
  };

  const updateCommandCenterPreferences = (prefs: Partial<CommandCenterPreferences>) => {
    setState((prev) => ({
      ...prev,
      commandCenterPreferences: {
        ...(prev.commandCenterPreferences || {
          visibleWidgets: { surplus: true, emergency: true, debts: true, forecast: true, swiggy: true, recentTxs: true, quality: true },
          widgetOrder: ['surplus', 'emergency', 'debts', 'forecast', 'swiggy', 'recentTxs', 'quality'],
          density: 'comfortable',
        }),
        ...prefs,
      },
    }));
  };

  const clearErrorLogs = () => {
    setState((prev) => ({ ...prev, errorLogs: [] }));
  };

  const dismissRecoverySnapshot = () => {
    StorageService.clearRecoverySnapshot();
    setState((prev) => ({ ...prev, recoverySnapshot: null }));
  };

  const safeDeleteFinancialData = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      StorageService.createLocalSnapshot(state, 'RESET', 'Snapshot before deleting financial data');

      // Enqueue cloud deletions for all current accounts, transactions, debts, payments, budgets, goals
      state.transactions.forEach((tx) => enqueueSyncMutation('TRANSACTION', tx.id, 'DELETE', { id: tx.id }));
      state.accounts.forEach((acc) => enqueueSyncMutation('ACCOUNT', acc.id, 'DELETE', { id: acc.id }));
      state.debts.forEach((debt) => enqueueSyncMutation('DEBT', debt.id, 'DELETE', { id: debt.id }));
      state.payments.forEach((pay) => enqueueSyncMutation('PAYMENT', pay.id, 'DELETE', { id: pay.id }));
      state.budgets.forEach((b) => enqueueSyncMutation('BUDGET', b.id, 'DELETE', { id: b.id }));
      state.goals.forEach((g) => enqueueSyncMutation('GOAL', g.id, 'DELETE', { id: g.id }));

      const userId = globalSyncEngine.getUserId();
      if (userId) {
        try {
          await CloudRepository.deleteUserCloudData(userId);
        } catch (cloudErr) {
          console.warn('Cloud user collections wipe warning during financial deletion:', cloudErr);
        }
      }

      const emptyState: AppState = {
        ...state,
        monthlySalary: 0,
        essentialExpenses: [],
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

      const saveOk = StorageService.saveState(emptyState);
      if (!saveOk) {
        throw new Error('Failed to persist cleared financial records to local storage');
      }

      setState(emptyState);
      logAudit('DELETE', 'Ledger', 'all', 'Cleared all user and demo financial records');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Storage persistence failure';
      console.error('safeDeleteFinancialData failed:', err);
      logAppError(state.errorLogs || [], 'STORAGE_ERROR', `Delete financial data failed: ${msg}`);
      return { success: false, error: `Unable to delete financial records. ${msg}. No data was removed.` };
    }
  };

  const factoryReset = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const preResetSnapshot = StorageService.createLocalSnapshot(state, 'RESET', 'Pre-factory reset recovery snapshot');

      clearCompletedAndFailedQueue();
      saveStoredConflicts([]);

      try {
        localStorage.removeItem(THEME_STORAGE_KEY);
        localStorage.removeItem('cashflow_onboarding_shown');
      } catch {}

      const userId = globalSyncEngine.getUserId();
      if (userId) {
        try {
          await CloudRepository.deleteUserCloudData(userId);
        } catch (cloudErr) {
          console.warn('Cloud user collections wipe warning during factory reset:', cloudErr);
        }
      }

      StorageService.clearState();
      const fresh = getDefaultDemoData();
      fresh.backupSnapshots = StorageService.getSnapshots();
      fresh.recoverySnapshot = preResetSnapshot;

      const saveOk = StorageService.saveState(fresh);
      if (!saveOk) {
        throw new Error('Failed to persist factory reset state to storage');
      }

      setState(fresh);
      logAudit('DELETE', 'Application', 'all', 'Executed complete factory reset to default initial state');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Storage reset failure';
      console.error('factoryReset failed:', err);
      logAppError(state.errorLogs || [], 'STORAGE_ERROR', `Factory reset failed: ${msg}`);
      return { success: false, error: `Unable to perform factory reset. ${msg}. Application data was kept intact.` };
    }
  };

  const removeDemoData = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      StorageService.createLocalSnapshot(state, 'RESET', 'Snapshot before removing demo data');

      // Enqueue cloud deletions for demo records
      state.transactions.filter(isDemoRecord.transaction).forEach((tx) => {
        enqueueSyncMutation('TRANSACTION', tx.id, 'DELETE', { id: tx.id });
      });
      state.debts.filter(isDemoRecord.debt).forEach((d) => {
        enqueueSyncMutation('DEBT', d.id, 'DELETE', { id: d.id });
      });
      state.payments.filter(isDemoRecord.payment).forEach((p) => {
        enqueueSyncMutation('PAYMENT', p.id, 'DELETE', { id: p.id });
      });
      state.budgets.filter(isDemoRecord.budget).forEach((b) => {
        enqueueSyncMutation('BUDGET', b.id, 'DELETE', { id: b.id });
      });
      state.goals.filter(isDemoRecord.goal).forEach((g) => {
        enqueueSyncMutation('GOAL', g.id, 'DELETE', { id: g.id });
      });

      const updatedState: AppState = {
        ...state,
        transactions: state.transactions.filter((t) => !isDemoRecord.transaction(t)),
        debts: state.debts.filter((d) => !isDemoRecord.debt(d)),
        debtPayments: state.debtPayments.filter((dp) => !isDemoRecord.debtPayment(dp)),
        payments: state.payments.filter((p) => !isDemoRecord.payment(p)),
        recurringCommitments: state.recurringCommitments.filter((r) => !isDemoRecord.recurring(r)),
        budgets: state.budgets.filter((b) => !isDemoRecord.budget(b)),
        goals: state.goals.filter((g) => !isDemoRecord.goal(g)),
        swiggyShifts: state.swiggyShifts.filter((s) => !isDemoRecord.shift(s)),
        fuelLogs: state.fuelLogs.filter((f) => !isDemoRecord.fuel(f)),
        swiggyEarnings: state.swiggyEarnings.filter((e) => !isDemoRecord.earning(e)),
        smsCandidates: state.smsCandidates.filter((s) => !isDemoRecord.candidate(s)),
        essentialExpenses: (state.essentialExpenses || []).filter((e) => !isDemoRecord.expense(e)),
        accounts: state.accounts.filter((a) => !isDemoRecord.account(a)),
      };

      const saveOk = StorageService.saveState(updatedState);
      if (!saveOk) {
        throw new Error('Failed to persist updated state after removing demo data');
      }

      setState(updatedState);
      logAudit('DELETE', 'DemoData', 'demo', 'Removed demonstration records while strictly preserving user data');
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Storage persistence error';
      console.error('removeDemoData failed:', err);
      logAppError(state.errorLogs || [], 'STORAGE_ERROR', `Remove demo data failed: ${msg}`);
      return { success: false, error: `Unable to remove demo data. ${msg}. No records were removed.` };
    }
  };

  const resetApplicationSettings = () => {
    const defaultData = getDefaultDemoData();
    StorageService.createLocalSnapshot(state, 'RESET', 'Snapshot before resetting application settings');

    const updatedState: AppState = {
      ...state,
      notificationSettings: defaultData.notificationSettings,
      smsPrivacySettings: defaultData.smsPrivacySettings,
      cashBufferSetting: defaultData.cashBufferSetting,
      swiggyTargets: defaultData.swiggyTargets,
      stage7PlanningSettings: defaultData.stage7PlanningSettings,
      reliabilitySettings: defaultData.reliabilitySettings,
      commandCenterPreferences: defaultData.commandCenterPreferences,
      cloudSyncSettings: defaultData.cloudSyncSettings,
    };

    StorageService.saveState(updatedState);
    setState(updatedState);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, 'system');
    } catch {}

    logAudit('UPDATE', 'Settings', 'all', 'Reset application settings to factory defaults');
  };

  // Stage 9 Sync State & Actions
  const [syncStatus, setSyncStatus] = useState<OverallSyncStatus>(() => globalSyncEngine.getStatus());
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>(() => loadStoredConflicts());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getPendingQueueCount());

  useEffect(() => {
    const unsubscribe = globalSyncEngine.subscribe({
      onStatusChange: (status) => {
        setSyncStatus(status);
        setPendingSyncCount(getPendingQueueCount());
      },
      onConflictsChange: (conflicts) => {
        setSyncConflicts(conflicts);
        setPendingSyncCount(getPendingQueueCount());
      },
      onStateUpdatedFromCloud: (newState) => {
        setState(newState);
        setPendingSyncCount(getPendingQueueCount());
      },
    });

    return () => unsubscribe();
  }, []);

  const triggerSyncNow = async () => {
    const res = await globalSyncEngine.syncNow(state);
    setPendingSyncCount(getPendingQueueCount());
    setSyncConflicts(loadStoredConflicts());
    return res;
  };

  const resolveConflictAction = (conflictId: string, resolution: ConflictResolution) => {
    const conflict = syncConflicts.find((c) => c.id === conflictId);
    if (!conflict) return;
    const { updatedState } = resolveSyncConflict(state, conflict, resolution);
    setState(updatedState);
    setSyncConflicts(loadStoredConflicts());
  };

  const createCloudBackupAction = async (note?: string) => {
    const userId = globalSyncEngine.getUserId();
    if (!userId) {
      return { success: false, error: 'User is not signed in to create cloud backup.' };
    }
    return CloudRepository.createCloudBackup(userId, state, note);
  };

  const listCloudBackupsAction = async () => {
    const userId = globalSyncEngine.getUserId();
    if (!userId) return [];
    return CloudRepository.listCloudBackups(userId);
  };

  const restoreCloudBackupAction = async (backupId: string) => {
    const userId = globalSyncEngine.getUserId();
    if (!userId) return { success: false, error: 'User is not signed in' };

    createSnapshot('RESTORE', `Pre-cloud-restore checkpoint (Backup ${backupId})`);

    const res = await CloudRepository.getCloudBackupState(userId, backupId);
    if (!res.success || !res.state) {
      return { success: false, error: res.error || 'Failed to fetch cloud backup payload' };
    }

    setState(res.state);
    return { success: true };
  };

  const deleteCloudDataAction = async () => {
    const userId = globalSyncEngine.getUserId();
    if (!userId) return { success: false, error: 'User is not signed in' };
    return CloudRepository.deleteUserCloudData(userId);
  };

  const getKnownDevicesList = () => {
    return getLocalKnownDevices();
  };

  const updateDeviceFriendlyNameAction = (name: string) => {
    setDeviceFriendlyName(name);
  };

  return (
    <FinanceContext.Provider
      value={{

        state,
        summary,
        accountsWithBalances,
        debtsWithDetails,
        centralPosition,
        monthlySalary,
        updateSalary,
        essentialExpenses,
        addEssentialExpense,
        updateEssentialExpense,
        deleteEssentialExpense,
        categorySpending,
        cashFlowHistory,
        debtObligations,
        cashFlowPlan,
        forecast30Days,
        cashPressure,
        financialInsights,
        budgetForecasts,
        dailyForecastPoints,
        nextExpectedIncome,
        upcomingCommitments,
        updateCashBufferSetting,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addAccount,
        updateAccount,
        deleteAccount,
        addDebt,
        updateDebt,
        deleteDebt,
        recordDebtPayment,
        addPayment,
        updatePaymentStatus,
        deletePayment,
        payAndSettlePayment,
        reconcileAccountBalance,
        addBudget,
        updateBudget,
        deleteBudget,
        addGoal,
        updateGoal,
        deleteGoal,
        addSwiggyEarning,
        swiggyOperations,
        addSwiggyShift,
        updateSwiggyShift,
        deleteSwiggyShift,
        planSwiggyShift,
        addFuelLog,
        deleteFuelLog,
        updateSwiggyTargets,
        linkShiftToTransaction,
        unlinkShiftTransaction,
        confirmSmsAndLinkShift,
        detectAndIngestSms,
        smsCandidates: state.smsCandidates || [],
        smsPrivacySettings: state.smsPrivacySettings || {
          retainRawSmsText: true,
          autoDeleteRawTextAfterReview: false,
        },
        addSmsCandidate,
        addSmsCandidates,
        updateSmsCandidate,
        confirmSmsTransaction,
        rejectSmsCandidate,
        ignoreSmsCandidate,
        linkSmsCandidate,
        markSmsDuplicate,
        clearSmsRawText,
        deleteSmsCandidate,
        updateSmsPrivacySettings,
        notifications: state.notifications || [],
        notificationSettings: state.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS,
        unreadNotificationCount,
        urgentNotificationCount,
        addNotification,
        markNotificationRead,
        markNotificationUnread,
        markAllNotificationsRead,
        dismissNotification,
        actionNotification,
        clearReadNotifications,
        clearAllNotifications,
        deleteNotification,
        evaluateNotifications,
        updateNotificationSettings,
        requestBrowserNotificationPermission,
        advancedSummary,
        dataQualityReport,
        debtProjections,
        goalProjections,
        financialMilestones,
        stage7PlanningSettings,
        updatePlanningSettings,
        saveScenario,
        deleteScenario,
        explainFinancialMetric,
        // Stage 8 additions
        auditEvents,
        backupSnapshots,
        integrityIssues,
        duplicateCandidates,
        appDiagnostics,
        errorLogs,
        commandCenterPreferences,
        recoverySnapshot,
        createBackup,
        restoreBackup,
        createSnapshot,
        restoreSnapshot,
        deleteSnapshot,
        undoAuditEvent,
        reverseTransaction,
        correctDebtPayment,
        runIntegrityScan,
        autoRepairStructuralIssues,
        resolveDuplicate,
        updateCommandCenterPreferences,
        clearErrorLogs,
        dismissRecoverySnapshot,
        safeDeleteFinancialData,
        factoryReset,
        removeDemoData,
        resetApplicationSettings,
        updateProfile,
        resetDemoData,
        exportData,
        importData,
        // Stage 9 Cloud Sync & Multi-Device
        syncStatus,
        syncConflicts,
        pendingSyncCount,
        triggerSyncNow,
        resolveConflictAction,
        createCloudBackupAction,
        listCloudBackupsAction,
        restoreCloudBackupAction,
        deleteCloudDataAction,
        getKnownDevicesList,
        updateDeviceFriendlyNameAction,
      }}
    >

      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
