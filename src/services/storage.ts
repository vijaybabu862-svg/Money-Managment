import {
  Account,
  Budget,
  Category,
  CreditCard,
  Debt,
  DebtPayment,
  Goal,
  Payment,
  RecurringCommitment,
  SwiggyEarning,
  SwiggyShift,
  FuelLog,
  SwiggyOperationalTargets,
  Transaction,
  UserProfile,
  CashBufferSetting,
  SmsTransactionCandidate,
  SmsPrivacySettings,
  FinancialNotification,
  NotificationSettings,
  NotificationSchedulerState,
  Stage7PlanningSettings,
  BackupSnapshot,
  AuditEvent,
  AppError,
  CommandCenterPreferences,
  Stage8ReliabilitySettings,
  SnapshotReason,
  EssentialExpenseItem,
} from '../types/finance';
import { CloudSyncSettings } from '../types/sync';
import { getCurrentDateISO, getCurrentMonthKey } from '../utils/dates';
import { normalizeSwiggyShift } from './calculator';
import { DEFAULT_NOTIFICATION_SETTINGS } from './notificationEngine';
import { SCHEMA_VERSION } from '../version';
import { resolveLoanPurpose } from './centralFinanceCalculations';

export interface AppState {
  version: number;
  monthlySalary?: number;
  essentialExpenses?: EssentialExpenseItem[];
  profile: UserProfile;
  accounts: Account[];
  creditCards: CreditCard[];
  categories: Category[];
  transactions: Transaction[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  payments: Payment[];
  recurringCommitments: RecurringCommitment[];
  budgets: Budget[];
  goals: Goal[];
  swiggyEarnings: SwiggyEarning[];
  swiggyShifts: SwiggyShift[];
  fuelLogs: FuelLog[];
  swiggyTargets: SwiggyOperationalTargets;
  cashBufferSetting: CashBufferSetting;
  smsCandidates: SmsTransactionCandidate[];
  smsPrivacySettings: SmsPrivacySettings;
  notifications: FinancialNotification[];
  notificationSettings: NotificationSettings;
  notificationSchedulerState: NotificationSchedulerState;
  stage7PlanningSettings?: Stage7PlanningSettings;
  // Stage 8 Production Hardening & Recovery
  backupSnapshots?: BackupSnapshot[];
  auditEvents?: AuditEvent[];
  errorLogs?: AppError[];
  commandCenterPreferences?: CommandCenterPreferences;
  reliabilitySettings?: Stage8ReliabilitySettings;
  recoverySnapshot?: BackupSnapshot | null;
  // Stage 9 Cloud Sync & Multi-Device
  cloudSyncSettings?: CloudSyncSettings;
}

const STORAGE_KEY = 'cashflow_storage_v9';
const LEGACY_STORAGE_KEYS = [
  'cashflow_storage_v8',
  'cashflow_storage_v7',
  'cashflow_storage_v6',
  'cashflow_storage_v5',
  'cashflow_storage_v4',
  'cashflow_storage_v3',
  'cashflow_storage_v2',
  'cashflow_storage_v1',
];
const SNAPSHOTS_STORAGE_KEY = 'cashflow_snapshots_v9';

const CORRUPTED_BACKUP_KEY = 'cashflow_recovery_corrupted';


export const KNOWN_DEMO_TRANSACTION_IDS = new Set<string>([
  'tx_salary',
  'tx_swiggy_payout',
  'tx_sms_swiggy_payout',
  'tx_rent',
  'tx_food_1',
  'tx_fuel_1',
  'tx_groceries',
  'tx_fuel_2',
  'tx_elec',
  'tx_phone_bill',
  'tx_medical',
  'tx_dining_weekend',
  'tx_debt_phonepe_paid',
  'tx_atm_withdrawal',
]);

export const KNOWN_DEMO_DEBT_IDS = new Set<string>([
  'debt_phonepe',
  'debt_cred',
  'debt_tvs',
  'debt_sbi_emi',
  'debt_lazypay',
]);

export const KNOWN_DEMO_EXPENSE_IDS = new Set<string>([
  'exp_rent',
  'exp_groceries',
  'exp_vegetables',
  'exp_fuel',
  'exp_electricity',
  'exp_phone',
  'exp_gas',
  'exp_water',
  'exp_medical',
  'exp_maintenance',
]);

export const KNOWN_DEMO_SHIFT_IDS = new Set<string>([
  'shift_today',
  'shift_plan_tomorrow',
  'shift_plan_sun',
  'shift_plan_mon',
  'shift_hist_1',
  'shift_hist_2',
  'shift_hist_3',
  'shift_hist_4',
  'shift_hist_5',
  'shift_hist_6',
  'shift_hist_7',
  'shift_hist_8',
  'shift_hist_9',
  'shift_hist_10',
  'shift_hist_11',
]);

export const KNOWN_DEMO_EARNING_IDS = new Set<string>([
  'sw_today',
  'sw_yest',
  'sw_2',
  'sw_3',
  'sw_4',
  'sw_5',
  'sw_6',
  'sw_7',
  'sw_8',
  'sw_9',
  'sw_10',
  'sw_11',
]);

export const KNOWN_DEMO_PAYMENT_IDS = new Set<string>([
  'pay_phonepe',
  'pay_cred',
  'pay_tvs',
  'pay_sbi',
  'pay_rent',
  'pay_phone',
]);

export const KNOWN_DEMO_ACCOUNT_IDS = new Set<string>([
  'acc_bank_hdfc',
  'acc_cash',
  'acc_paytm_wallet',
  'acc_emergency_savings',
  'acc_sbi_card',
]);

export const isDemoRecord = {
  debt: (d: { id: string; isDemo?: boolean }) => Boolean(d.isDemo || KNOWN_DEMO_DEBT_IDS.has(d.id)),
  expense: (e: { id: string; isDemo?: boolean }) => Boolean(e.isDemo || KNOWN_DEMO_EXPENSE_IDS.has(e.id)),
  shift: (s: { id: string; isDemo?: boolean }) => Boolean(s.isDemo || KNOWN_DEMO_SHIFT_IDS.has(s.id)),
  earning: (e: { id: string; isDemo?: boolean }) => Boolean(e.isDemo || KNOWN_DEMO_EARNING_IDS.has(e.id)),
  transaction: (t: { id: string; isDemo?: boolean }) => Boolean(t.isDemo || t.id.startsWith('tx_demo') || KNOWN_DEMO_TRANSACTION_IDS.has(t.id)),
  payment: (p: { id: string; isDemo?: boolean }) => Boolean(p.isDemo || KNOWN_DEMO_PAYMENT_IDS.has(p.id)),
  account: (a: { id: string; isDemo?: boolean }) => Boolean(a.isDemo || KNOWN_DEMO_ACCOUNT_IDS.has(a.id)),
  debtPayment: (dp: { id: string; isDemo?: boolean }) => Boolean(dp.isDemo || dp.id === 'dp_1'),
  recurring: (r: { id: string; isDemo?: boolean }) => Boolean(r.isDemo || r.id.startsWith('rec_')),
  budget: (b: { id: string; isDemo?: boolean }) => Boolean(b.isDemo || b.id.startsWith('b_')),
  goal: (g: { id: string; isDemo?: boolean }) => Boolean(g.isDemo || g.id.startsWith('goal_')),
  fuel: (f: { id: string; isDemo?: boolean }) => Boolean(f.isDemo || f.id.startsWith('fuel_')),
  candidate: (c: { id: string; isDemo?: boolean }) => Boolean(c.isDemo || c.id.startsWith('sms_demo')),
};

export function getDefaultDemoData(): AppState {
  const today = getCurrentDateISO();
  const currentMonth = getCurrentMonthKey();

  const profile: UserProfile = {
    id: 'user_default',
    name: 'VIJAY BABU GOVADA',
    currency: 'INR',
    locale: 'en-IN',
  };

  const categories: Category[] = [
    // Income
    { id: 'cat_salary', name: 'Salary', type: 'INCOME', classification: 'OTHER', icon: 'Briefcase', active: true },
    { id: 'cat_swiggy_inc', name: 'Swiggy Earnings', type: 'INCOME', classification: 'OTHER', icon: 'Bike', active: true },
    { id: 'cat_other_inc', name: 'Other Income', type: 'INCOME', classification: 'OTHER', icon: 'Wallet', active: true },

    // Essential Expenses
    { id: 'cat_rent', name: 'House Rent', type: 'EXPENSE', classification: 'ESSENTIAL', icon: 'Home', active: true },
    { id: 'cat_food', name: 'Food & Groceries', type: 'EXPENSE', classification: 'ESSENTIAL', icon: 'ShoppingBag', active: true },
    { id: 'cat_milk', name: 'Milk & Dairy', type: 'EXPENSE', classification: 'ESSENTIAL', icon: 'Coffee', active: true },
    { id: 'cat_fuel', name: 'Fuel & Petrol', type: 'EXPENSE', classification: 'ESSENTIAL', icon: 'Fuel', active: true },
    { id: 'cat_electricity', name: 'Electricity Bill', type: 'EXPENSE', classification: 'ESSENTIAL', icon: 'Zap', active: true },
    { id: 'cat_gas', name: 'Gas Cylinder', type: 'EXPENSE', classification: 'ESSENTIAL', icon: 'Flame', active: true },
    { id: 'cat_mobile', name: 'Phone & Internet', type: 'EXPENSE', classification: 'ESSENTIAL', icon: 'Wifi', active: true },
    { id: 'cat_medical', name: 'Medical & Pharmacy', type: 'EXPENSE', classification: 'ESSENTIAL', icon: 'HeartPulse', active: true },

    // Discretionary Expenses
    { id: 'cat_dining', name: 'Eating Out & Snacks', type: 'EXPENSE', classification: 'DISCRETIONARY', icon: 'Utensils', active: true },
    { id: 'cat_shopping', name: 'Shopping & Clothes', type: 'EXPENSE', classification: 'DISCRETIONARY', icon: 'ShoppingCart', active: true },
    { id: 'cat_entertainment', name: 'Entertainment & OTT', type: 'EXPENSE', classification: 'DISCRETIONARY', icon: 'Film', active: true },
    { id: 'cat_maintenance', name: 'Bike Maintenance', type: 'EXPENSE', classification: 'DISCRETIONARY', icon: 'Wrench', active: true },
    { id: 'cat_misc', name: 'Miscellaneous', type: 'EXPENSE', classification: 'DISCRETIONARY', icon: 'MoreHorizontal', active: true },

    // Debt Costs
    { id: 'cat_loan_interest', name: 'Loan Interest', type: 'EXPENSE', classification: 'DEBT_COST', icon: 'Percent', active: true },
    { id: 'cat_card_charges', name: 'Credit Card Interest/Fee', type: 'EXPENSE', classification: 'DEBT_COST', icon: 'AlertCircle', active: true },
  ];

  const accounts: Account[] = [
    {
      id: 'acc_bank_hdfc',
      name: 'HDFC Bank Salary Account',
      type: 'BANK',
      openingBalance: 12000,
      currentBalance: 12000,
      bankName: 'HDFC Bank',
      accountNumberMasked: '•••• 4921',
      isActive: true,
    },
    {
      id: 'acc_cash',
      name: 'Cash in Hand',
      type: 'CASH',
      openingBalance: 2000,
      currentBalance: 2000,
      isActive: true,
    },
    {
      id: 'acc_wallet',
      name: 'Paytm / UPI Wallet',
      type: 'WALLET',
      openingBalance: 850,
      currentBalance: 850,
      isActive: true,
    },
    {
      id: 'acc_sbi_card',
      name: 'SBI SimplyClick Credit Card',
      type: 'CREDIT_CARD',
      openingBalance: 15000, // 15k used
      currentBalance: 15000,
      bankName: 'SBI Cards',
      accountNumberMasked: '•••• 8301',
      isActive: true,
    },
    {
      id: 'acc_icici_card',
      name: 'ICICI Amazon Pay Credit Card',
      type: 'CREDIT_CARD',
      openingBalance: 4200, // 4.2k used
      currentBalance: 4200,
      bankName: 'ICICI Bank',
      accountNumberMasked: '•••• 1109',
      isActive: true,
    },
  ];

  const creditCards: CreditCard[] = [
    {
      id: 'cc_sbi',
      accountId: 'acc_sbi_card',
      creditLimit: 50000,
      statementDate: 12,
      paymentDueDate: 2,
      minimumDue: 1500,
      lastBilledAmount: 14800,
    },
    {
      id: 'cc_icici',
      accountId: 'acc_icici_card',
      creditLimit: 75000,
      statementDate: 20,
      paymentDueDate: 10,
      minimumDue: 500,
      lastBilledAmount: 4200,
    },
  ];

  const debts: Debt[] = [
    {
      id: 'debt_phonepe',
      name: 'PhonePe Personal Loan',
      type: 'PERSONAL_LOAN',
      purpose: 'Emergency',
      originalPrincipal: 90000,
      outstandingPrincipal: 72645,
      interestRate: 15.5,
      totalPayable: 116232,
      emiAmount: 4843,
      tenureMonths: 24,
      remainingMonths: 17,
      nextDueDate: `${currentMonth}-05`,
      status: 'ACTIVE',
      lenderName: 'PhonePe Lending / IDFC',
    },
    {
      id: 'debt_cred',
      name: 'Cred Cash Loan',
      type: 'PERSONAL_LOAN',
      purpose: 'Personal expense',
      originalPrincipal: 55000,
      outstandingPrincipal: 38400,
      interestRate: 14.2,
      totalPayable: 67872,
      emiAmount: 2828,
      tenureMonths: 24,
      remainingMonths: 14,
      nextDueDate: `${currentMonth}-07`,
      status: 'ACTIVE',
      lenderName: 'Cred Cash / LiquiLoans',
    },
    {
      id: 'debt_tvs',
      name: 'TVS Two-Wheeler Loan',
      type: 'TWO_WHEELER_LOAN',
      purpose: 'Vehicle',
      originalPrincipal: 85000,
      outstandingPrincipal: 54100,
      interestRate: 11.8,
      totalPayable: 108600,
      emiAmount: 3620,
      tenureMonths: 30,
      remainingMonths: 15,
      nextDueDate: `${currentMonth}-10`,
      status: 'ACTIVE',
      lenderName: 'TVS Credit Services',
    },
    {
      id: 'debt_sbi_emi',
      name: 'SBI Card Balance EMI',
      type: 'CREDIT_CARD',
      purpose: 'Credit card',
      originalPrincipal: 35000,
      outstandingPrincipal: 24350,
      interestRate: 15.0,
      totalPayable: 40896,
      emiAmount: 1704,
      tenureMonths: 24,
      remainingMonths: 15,
      nextDueDate: `${currentMonth}-15`,
      status: 'ACTIVE',
      lenderName: 'SBI Cards',
      associatedAccountId: 'acc_sbi_card',
    },
    {
      id: 'debt_lazypay',
      name: 'LazyPay BNPL',
      type: 'BNPL',
      purpose: 'Household expense',
      originalPrincipal: 15000,
      outstandingPrincipal: 6220,
      interestRate: 18.0,
      totalPayable: 16632,
      emiAmount: 1848,
      tenureMonths: 9,
      remainingMonths: 4,
      nextDueDate: `${currentMonth}-18`,
      status: 'ACTIVE',
      lenderName: 'LazyPay / PayU',
    },
  ];

  const debtPayments: DebtPayment[] = [
    {
      id: 'dp_1',
      debtId: 'debt_phonepe',
      transactionId: 'tx_prev_emi_1',
      amount: 4843,
      principalAmount: 4100,
      interestAmount: 743,
      feesAmount: 0,
      paymentDate: '2026-08-05',
    },
  ];

  const payments: Payment[] = [
    {
      id: 'pay_phonepe',
      title: 'PhonePe Loan EMI',
      amount: 4843,
      dueDate: `${currentMonth}-05`,
      type: 'EMI',
      status: 'UPCOMING',
      debtId: 'debt_phonepe',
      recurring: true,
    },
    {
      id: 'pay_cred',
      title: 'Cred Cash EMI',
      amount: 2828,
      dueDate: `${currentMonth}-07`,
      type: 'EMI',
      status: 'UPCOMING',
      debtId: 'debt_cred',
      recurring: true,
    },
    {
      id: 'pay_tvs',
      title: 'TVS Bike Loan EMI',
      amount: 3620,
      dueDate: `${currentMonth}-10`,
      type: 'EMI',
      status: 'UPCOMING',
      debtId: 'debt_tvs',
      recurring: true,
    },
    {
      id: 'pay_sbi',
      title: 'SBI Credit Card Payment',
      amount: 1704,
      dueDate: `${currentMonth}-15`,
      type: 'CREDIT_CARD',
      status: 'UPCOMING',
      debtId: 'debt_sbi_emi',
      recurring: true,
    },
    {
      id: 'pay_rent',
      title: 'House Rent',
      amount: 8000,
      dueDate: `${currentMonth}-01`,
      type: 'RENT',
      status: 'PAID',
      recurring: true,
    },
    {
      id: 'pay_phone',
      title: 'Airtel Broadband & Mobile',
      amount: 998,
      dueDate: `${currentMonth}-12`,
      type: 'PHONE',
      status: 'UPCOMING',
      recurring: true,
    },
  ];

  const recurringCommitments: RecurringCommitment[] = [
    { id: 'rec_rent', name: 'House Rent', amount: 8000, frequency: 'MONTHLY', nextDueDate: `${currentMonth}-01`, active: true },
    { id: 'rec_emi_tot', name: 'Loan EMIs Total', amount: 14843, frequency: 'MONTHLY', nextDueDate: `${currentMonth}-05`, active: true },
    { id: 'rec_internet', name: 'Airtel Broadband', amount: 998, frequency: 'MONTHLY', nextDueDate: `${currentMonth}-12`, active: true },
    { id: 'rec_milk', name: 'Country Delight Milk', amount: 1400, frequency: 'MONTHLY', nextDueDate: `${currentMonth}-03`, active: true },
  ];

  const essentialExpenses: EssentialExpenseItem[] = [
    { id: 'exp_rent', name: 'House Rent', amount: 8000, category: 'Rent', notes: 'Monthly rent paid to landlord' },
    { id: 'exp_groceries', name: 'Groceries & Provisions', amount: 3820, category: 'Groceries', notes: 'Monthly supermarket & staples' },
    { id: 'exp_vegetables', name: 'Vegetables & Fresh Market', amount: 1200, category: 'Vegetables', notes: 'Weekly fresh vegetables & fruits' },
    { id: 'exp_fuel', name: 'Commute & Personal Fuel', amount: 1250, category: 'Fuel', notes: 'Petrol for personal and daily travel' },
    { id: 'exp_electricity', name: 'Electricity Bill', amount: 1450, category: 'Electricity', notes: 'Monthly state electricity board bill' },
    { id: 'exp_phone', name: 'Phone & Internet', amount: 998, category: 'Phone', notes: 'Airtel broadband and mobile recharge' },
    { id: 'exp_gas', name: 'LPG Gas Cylinder', amount: 950, category: 'Gas', notes: 'Cooking gas refill' },
    { id: 'exp_water', name: 'Drinking Water Cans', amount: 350, category: 'Water', notes: 'Monthly 20L water cans' },
    { id: 'exp_medical', name: 'Medical & Pharmacy', amount: 800, category: 'Medical', notes: 'Regular medicines and pharmacy' },
    { id: 'exp_maintenance', name: 'Vehicle Maintenance', amount: 600, category: 'Vehicle maintenance', notes: 'Bike service & oil change reserve' },
  ];

  const budgets: Budget[] = [
    { id: 'b_food', categoryId: 'cat_food', month: currentMonth, limit: 5000 },
    { id: 'b_fuel', categoryId: 'cat_fuel', month: currentMonth, limit: 3000 },
    { id: 'b_dining', categoryId: 'cat_dining', month: currentMonth, limit: 2000 },
    { id: 'b_elec', categoryId: 'cat_electricity', month: currentMonth, limit: 2500 },
    { id: 'b_ent', categoryId: 'cat_entertainment', month: currentMonth, limit: 1500 },
  ];

  const goals: Goal[] = [
    {
      id: 'goal_emergency',
      name: 'Emergency Fund',
      targetAmount: 50000,
      currentAmount: 18000,
      targetDate: '2027-03-31',
      categoryIcon: 'ShieldAlert',
      status: 'IN_PROGRESS',
      type: 'EMERGENCY_FUND',
      priority: 'HIGH',
      monthlyContribution: 2500,
    },
    {
      id: 'goal_debt_free',
      name: 'Debt Free Milestone',
      targetAmount: 284620,
      currentAmount: 85000,
      targetDate: '2027-12-31',
      categoryIcon: 'Zap',
      status: 'IN_PROGRESS',
      type: 'DEBT_FREE',
      priority: 'HIGH',
      monthlyContribution: 8000,
    },
    {
      id: 'goal_bike_maintenance',
      name: 'Bike Maintenance & Tyres',
      targetAmount: 8000,
      currentAmount: 4500,
      targetDate: '2026-11-30',
      categoryIcon: 'Wrench',
      status: 'IN_PROGRESS',
      type: 'BIKE_MAINTENANCE',
      priority: 'NORMAL',
      monthlyContribution: 1000,
    },
    {
      id: 'goal_savings',
      name: 'Family Savings Reserve',
      targetAmount: 30000,
      currentAmount: 12000,
      targetDate: '2027-05-31',
      categoryIcon: 'Sparkles',
      status: 'IN_PROGRESS',
      type: 'SAVINGS',
      priority: 'NORMAL',
      monthlyContribution: 1500,
    },
  ];

  const swiggyEarnings: SwiggyEarning[] = [
    { id: 'sw_today', date: today, amount: 780, grossEarnings: 900, fuelExpense: 90, otherExpenses: 30, orders: 15, hoursWorked: 5.5, source: 'MANUAL', notes: 'Lunch shift + incentives' },
    { id: 'sw_yest', date: '2026-09-24', amount: 680, orders: 15, hoursWorked: 5.5, source: 'MANUAL', notes: 'Dinner surge orders' },
    { id: 'sw_2', date: '2026-09-22', amount: 540, orders: 11, hoursWorked: 4, source: 'MANUAL' },
    { id: 'sw_3', date: '2026-09-20', amount: 720, orders: 16, hoursWorked: 6, source: 'MANUAL' },
    { id: 'sw_4', date: '2026-09-18', amount: 610, orders: 13, hoursWorked: 5, source: 'MANUAL' },
    { id: 'sw_5', date: '2026-09-15', amount: 850, orders: 18, hoursWorked: 7, source: 'MANUAL', notes: 'Weekend rain bonus' },
    { id: 'sw_6', date: '2026-09-12', amount: 640, orders: 14, hoursWorked: 5, source: 'MANUAL' },
    { id: 'sw_7', date: '2026-09-10', amount: 580, orders: 12, hoursWorked: 4.5, source: 'MANUAL' },
    { id: 'sw_8', date: '2026-09-08', amount: 700, orders: 15, hoursWorked: 5.5, source: 'MANUAL' },
    { id: 'sw_9', date: '2026-09-05', amount: 780, orders: 17, hoursWorked: 6.5, source: 'MANUAL' },
    { id: 'sw_10', date: '2026-09-03', amount: 620, orders: 13, hoursWorked: 5, source: 'MANUAL' },
    { id: 'sw_11', date: '2026-09-01', amount: 1200, orders: 24, hoursWorked: 9, source: 'MANUAL', notes: 'Full day holiday shift' },
  ];

  const swiggyShifts: SwiggyShift[] = [
    // Today's completed shift
    {
      id: 'shift_today',
      date: today,
      slot: 'LUNCH',
      status: 'COMPLETED',
      startTime: '12:00',
      endTime: '16:30',
      hoursWorked: 5,
      orders: 15,
      targetOrders: 15,
      basePay: 600,
      surgeIncentives: 220,
      tips: 80,
      grossEarnings: 900,
      fuelExpense: 90,
      fuelLitres: 0.9,
      kmDriven: 40,
      otherExpenses: 30,
      expenseNotes: 'Water and snack',
      netEarnings: 780,
      notes: 'Lunch shift in Hitec City, good surge orders',
      source: 'MANUAL',
    },
    // Tomorrow's planned shift (Shift Planning Engine)
    {
      id: 'shift_plan_tomorrow',
      date: '2026-09-26',
      slot: 'DINNER',
      status: 'PLANNED',
      startTime: '18:30',
      endTime: '23:30',
      hoursWorked: 5,
      orders: 0,
      targetOrders: 16,
      basePay: 0,
      surgeIncentives: 0,
      tips: 0,
      grossEarnings: 0,
      fuelExpense: 0,
      otherExpenses: 0,
      netEarnings: 0,
      notes: 'Weekend dinner surge shift planned',
      source: 'MANUAL',
    },
    // Sunday planned shift
    {
      id: 'shift_plan_sun',
      date: '2026-09-27',
      slot: 'DINNER',
      status: 'PLANNED',
      startTime: '19:00',
      endTime: '23:30',
      hoursWorked: 4.5,
      orders: 0,
      targetOrders: 18,
      basePay: 0,
      surgeIncentives: 0,
      tips: 0,
      grossEarnings: 0,
      fuelExpense: 0,
      otherExpenses: 0,
      netEarnings: 0,
      notes: 'Sunday evening delivery slot',
      source: 'MANUAL',
    },
    // Historical completed shifts with full operational breakdown
    {
      id: 'shift_hist_1',
      date: '2026-09-24',
      slot: 'DINNER',
      status: 'COMPLETED',
      hoursWorked: 5.5,
      orders: 15,
      targetOrders: 15,
      basePay: 490,
      surgeIncentives: 150,
      tips: 40,
      grossEarnings: 680,
      fuelExpense: 110,
      fuelLitres: 1.1,
      kmDriven: 48,
      otherExpenses: 20,
      netEarnings: 550,
      notes: 'Dinner surge orders completed',
      source: 'MANUAL',
    },
    {
      id: 'shift_hist_2',
      date: '2026-09-22',
      slot: 'LUNCH',
      status: 'COMPLETED',
      hoursWorked: 4,
      orders: 11,
      targetOrders: 12,
      basePay: 390,
      surgeIncentives: 110,
      tips: 40,
      grossEarnings: 540,
      fuelExpense: 90,
      fuelLitres: 0.9,
      kmDriven: 38,
      otherExpenses: 0,
      netEarnings: 450,
      source: 'MANUAL',
    },
    {
      id: 'shift_hist_3',
      date: '2026-09-20',
      slot: 'DINNER',
      status: 'COMPLETED',
      hoursWorked: 6,
      orders: 16,
      targetOrders: 15,
      basePay: 520,
      surgeIncentives: 160,
      tips: 40,
      grossEarnings: 720,
      fuelExpense: 120,
      fuelLitres: 1.2,
      kmDriven: 52,
      otherExpenses: 30,
      netEarnings: 570,
      source: 'MANUAL',
    },
    {
      id: 'shift_hist_4',
      date: '2026-09-18',
      slot: 'DINNER',
      status: 'COMPLETED',
      hoursWorked: 5,
      orders: 13,
      targetOrders: 14,
      basePay: 440,
      surgeIncentives: 130,
      tips: 40,
      grossEarnings: 610,
      fuelExpense: 100,
      fuelLitres: 1.0,
      kmDriven: 42,
      otherExpenses: 0,
      netEarnings: 510,
      source: 'MANUAL',
    },
    {
      id: 'shift_hist_5',
      date: '2026-09-15',
      slot: 'FULL_DAY',
      status: 'COMPLETED',
      hoursWorked: 7,
      orders: 18,
      targetOrders: 18,
      basePay: 610,
      surgeIncentives: 190,
      tips: 50,
      grossEarnings: 850,
      fuelExpense: 150,
      fuelLitres: 1.5,
      kmDriven: 65,
      otherExpenses: 40,
      netEarnings: 660,
      notes: 'Weekend rain bonus shift',
      source: 'MANUAL',
    },
    {
      id: 'shift_hist_6',
      date: '2026-09-12',
      slot: 'DINNER',
      status: 'COMPLETED',
      hoursWorked: 5,
      orders: 14,
      targetOrders: 14,
      basePay: 460,
      surgeIncentives: 140,
      tips: 40,
      grossEarnings: 640,
      fuelExpense: 110,
      fuelLitres: 1.1,
      kmDriven: 46,
      otherExpenses: 0,
      netEarnings: 530,
      source: 'MANUAL',
    },
    {
      id: 'shift_hist_7',
      date: '2026-09-10',
      slot: 'LUNCH',
      status: 'COMPLETED',
      hoursWorked: 4.5,
      orders: 12,
      targetOrders: 12,
      basePay: 420,
      surgeIncentives: 120,
      tips: 40,
      grossEarnings: 580,
      fuelExpense: 100,
      fuelLitres: 1.0,
      kmDriven: 40,
      otherExpenses: 0,
      netEarnings: 480,
      source: 'MANUAL',
    },
    {
      id: 'shift_hist_8',
      date: '2026-09-08',
      slot: 'DINNER',
      status: 'COMPLETED',
      hoursWorked: 5.5,
      orders: 15,
      targetOrders: 15,
      basePay: 500,
      surgeIncentives: 150,
      tips: 50,
      grossEarnings: 700,
      fuelExpense: 120,
      fuelLitres: 1.2,
      kmDriven: 50,
      otherExpenses: 20,
      netEarnings: 560,
      source: 'MANUAL',
    },
    {
      id: 'shift_hist_9',
      date: '2026-09-05',
      slot: 'DINNER',
      status: 'COMPLETED',
      hoursWorked: 6.5,
      orders: 17,
      targetOrders: 16,
      basePay: 560,
      surgeIncentives: 170,
      tips: 50,
      grossEarnings: 780,
      fuelExpense: 130,
      fuelLitres: 1.3,
      kmDriven: 56,
      otherExpenses: 30,
      netEarnings: 620,
      source: 'MANUAL',
    },
    {
      id: 'shift_hist_10',
      date: '2026-09-03',
      slot: 'LUNCH',
      status: 'COMPLETED',
      hoursWorked: 5,
      orders: 13,
      targetOrders: 13,
      basePay: 450,
      surgeIncentives: 130,
      tips: 40,
      grossEarnings: 620,
      fuelExpense: 110,
      fuelLitres: 1.1,
      kmDriven: 44,
      otherExpenses: 0,
      netEarnings: 510,
      source: 'MANUAL',
    },
    {
      id: 'shift_hist_11',
      date: '2026-09-01',
      slot: 'FULL_DAY',
      status: 'COMPLETED',
      hoursWorked: 9,
      orders: 24,
      targetOrders: 20,
      basePay: 860,
      surgeIncentives: 260,
      tips: 80,
      grossEarnings: 1200,
      fuelExpense: 200,
      fuelLitres: 2.0,
      kmDriven: 85,
      otherExpenses: 50,
      netEarnings: 950,
      notes: 'Full day holiday shift milestone',
      source: 'MANUAL',
    },
  ];

  const fuelLogs: FuelLog[] = [
    {
      id: 'fuel_1',
      date: today,
      amount: 300,
      litres: 2.9,
      odometerKm: 24850,
      bunkName: 'Indian Oil Bunk - Gachibowli',
      notes: 'Shift refill',
      linkedTxId: 'tx_fuel_1',
    },
    {
      id: 'fuel_2',
      date: `${currentMonth}-14`,
      amount: 500,
      litres: 4.8,
      odometerKm: 24620,
      bunkName: 'HP Petrol Pump',
      notes: 'Full tank for week',
    },
    {
      id: 'fuel_3',
      date: `${currentMonth}-05`,
      amount: 450,
      litres: 4.3,
      odometerKm: 24380,
      bunkName: 'Bharat Petroleum',
      notes: 'Delivery fuel top up',
    },
  ];

  const swiggyTargets: SwiggyOperationalTargets = {
    dailyEarningsTarget: 700,
    dailyOrdersTarget: 15,
    monthlyEarningsTarget: 18000,
    monthlyShiftsTarget: 26,
  };

  // Realistic Transactions for the current month
  const transactions: Transaction[] = [
    // Income
    {
      id: 'tx_salary',
      date: `${currentMonth}-01`,
      amount: 21000,
      type: 'INCOME',
      accountId: 'acc_bank_hdfc',
      categoryId: 'cat_salary',
      description: 'Monthly Company Salary',
      notes: 'Direct bank credit',
      source: 'SYSTEM',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tx_swiggy_payout',
      date: `${currentMonth}-15`,
      amount: 8500,
      type: 'INCOME',
      accountId: 'acc_bank_hdfc',
      categoryId: 'cat_swiggy_inc',
      description: 'Swiggy Weekly Delivery Payout',
      notes: 'Orders + peak pay incentives',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tx_sms_swiggy_payout',
      date: '2026-09-24',
      amount: 640,
      type: 'INCOME',
      accountId: 'acc_bank_hdfc',
      categoryId: 'cat_swiggy_inc',
      description: 'HDFC Bank: Rs 640.00 credited by VPA swiggy@icici (UPI Ref 426819238129)',
      notes: 'Detected from HDFC Bank SMS alert. Ready to match with Swiggy Shift.',
      source: 'SMS',
      verificationStatus: 'PENDING_REVIEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Expenses - Essential
    {
      id: 'tx_rent',
      date: `${currentMonth}-01`,
      amount: 8000,
      type: 'EXPENSE',
      accountId: 'acc_bank_hdfc',
      categoryId: 'cat_rent',
      description: 'House Rent to Landlord',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tx_food_1',
      date: today,
      amount: 120,
      type: 'EXPENSE',
      accountId: 'acc_cash',
      categoryId: 'cat_dining',
      description: 'Lunch & Chai',
      notes: 'Meals while on delivery shift',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tx_fuel_1',
      date: today,
      amount: 300,
      type: 'EXPENSE',
      accountId: 'acc_cash',
      categoryId: 'cat_fuel',
      description: 'Bike Petrol Refill',
      notes: 'Indian Oil petrol bunk',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tx_groceries',
      date: `${currentMonth}-08`,
      amount: 3820,
      type: 'EXPENSE',
      accountId: 'acc_bank_hdfc',
      categoryId: 'cat_food',
      description: 'DMart Monthly Provisions',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tx_fuel_2',
      date: `${currentMonth}-14`,
      amount: 1800,
      type: 'EXPENSE',
      accountId: 'acc_bank_hdfc',
      categoryId: 'cat_fuel',
      description: 'Petrol for Swiggy Delivery',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tx_elec',
      date: `${currentMonth}-10`,
      amount: 1650,
      type: 'EXPENSE',
      accountId: 'acc_bank_hdfc',
      categoryId: 'cat_electricity',
      description: 'Electricity Bill Payment',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tx_phone_bill',
      date: `${currentMonth}-12`,
      amount: 998,
      type: 'EXPENSE',
      accountId: 'acc_bank_hdfc',
      categoryId: 'cat_mobile',
      description: 'Airtel Broadband & Mobile',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tx_medical',
      date: `${currentMonth}-18`,
      amount: 750,
      type: 'EXPENSE',
      accountId: 'acc_bank_hdfc',
      categoryId: 'cat_medical',
      description: 'Apollo Pharmacy Medicines',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Expenses - Discretionary
    {
      id: 'tx_dining_weekend',
      date: `${currentMonth}-16`,
      amount: 850,
      type: 'EXPENSE',
      accountId: 'acc_bank_hdfc',
      categoryId: 'cat_dining',
      description: 'Family Dinner Out',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Debt Payment: PhonePe EMI paid last month
    {
      id: 'tx_debt_phonepe_paid',
      date: `${currentMonth}-05`,
      amount: 4843,
      type: 'DEBT_PAYMENT',
      accountId: 'acc_bank_hdfc',
      debtId: 'debt_phonepe',
      principalAmount: 4100,
      interestAmount: 743,
      description: 'PhonePe Loan EMI Auto-debit',
      notes: 'Principal ₹4,100 + Interest ₹743',
      source: 'SYSTEM',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Transfer: Bank to Cash
    {
      id: 'tx_atm_withdrawal',
      date: `${currentMonth}-04`,
      amount: 2000,
      type: 'TRANSFER',
      accountId: 'acc_bank_hdfc',
      toAccountId: 'acc_cash',
      description: 'ATM Cash Withdrawal',
      notes: 'Cash in hand for daily expenses',
      source: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    profile,
    monthlySalary: 21000,
    essentialExpenses: essentialExpenses.map((e) => ({ ...e, isDemo: true })),
    accounts: accounts.map((a) => ({ ...a, isDemo: true })),
    creditCards,
    categories,
    transactions: transactions.map((t) => ({ ...t, isDemo: true })),
    debts: debts.map((d) => ({ ...d, isDemo: true })),
    debtPayments: debtPayments.map((dp) => ({ ...dp, isDemo: true })),
    payments: payments.map((p) => ({ ...p, isDemo: true })),
    recurringCommitments: recurringCommitments.map((r) => ({ ...r, isDemo: true })),
    budgets: budgets.map((b) => ({ ...b, isDemo: true })),
    goals: goals.map((g) => ({ ...g, isDemo: true })),
    swiggyEarnings: swiggyEarnings.map((se) => ({ ...se, isDemo: true })),
    swiggyShifts: swiggyShifts.map((ss) => ({ ...ss, isDemo: true })),
    fuelLogs: fuelLogs.map((fl) => ({ ...fl, isDemo: true })),
    swiggyTargets,
    cashBufferSetting: {
      minimumCashBuffer: 0,
      enabled: true,
    },
    smsPrivacySettings: {
      retainRawSmsText: true,
      autoDeleteRawTextAfterReview: false,
    },
    smsCandidates: [
      {
        id: 'sms_demo_1',
        rawText: 'Your A/c XX4128 is debited by Rs. 1,704.00 on 26-09-2026 towards EMI. Avail Bal: Rs 14,296.00',
        normalizedText: 'Your A/c XX4128 is debited by Rs 1704.00 on 26-09-2026 towards EMI. Avail Bal: Rs 14296.00',
        sender: 'HDFC Bank',
        receivedAt: '2026-09-26T10:15:00.000Z',
        detectedTransactionDate: '2026-09-26',
        detectedAmount: 1704,
        currency: 'INR',
        transactionType: 'DEBT_PAYMENT',
        detectedAccountReference: 'XXXX4128',
        detectedDescription: 'Debit towards EMI',
        detectedCategory: 'cat_loan_interest',
        parserConfidence: 'HIGH',
        reviewStatus: 'PENDING',
        source: 'MANUAL_PASTE',
        createdAt: '2026-09-26T10:15:00.000Z',
        totalDue: 1704,
        isDemo: true,
      },
      {
        id: 'sms_demo_2',
        rawText: 'HDFC Bank: Rs 640.00 credited to a/c **4128 on 24-09-2026 by VPA swiggy@icici (UPI Ref 426819238129).',
        normalizedText: 'HDFC Bank: Rs 640.00 credited to a/c **4128 on 24-09-2026 by VPA swiggy@icici (UPI Ref 426819238129).',
        sender: 'HDFC Bank',
        receivedAt: '2026-09-24T23:45:00.000Z',
        detectedTransactionDate: '2026-09-24',
        detectedAmount: 640,
        currency: 'INR',
        transactionType: 'INCOME',
        detectedAccountReference: 'XXXX4128',
        detectedMerchant: 'Swiggy',
        detectedPayee: 'Swiggy / Bundl Technologies',
        detectedDescription: 'Swiggy Delivery Payout',
        detectedCategory: 'cat_swiggy_inc',
        parserConfidence: 'HIGH',
        reviewStatus: 'PENDING',
        source: 'MANUAL_PASTE',
        matchedSwiggyShiftId: 'shift_hist_1',
        createdAt: '2026-09-24T23:45:00.000Z',
        isDemo: true,
      },
    ],
    notifications: [
      {
        id: 'notif_welcome_1',
        type: 'PAYMENT_DUE',
        priority: 'HIGH',
        status: 'UNREAD',
        title: 'PhonePe Loan EMI Due Soon',
        message: 'PhonePe Loan EMI is due in 3 days — ₹4,843.',
        source: 'PAYMENT_CENTER',
        createdAt: new Date().toISOString(),
        actionLabel: 'View Payment',
        actionRoute: '/payments',
        dedupeKey: 'demo:phonepe_emi_3days',
      },
      {
        id: 'notif_welcome_2',
        type: 'SMS_REVIEW',
        priority: 'NORMAL',
        status: 'UNREAD',
        title: '2 SMS Transactions Need Review',
        message: '2 SMS transactions (₹2,344) waiting for your review and confirmation.',
        source: 'SMS',
        createdAt: new Date().toISOString(),
        actionLabel: 'Review SMS',
        actionRoute: '/sms',
        dedupeKey: 'demo:sms_review_2',
      },
    ],
    notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
    notificationSchedulerState: {
      lastEvaluationAt: new Date().toISOString(),
    },
    stage7PlanningSettings: {
      preferredDebtStrategy: 'STANDARD',
      targetEmergencyMonths: 3,
      savedScenarios: [],
    },
    backupSnapshots: [],
    auditEvents: [],
    errorLogs: [],
    commandCenterPreferences: {
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
    },
    reliabilitySettings: {
      auditRetentionDays: 365,
      maxSnapshots: 10,
      autoIntegrityCheckOnLoad: true,
    },
    recoverySnapshot: null,
    cloudSyncSettings: {
      syncEnabled: true,
      autoSyncOnOnline: true,
      syncIntervalMinutes: 5,
      allowRawSmsCloudSync: false,
      activeDeviceId: 'dev_default',
    },
    version: SCHEMA_VERSION,
  };
}

export const StorageService = {
  loadState(): AppState {
    try {
      let data = localStorage.getItem(STORAGE_KEY);
      let detectedLegacyKey: string | null = null;
      
      // If v9 key doesn't exist, check legacy keys to migrate (v8, v7, v6, v5, v4, v3, v2, v1)
      if (!data) {
        for (const legacyKey of LEGACY_STORAGE_KEYS) {
          const legacyData = localStorage.getItem(legacyKey);
          if (legacyData) {
            data = legacyData;
            detectedLegacyKey = legacyKey;
            break;
          }
        }
      }

      if (!data) {
        const initial = getDefaultDemoData();
        this.saveState(initial);
        return initial;
      }

      let parsed: AppState;
      try {
        parsed = JSON.parse(data) as AppState;
      } catch (parseError) {
        // Migration rule: If parsing fails, do NOT wipe user data!
        console.error('Storage corrupted, creating recovery snapshot:', parseError);
        const corruptedSnapshot: BackupSnapshot = {
          id: `snap_corrupt_${Date.now()}`,
          createdAt: new Date().toISOString(),
          reason: 'REPAIR',
          schemaVersion: 0,
          recordCount: 0,
          stateData: data,
          description: 'Corrupted payload recovered from localStorage',
        };
        try {
          localStorage.setItem(CORRUPTED_BACKUP_KEY, JSON.stringify(corruptedSnapshot));
        } catch {
          // ignore localStorage full
        }
        const fallback = getDefaultDemoData();
        fallback.recoverySnapshot = corruptedSnapshot;
        return fallback;
      }

      // Step 2 & 3: Detect version & create recovery snapshot before migrating if legacy version detected
      if ((detectedLegacyKey || parsed.version < SCHEMA_VERSION) && parsed.version < SCHEMA_VERSION) {
        try {
          const preMigrationSnapshot: BackupSnapshot = {
            id: `snap_premigration_v${parsed.version || 1}_${Date.now()}`,
            createdAt: new Date().toISOString(),
            reason: 'MIGRATION',
            schemaVersion: parsed.version || 1,
            recordCount: (parsed.transactions?.length || 0) + (parsed.accounts?.length || 0),
            stateData: data,
            description: `Auto snapshot before migration from v${parsed.version || 1} to v${SCHEMA_VERSION}`,
          };
          this.saveSnapshot(preMigrationSnapshot);
        } catch (snapErr) {
          console.warn('Failed to save pre-migration snapshot:', snapErr);
        }
      }

      // Step 4 & 5: Migrate & Normalize to latest schema version
      const defaultData = getDefaultDemoData();
      const existingShifts = Array.isArray(parsed.swiggyShifts)
        ? parsed.swiggyShifts
        : (Array.isArray(parsed.swiggyEarnings) && parsed.swiggyEarnings.length > 0
          ? parsed.swiggyEarnings.map(normalizeSwiggyShift)
          : defaultData.swiggyShifts);

      const migrated: AppState = {
        ...parsed,
        version: SCHEMA_VERSION,
        monthlySalary: typeof parsed.monthlySalary === 'number' ? parsed.monthlySalary : (defaultData.monthlySalary || 21000),
        essentialExpenses: Array.isArray(parsed.essentialExpenses) ? parsed.essentialExpenses : (defaultData.essentialExpenses || []),
        profile: parsed.profile || defaultData.profile,
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : defaultData.accounts,
        creditCards: Array.isArray(parsed.creditCards) ? parsed.creditCards : defaultData.creditCards,
        categories: Array.isArray(parsed.categories) ? parsed.categories : defaultData.categories,
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : defaultData.transactions,
        debts: (Array.isArray(parsed.debts) ? parsed.debts : defaultData.debts).map((d: Debt) => ({
          ...d,
          purpose: d.purpose || resolveLoanPurpose(d),
        })),
        debtPayments: Array.isArray(parsed.debtPayments) ? parsed.debtPayments : defaultData.debtPayments,
        payments: Array.isArray(parsed.payments) ? parsed.payments : defaultData.payments,
        recurringCommitments: Array.isArray(parsed.recurringCommitments) ? parsed.recurringCommitments : defaultData.recurringCommitments,
        budgets: Array.isArray(parsed.budgets) ? parsed.budgets : defaultData.budgets,
        goals: Array.isArray(parsed.goals) ? parsed.goals : defaultData.goals,
        swiggyEarnings: Array.isArray(parsed.swiggyEarnings) ? parsed.swiggyEarnings : defaultData.swiggyEarnings,
        swiggyShifts: existingShifts,
        fuelLogs: Array.isArray(parsed.fuelLogs) ? parsed.fuelLogs : defaultData.fuelLogs,
        swiggyTargets: parsed.swiggyTargets || defaultData.swiggyTargets,
        cashBufferSetting: parsed.cashBufferSetting || {
          minimumCashBuffer: 0,
          enabled: true,
        },
        smsPrivacySettings: parsed.smsPrivacySettings || defaultData.smsPrivacySettings,
        smsCandidates: Array.isArray(parsed.smsCandidates) ? parsed.smsCandidates : defaultData.smsCandidates,
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : defaultData.notifications,
        notificationSettings: parsed.notificationSettings || defaultData.notificationSettings,
        notificationSchedulerState: parsed.notificationSchedulerState || defaultData.notificationSchedulerState,
        stage7PlanningSettings: parsed.stage7PlanningSettings || defaultData.stage7PlanningSettings,
        // Stage 8 properties
        backupSnapshots: parsed.backupSnapshots || this.getSnapshots(),
        auditEvents: parsed.auditEvents || [],
        errorLogs: parsed.errorLogs || [],
        commandCenterPreferences: parsed.commandCenterPreferences || defaultData.commandCenterPreferences,
        reliabilitySettings: parsed.reliabilitySettings || defaultData.reliabilitySettings,
        recoverySnapshot: parsed.recoverySnapshot || this.getRecoverySnapshot(),
        cloudSyncSettings: parsed.cloudSyncSettings || defaultData.cloudSyncSettings,
      };

      // Step 6 & 7: Write latest version & Verify
      if (parsed.version !== SCHEMA_VERSION || detectedLegacyKey) {
        this.saveState(migrated);
      }

      return migrated;
    } catch (err) {
      console.error('Failed to load state from localStorage:', err);
      return getDefaultDemoData();
    }
  },

  saveState(state: AppState): boolean {
    try {
      const payload: AppState = {
        ...state,
        version: SCHEMA_VERSION,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error('Failed to persist state to localStorage:', err);
      return false;
    }
  },


  clearState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear localStorage:', err);
    }
  },

  resetDemoData(): AppState {
    const fresh = getDefaultDemoData();
    this.saveState(fresh);
    return fresh;
  },

  createLocalSnapshot(state: AppState, reason: SnapshotReason, description?: string): BackupSnapshot {
    const snapshot: BackupSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      reason,
      schemaVersion: state.version || 8,
      recordCount:
        (state.accounts?.length || 0) +
        (state.transactions?.length || 0) +
        (state.debts?.length || 0) +
        (state.payments?.length || 0),
      stateData: JSON.stringify(state),
      description: description || `Snapshot created for ${reason}`,
    };
    this.saveSnapshot(snapshot);
    return snapshot;
  },

  getSnapshots(): BackupSnapshot[] {
    try {
      const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as BackupSnapshot[];
    } catch {
      return [];
    }
  },

  saveSnapshot(snapshot: BackupSnapshot): void {
    try {
      const existing = this.getSnapshots();
      // Keep up to 10 snapshots max per retention rule
      const updated = [snapshot, ...existing.filter((s) => s.id !== snapshot.id)].slice(0, 10);
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save snapshot to storage:', err);
    }
  },

  restoreSnapshot(snapshotId: string): AppState | null {
    try {
      const snapshots = this.getSnapshots();
      const target = snapshots.find((s) => s.id === snapshotId);
      if (!target) return null;
      const parsed = JSON.parse(target.stateData) as AppState;
      this.saveState(parsed);
      return parsed;
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
      return null;
    }
  },

  deleteSnapshot(snapshotId: string): void {
    try {
      const snapshots = this.getSnapshots().filter((s) => s.id !== snapshotId);
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
    } catch (err) {
      console.warn('Failed to delete snapshot:', err);
    }
  },

  getRecoverySnapshot(): BackupSnapshot | null {
    try {
      const raw = localStorage.getItem(CORRUPTED_BACKUP_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as BackupSnapshot;
    } catch {
      return null;
    }
  },

  clearRecoverySnapshot(): void {
    try {
      localStorage.removeItem(CORRUPTED_BACKUP_KEY);
    } catch (err) {
      console.warn('Failed to clear recovery snapshot:', err);
    }
  },

  exportStateToJson(): string {
    const state = this.loadState();
    return JSON.stringify(state, null, 2);
  },

  importStateFromJson(jsonString: string): AppState {
    const parsed = JSON.parse(jsonString) as AppState;
    if (!parsed.profile || !parsed.accounts || !parsed.transactions) {
      throw new Error('Invalid Cash Flow data format');
    }
    this.saveState(parsed);
    return parsed;
  },
};

