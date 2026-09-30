export type AccountType = 'BANK' | 'CASH' | 'WALLET' | 'CREDIT_CARD' | 'OTHER';

export interface UserProfile {
  id: string;
  name: string;
  currency: 'INR';
  locale: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number; // dynamically computed or synced
  accountNumberMasked?: string;
  bankName?: string;
  isActive: boolean;
  lastReconciledDate?: string;
  lastReconciledBalance?: number;
  isDemo?: boolean;
}

export interface CreditCard {
  id: string;
  accountId: string;
  creditLimit: number;
  statementDate?: number;
  paymentDueDate?: number;
  minimumDue?: number;
  lastBilledAmount?: number;
}

export type TransactionType =
  | 'INCOME'
  | 'EXPENSE'
  | 'TRANSFER'
  | 'DEBT_PAYMENT'
  | 'DEBT_DRAW'
  | 'REFUND'
  | 'ADJUSTMENT';

export type TransactionSource =
  | 'MANUAL'
  | 'SMS'
  | 'SWIGGY_SHIFT'
  | 'IMPORT'
  | 'SYSTEM'
  | 'ADJUSTMENT';

export type VerificationStatus = 'CONFIRMED' | 'PENDING_REVIEW' | 'NEEDS_VERIFICATION';

export interface TransactionSourceReference {
  sourceType: 'MANUAL' | 'SMS' | 'SWIGGY_SHIFT' | 'IMPORT' | 'SYSTEM';
  sourceId?: string;
  smsCandidateId?: string;
  importedAt?: string;
  confirmedAt?: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO YYYY-MM-DD
  amount: number;
  type: TransactionType;
  accountId: string;
  toAccountId?: string; // used for TRANSFER
  categoryId?: string;
  debtId?: string; // linked debt if DEBT_PAYMENT
  principalAmount?: number; // split for debt payments
  interestAmount?: number; // split for debt payments
  feesAmount?: number; // split for debt payments
  description?: string;
  notes?: string;
  source: TransactionSource;
  sourceReference?: TransactionSourceReference;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export type DebtType =
  | 'PERSONAL_LOAN'
  | 'CREDIT_CARD'
  | 'TWO_WHEELER_LOAN'
  | 'TWO_WHEELER'
  | 'GOLD_LOAN'
  | 'BNPL'
  | 'OTHER';

export type DebtStatus = 'ACTIVE' | 'CLOSED';

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  purpose?: string; // e.g. "Household expense", "Medical expense", "Vehicle", "Personal expense", "Credit card", "Emergency", "Gold loan", "Existing debt repayment", "Other", or custom
  originalPrincipal: number;
  outstandingPrincipal: number;
  principalAmount?: number; // legacy/alias for originalPrincipal
  interestRate?: number; // annual %
  totalPayable?: number;
  emiAmount?: number;
  tenureMonths?: number;
  remainingMonths?: number;
  nextDueDate?: string; // ISO YYYY-MM-DD
  status: DebtStatus;
  lenderName?: string;
  associatedAccountId?: string; // for credit cards
  isDemo?: boolean;
}

export interface EssentialExpenseItem {
  id: string;
  name: string;
  category?: string;
  amount: number;
  notes?: string;
  isDemo?: boolean;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  transactionId: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  feesAmount: number;
  paymentDate: string;
  isDemo?: boolean;
}

export type PaymentType =
  | 'EMI'
  | 'CREDIT_CARD'
  | 'RENT'
  | 'UTILITY'
  | 'PHONE'
  | 'SUBSCRIPTION'
  | 'OTHER';

export type PaymentStatus = 'UPCOMING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface Payment {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // ISO YYYY-MM-DD
  type: PaymentType;
  status: PaymentStatus;
  debtId?: string;
  recurring?: boolean;
  category?: string;
  isDemo?: boolean;
}

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface RecurringCommitment {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  nextDueDate: string;
  categoryId?: string;
  active: boolean;
  isDemo?: boolean;
}

export type CategoryClassification = 'ESSENTIAL' | 'DISCRETIONARY' | 'DEBT_COST' | 'OTHER';

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  classification: CategoryClassification;
  icon: string;
  color?: string;
  active: boolean;
}

export interface Budget {
  id: string;
  categoryId: string;
  month: string; // YYYY-MM
  limit: number;
  isDemo?: boolean;
}

export type GoalStatus = 'IN_PROGRESS' | 'ACHIEVED' | 'PAUSED';

export type FinancialGoalType =
  | 'EMERGENCY_FUND'
  | 'DEBT_FREE'
  | 'SAVINGS'
  | 'PURCHASE'
  | 'BIKE_MAINTENANCE'
  | 'EDUCATION'
  | 'FAMILY'
  | 'CUSTOM';

export type GoalPriority = 'LOW' | 'NORMAL' | 'HIGH';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  categoryIcon?: string;
  status: GoalStatus;
  type?: FinancialGoalType;
  priority?: GoalPriority;
  monthlyContribution?: number;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
  isDemo?: boolean;
}

export type SwiggyShiftSlot = 'LUNCH' | 'DINNER' | 'LATE_NIGHT' | 'FULL_DAY' | 'CUSTOM';
export type SwiggyShiftStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface SwiggyShift {
  id: string;
  date: string; // YYYY-MM-DD
  slot: SwiggyShiftSlot;
  status: SwiggyShiftStatus;
  startTime?: string;
  endTime?: string;
  hoursWorked?: number;
  orders: number;
  targetOrders?: number;
  basePay: number;
  surgeIncentives: number;
  tips: number;
  grossEarnings: number; // basePay + surgeIncentives + tips
  amount?: number; // legacy alias for grossEarnings
  fuelExpense: number;
  fuelLitres?: number;
  kmDriven?: number;
  actualMileage?: number; // Actual Mileage = Distance ÷ Fuel Litres (km/L)
  fuelPercent?: number; // Fuel % = Fuel Expense ÷ Gross Swiggy Earnings × 100
  otherExpenses: number;
  expenseNotes?: string;
  netEarnings: number; // grossEarnings - fuelExpense - otherExpenses
  notes?: string;
  source: TransactionSource;
  linkedIncomeTxId?: string;
  linkedFuelTxId?: string;
  isDemo?: boolean;
}

export interface FuelLog {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  litres: number;
  odometerKm?: number;
  bunkName?: string;
  notes?: string;
  linkedTxId?: string;
  isDemo?: boolean;
}

export interface SwiggyOperationalTargets {
  dailyEarningsTarget: number; // default 700 net
  dailyOrdersTarget: number;   // default 15
  monthlyEarningsTarget: number; // default 18000 net
  monthlyShiftsTarget: number;   // default 26
}

export interface SwiggyOperationalSummary {
  // Today's Operational Status
  todayGross: number;
  todayFuel: number;
  todayOtherExpenses: number;
  todayNet: number;
  todayOrders: number;
  todayHours: number;
  todayAvgPerOrder: number;
  todayDailyTarget: number;
  todayRemainingTarget: number;
  todayTargetProgressPct: number;
  todayShiftStatus: SwiggyShiftStatus;
  todayPlannedOrders: number;
  todayShiftCount: number;

  // Month-to-date Operational Metrics
  monthGross: number;
  monthFuel: number;
  monthOtherExpenses: number;
  monthNet: number;
  monthOrders: number;
  monthHours: number;
  monthAvgPerOrder: number;
  monthCompletedShifts: number;
  monthPlannedShifts: number;
  monthlyTarget: number;
  monthlyProgressPct: number;
  monthlyRemainingTarget: number;

  // Pacing, Efficiency & Vehicle Economics
  daysRemainingInMonth: number;
  requiredDailyPace: number;
  pacingStatus: 'AHEAD' | 'ON_TRACK' | 'BEHIND';
  fuelPercent: number; // Fuel % = Fuel Expense ÷ Gross Swiggy Earnings × 100
  fuelAsPercentOfGross: number; // integer percentage alias
  todayFuelPercent: number;
  effectiveHourlyRate: number;
  activeStreakDays: number;
  totalKmDriven: number;
  totalFuelLitres: number;
  actualMileage: number; // Actual Mileage = Distance ÷ Fuel Litres (km/L)
  estimatedMileage: number; // backward-compatibility alias
}

export interface SwiggyEarning {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  orders?: number;
  targetOrders?: number;
  hoursWorked?: number;
  source: TransactionSource;
  notes?: string;
  // Extended fields for operational compatibility
  slot?: SwiggyShiftSlot;
  status?: SwiggyShiftStatus;
  basePay?: number;
  surgeIncentives?: number;
  tips?: number;
  grossEarnings?: number;
  fuelExpense?: number;
  fuelLitres?: number;
  kmDriven?: number;
  otherExpenses?: number;
  expenseNotes?: string;
  netEarnings?: number;
  linkedIncomeTxId?: string;
  linkedFuelTxId?: string;
  isDemo?: boolean;
}

export interface FinancialSummary {
  availableCash: number;
  totalIncome: number;
  totalExpenses: number;
  essentialExpenses: number;
  discretionaryExpenses: number;
  interestPaid: number;
  debtPrincipalPaid: number;
  totalDebt: number;
  upcomingPayments: number;
  netCashChange: number;
  netWorth: number;
  monthlyCommitments: number;
  cashRunwayDays: number;
}

export interface CashFlowMonthPoint {
  month: string; // "Jan 2026"
  monthKey: string; // "2026-01"
  income: number;
  expenses: number;
  netCash: number;
}

export interface CategorySpendingSummary {
  categoryId: string;
  categoryName: string;
  classification: CategoryClassification;
  totalSpent: number;
  budgetLimit?: number;
  percentageUsed?: number;
  icon: string;
}

export interface DebtObligationSummary {
  monthlyTotalEMIs: number;
  creditCardMinimumDues: number;
  recurringCommitmentsTotal: number;
  totalMonthlyObligations: number;
  debtToIncomeRatio: number; // e.g. 42.5 (%)
  dtiStatus: 'HEALTHY' | 'CAUTION' | 'CRITICAL';
}

export interface CashFlowPlan {
  monthKey: string;
  projectedIncome: number;
  fixedObligations: number;
  essentialLivingExpenses: number;
  freeCashFlow: number;
  dailySafeSpend: number;
  daysRemainingInMonth: number;
}

export interface PayoffStrategyResult {
  strategy: 'SNOWBALL' | 'AVALANCHE';
  monthsToDebtFree: number;
  totalInterestPaid: number;
  totalInterestSaved: number;
  debtsOrder: Array<{
    debtId: string;
    debtName: string;
    balance: number;
    interestRate: number;
    estimatedMonthsToPayoff: number;
  }>;
}

// Stage 3 Types
export interface CashBufferSetting {
  minimumCashBuffer: number;
  enabled: boolean;
}

export type ConfidenceBasis = 'RECORDED_DATA' | 'HISTORICAL_AVERAGE' | 'MIXED' | 'LIMITED';

export interface CashFlowForecast {
  period: string; // "Current Month", "Next 7 Days", "Next 30 Days", "Next 3 Months", "Next 6 Months"
  startingCash: number;
  projectedIncome: number;
  projectedEssentialExpenses: number;
  projectedDiscretionaryExpenses: number;
  projectedDebtPayments: number;
  projectedRecurringCommitments: number;
  projectedNetCashChange: number;
  projectedEndingCash: number;
  confidenceBasis: ConfidenceBasis;
  dataQuality: 'High' | 'Moderate' | 'Limited';
  forecastExplanation: string;
  generatedAt: string;
}

export interface ForecastPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "25 Sep"
  actualCash?: number;
  projectedCash?: number;
  confirmedIncome?: number;
  projectedIncome?: number;
  confirmedExpenses?: number;
  projectedExpenses?: number;
  scheduledPayments?: number;
  eventDescription?: string;
  eventType?: 'INCOME' | 'EXPENSE' | 'EMI' | 'BILL' | 'RECURRING' | 'TRANSFER' | 'OTHER';
  isHistorical: boolean;
}

export interface CashPressurePeriod {
  startDate: string;
  endDate: string;
  startingCash: number;
  requiredPayments: number;
  projectedIncome: number;
  projectedEndingCash: number;
  pressureLevel: 'NORMAL' | 'TIGHT' | 'NEGATIVE';
  reason: string;
  daysUntilNextIncome: number;
  nextIncomeDate?: string;
  nextIncomeAmount?: number;
  nextIncomeSource?: string;
  cashBeforeNextIncome: number;
  bufferDeficit?: number;
}

export type InsightType =
  | 'INFORMATION'
  | 'UPCOMING'
  | 'OVERDUE'
  | 'BUDGET'
  | 'FORECAST'
  | 'TREND';

export interface FinancialInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  metric?: string;
  actionText?: string;
  actionUrl?: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

export interface MonthlyFinancialSnapshot {
  monthKey: string;
  monthLabel: string;
  income: number;
  expenses: number;
  debtPrincipal: number;
  interestPaid: number;
  netCashChange: number;
  endingCash: number;
  netWorth: number;
  vsPrevious?: {
    incomeDiff: number;
    incomePct?: number | null;
    expensesDiff: number;
    expensesPct?: number | null;
    debtPrincipalDiff: number;
    debtPrincipalPct?: number | null;
    netWorthDiff: number;
    netWorthPct?: number | null;
  };
}

export interface BudgetForecastItem {
  categoryId: string;
  categoryName: string;
  classification: CategoryClassification;
  budgetLimit: number;
  actualSpent: number;
  remainingBudget: number;
  daysElapsed: number;
  daysRemaining: number;
  dailySpendRate: number;
  projectedMonthEndSpend: number;
  projectedVariance: number; // positive = over budget, negative = under budget
  forecastBasis: string;
  status: 'ON_TRACK' | 'CAUTION' | 'PROJECTED_OVER' | 'OVER_BUDGET';
}

export interface ScenarioChange {
  id: string;
  type:
    | 'INCOME_CHANGE'
    | 'EXPENSE_CHANGE'
    | 'DEBT_PAYMENT_CHANGE'
    | 'RECURRING_EXPENSE'
    | 'SWIGGY_INCOME';
  amount: number;
  categoryId?: string;
  debtId?: string;
  description?: string;
}

export interface Scenario {
  id: string;
  name: string;
  changes: ScenarioChange[];
  createdAt: string;
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  projectedEndingCash: number;
  projectedDebt: number;
  projectedNetWorth: number;
  projectedInterest: number;
  projectedExpenses: number;
  projectedIncome: number;
  differenceFromCurrent: {
    cash: number;
    debt: number;
    netWorth: number;
    expenses: number;
    income: number;
  };
}

export interface TrendPoint {
  monthKey: string;
  monthLabel: string;
  value: number;
  previousValue?: number;
  change?: number;
  percentageChange?: number | null;
}

// ==========================================
// STAGE 5: SMS TRANSACTION DETECTION & REVIEW
// ==========================================

export type SmsCandidateType =
  | 'INCOME'
  | 'EXPENSE'
  | 'TRANSFER'
  | 'DEBT_PAYMENT'
  | 'DEBT_DRAW'
  | 'REFUND'
  | 'UNKNOWN';

export type ParserConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type SmsReviewStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'IGNORED'
  | 'DUPLICATE'
  | 'LINKED';

export type SmsCandidateSource = 'MANUAL_PASTE' | 'IMPORTED_TEXT';

export interface SmsTransactionCandidate {
  id: string;
  rawText: string;
  normalizedText: string;
  sender?: string;
  receivedAt?: string;
  detectedTransactionDate?: string;
  detectedAmount?: number;
  currency?: string;
  transactionType: SmsCandidateType;
  detectedAccountReference?: string;
  detectedCardReference?: string;
  detectedMerchant?: string;
  detectedPayee?: string;
  detectedDescription?: string;
  detectedCategory?: string;
  parserConfidence: ParserConfidence;
  reviewStatus: SmsReviewStatus;
  source: SmsCandidateSource;
  matchedTransactionId?: string;
  matchedSwiggyShiftId?: string;
  matchedDebtPaymentId?: string;
  matchedCommitmentId?: string;
  matchedAccountId?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewNotes?: string;

  // Informational multi-amount & alert flags
  totalDue?: number;
  minimumDue?: number;
  dueDate?: string;
  interestAmount?: number;
  lateFeeAmount?: number;
  isOtpOrPromotional?: boolean;
  isBalanceAlert?: boolean;
  isUpcomingCommitment?: boolean;
  isNonTransaction?: boolean;
  isDemo?: boolean;
}

export interface SmsPrivacySettings {
  retainRawSmsText: boolean;
  autoDeleteRawTextAfterReview: boolean;
}

export type DuplicateStatus = 'DUPLICATE' | 'EXACT_DUPLICATE' | 'POSSIBLE_DUPLICATE' | 'UNIQUE';

export type MatchConfidence = 'STRONG_MATCH' | 'POSSIBLE_MATCH' | 'NO_MATCH';

export interface CandidateMatchResult {
  candidateId: string;
  duplicateStatus: DuplicateStatus;
  duplicateTransactionId?: string;
  duplicateExplanation?: string;
  matchConfidence: MatchConfidence;
  matchedTransactionId?: string;
  matchedDebtId?: string;
  matchedCommitmentId?: string;
  matchedSwiggyShiftId?: string;
  matchedAccountId?: string;
  matchScore: number; // deterministic score 0-100
  matchExplanation: string;
}

export interface UserCorrectionRecord {
  candidateId: string;
  timestamp: string;
  detectedCategory?: string;
  userCategory?: string;
  detectedType?: SmsCandidateType;
  userType?: SmsCandidateType;
  detectedMerchant?: string;
  userMerchant?: string;
}

// ==========================================
// STAGE 6: NOTIFICATIONS, REMINDERS & ALERTS
// ==========================================

export type NotificationType =
  | 'PAYMENT_DUE'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DUE_TODAY'
  | 'CREDIT_CARD_DUE'
  | 'EMI_DUE'
  | 'COMMITMENT_DUE'
  | 'SMS_REVIEW'
  | 'BUDGET_WARNING'
  | 'BUDGET_EXCEEDED'
  | 'LOW_CASH'
  | 'CASH_PRESSURE'
  | 'FORECAST_LOW_CASH'
  | 'SWIGGY_SHIFT'
  | 'SWIGGY_TARGET'
  | 'MONTHLY_SUMMARY'
  | 'RECONCILIATION'
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type NotificationStatus = 'UNREAD' | 'READ' | 'DISMISSED' | 'ACTIONED';

export type NotificationSource =
  | 'PAYMENT_CENTER'
  | 'DEBT'
  | 'BUDGET'
  | 'FORECAST'
  | 'SMS'
  | 'SWIGGY'
  | 'SYSTEM'
  | 'REPORT';

export interface FinancialNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  source: NotificationSource;
  createdAt: string;
  scheduledFor?: string;
  triggeredAt?: string;
  readAt?: string;
  dismissedAt?: string;
  actionedAt?: string;
  actionLabel?: string;
  actionRoute?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationSettings {
  // Payment reminders
  paymentDue7Days: boolean;
  paymentDue3Days: boolean;
  paymentDue1Day: boolean;
  paymentDueToday: boolean;
  overduePayment: boolean;

  // Credit cards
  creditCardDue: boolean;

  // Budget
  budgetWarning: boolean;
  budgetExceeded: boolean;
  budgetWarningThreshold: number; // default 80%

  // Cash & Forecast
  lowCash: boolean;
  cashPressure: boolean;
  forecastLowCash: boolean;

  // SMS Review
  smsReview: boolean;

  // Swiggy
  swiggyShift: boolean;
  swiggyTarget: boolean;
  swiggyShiftReminderMinutes: number; // default 30 min

  // Reports & Reconciliation
  monthlySummary: boolean;
  reconciliation: boolean;

  // Quiet Hours
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g. "22:30"
  quietHoursEnd: string; // e.g. "07:00"
  allowUrgentDuringQuietHours: boolean;

  // Privacy & Browser
  hideAmountsInNotifications: boolean;
  browserNotificationsEnabled: boolean;
}

export interface NotificationSchedulerState {
  lastEvaluationAt?: string;
  lastMonthlySummaryPeriod?: string;
  lastPermissionCheckAt?: string;
}

// ==========================================
// STAGE 7: ADVANCED FINANCIAL INTELLIGENCE & COMMAND CENTER
// ==========================================

export type DataQualityStatus = 'COMPLETE' | 'PARTIAL' | 'LIMITED' | 'NEEDS_REVIEW';

export interface DataQualityItem {
  id: string;
  title: string;
  count: number;
  status: DataQualityStatus;
  description: string;
  actionLabel: string;
  actionRoute: string;
}

export interface DataQualityReport {
  overallQuality: DataQualityStatus;
  summaryMessage: string;
  items: DataQualityItem[];
  uncategorizedCount: number;
  missingInterestRateCount: number;
  unreconciledAccountsCount: number;
  missingDueDatesCount: number;
  incompleteGoalsCount: number;
  pendingSmsCount: number;
}

export interface IncomeCompositionItem {
  source: string;
  amount: number;
  percentage: number;
}

export interface ExpenseCompositionItem {
  classification: CategoryClassification;
  amount: number;
  percentage: number;
  fixedAmount: number;
  variableAmount: number;
}

export interface MonthlySurplusTrend {
  currentMonth: number;
  previousMonth: number;
  momChange: number;
  threeMonthAverage: number;
  sixMonthAverage?: number;
  trendDescription: string;
}

export interface AdvancedFinancialSummary {
  // Current Liquidity & Balances
  currentCash: number;
  bankBalances: number;
  cashBalances: number;
  walletBalances: number;
  creditCardLiabilities: number;
  loanLiabilities: number;
  totalDebt: number;
  netWorth: number;

  // Monthly Operating Metrics (Recorded)
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyDebtObligations: number;
  monthlySurplus: number;
  debtPrincipalPaid: number;
  debtInterestPaid: number;
  netCashChange: number;

  // Trends & Averages
  surplusTrend: MonthlySurplusTrend;
  debtObligationRatioPct: number; // DTI

  // Emergency Buffer
  emergencyBuffer: number;
  emergencyBufferMonths: number;
  essentialMonthlyBurnRate: number;

  // Multi-horizon Projections
  projected30DayCash: number;
  projected3MonthCash: number;
  projected6MonthCash: number;
  projected12MonthCash: number;

  projected3MonthDebt: number;
  projected6MonthDebt: number;
  projected12MonthDebt: number;

  projected3MonthSurplus: number;
  projected6MonthSurplus: number;
  projected12MonthSurplus: number;

  // Compositions
  incomeComposition: IncomeCompositionItem[];
  expenseComposition: ExpenseCompositionItem[];
}

export interface DebtProjectionPoint {
  monthKey: string;
  monthLabel: string;
  startingBalance: number;
  principalPaid: number;
  interestPaid: number;
  closingBalance: number;
  isProjected: boolean;
}

export interface DebtPayoffDetails {
  debtId: string;
  debtName: string;
  currentBalance: number;
  emiAmount: number;
  interestRate?: number;
  remainingMonths: number;
  estimatedCompletionDate?: string;
  isInterestModeled: boolean;
}

export interface DebtProjectionResult {
  openingDebt: number;
  closingDebt: number;
  projectedPrincipal: number;
  projectedInterest: number;
  projectedMonths: number;
  estimatedDebtFreeDate?: string;
  isInterestFullyModeled: boolean;
  interestExplanation: string;
  debts: DebtPayoffDetails[];
  monthlyTimeline: DebtProjectionPoint[];
  snowballTimeline?: DebtProjectionPoint[];
  avalancheTimeline?: DebtProjectionPoint[];
  extraPaymentScenarios: {
    extraAmount: number;
    projectedMonths: number;
    monthsSaved: number;
    estimatedDebtFreeDate?: string;
  }[];
}

export interface GoalProjectionResult {
  goalId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  percentComplete: number;
  monthlyContribution?: number;
  projectedMonthsRemaining?: number;
  projectedCompletionDate?: string;
  targetDate?: string;
  isOnTrack?: boolean;
  requiredMonthlyForTargetDate?: number;
  statusText: string;
}

export interface FinancialExplanationItem {
  label: string;
  amount?: number;
  isDeduction?: boolean;
  note?: string;
}

export interface FinancialExplanation {
  metricKey: string;
  title: string;
  valueDisplay: string;
  formula: string;
  basis: 'ACTUAL' | 'HISTORICAL_AVERAGE' | 'FORECAST' | 'SCENARIO';
  dataQuality: 'COMPLETE' | 'PARTIAL' | 'LIMITED';
  breakdownItems: FinancialExplanationItem[];
  explanation: string;
}

export interface FinancialMilestone {
  id: string;
  title: string;
  date: string;
  type: 'DEBT' | 'GOAL' | 'INCOME' | 'CASH' | 'SWIGGY';
  status: 'ACHIEVED' | 'PROJECTED';
  amount?: number;
  description: string;
}

export interface SavedScenario {
  id: string;
  name: string;
  description?: string;
  swiggyIncomeDelta?: number;
  salaryIncomeDelta?: number;
  expenseDelta?: number;
  extraDebtPayment?: number;
  releasedEmiDebtId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stage7PlanningSettings {
  preferredDebtStrategy: 'STANDARD' | 'SNOWBALL' | 'AVALANCHE';
  targetEmergencyMonths: number;
  savedScenarios: SavedScenario[];
}

// --------------------------------------------------------------------------
// STAGE 8 — PRODUCTION HARDENING, DATA INTEGRITY, BACKUP, AUDIT & RECOVERY
// --------------------------------------------------------------------------

export type IntegritySeverity = 'INFO' | 'WARNING' | 'ERROR';

export interface IntegrityIssue {
  id: string;
  severity: IntegritySeverity;
  entityType: string;
  entityId?: string;
  title: string;
  description: string;
  repairable: boolean;
  field?: string;
}

export interface DuplicateCandidate {
  id: string;
  existingTransaction: Transaction;
  incomingTransaction: Partial<Transaction>;
  duplicateStatus: DuplicateStatus;
  reasons: string[];
  suggestedAction: 'KEEP_EXISTING' | 'KEEP_INCOMING' | 'KEEP_BOTH' | 'MARK_DUPLICATE';
}

export interface ImportValidationError {
  row: number;
  field?: string;
  reason: string;
  rawData?: unknown;
}

export interface ImportValidationResult {
  importedCount: number;
  newCount: number;
  exactDuplicateCount: number;
  possibleDuplicateCount: number;
  invalidCount: number;
  skippedCount: number;
  validRecords: Partial<Transaction>[];
  duplicates: DuplicateCandidate[];
  errors: ImportValidationError[];
}

export type SnapshotReason =
  | 'MIGRATION'
  | 'IMPORT'
  | 'RESTORE'
  | 'RESET'
  | 'BULK_DELETE'
  | 'RECONCILIATION'
  | 'MANUAL'
  | 'REPAIR';

export interface BackupSnapshot {
  id: string;
  createdAt: string;
  reason: SnapshotReason;
  schemaVersion: number;
  recordCount: number;
  checksum?: string;
  stateData: string;
  description?: string;
}

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'RESTORE'
  | 'CONFIRM'
  | 'LINK'
  | 'DUPLICATE'
  | 'RECONCILE'
  | 'IMPORT'
  | 'EXPORT'
  | 'REPAIR'
  | 'REVERSAL';

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  source?: string;
  canUndo?: boolean;
}

export interface AppError {
  id: string;
  timestamp: string;
  area: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  stack?: string;
}

export interface AppDiagnostics {
  appVersion: string;
  storageVersion: number;
  pwaInstalled: boolean;
  serviceWorkerActive: boolean;
  isOnline: boolean;
  lastSaveAt?: string;
  lastBackupAt?: string;
  lastMigrationAt?: string;
  recordCounts: {
    accounts: number;
    transactions: number;
    debts: number;
    payments: number;
    goals: number;
    budgets: number;
    swiggyShifts: number;
    smsCandidates: number;
    notifications: number;
    auditEvents: number;
    backupSnapshots: number;
  };
  pendingSmsCount: number;
  urgentNotificationCount: number;
  integrityIssuesCount: number;
  errorLogCount: number;
  firebaseConfigured?: boolean;
  syncStatus?: string;
  pendingQueueCount?: number;
  failedQueueCount?: number;
  conflictCount?: number;
  lastSyncAt?: string;
  environment?: string;
}

export interface CommandCenterPreferences {
  visibleWidgets: Record<string, boolean>;
  widgetOrder: string[];
  density: 'compact' | 'comfortable';
}

export interface Stage8ReliabilitySettings {
  auditRetentionDays: 90 | 180 | 365 | 0; // 0 = unlimited
  maxSnapshots: number;
  lastBackupTimestamp?: string;
  autoIntegrityCheckOnLoad: boolean;
}

export interface BackupPayload {
  app: 'CASH FLOW';
  backupFormatVersion: 1;
  storageSchemaVersion: number;
  createdAt: string;
  locale: string;
  currency: string;
  checksum?: string;
  data: unknown;
}



