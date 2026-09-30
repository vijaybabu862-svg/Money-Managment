import React, { useState, useMemo } from 'react';
import {
  Wallet,
  CreditCard,
  Building2,
  Banknote,
  Plus,
  Scale,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { formatINR } from '../../utils/currency';
import { formatIndianDate, getCurrentDateISO } from '../../utils/dates';
import { Account, AccountType, Transaction } from '../../types/finance';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export const AccountsPage: React.FC = () => {
  const { accountsWithBalances, state, addAccount, deleteAccount, reconcileAccountBalance, updateTransaction } = useFinance();
  const { showToast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [reconcileAccount, setReconcileAccount] = useState<(Account & { computedBalance: number }) | null>(null);
  const [statementBalanceInput, setStatementBalanceInput] = useState('');
  const [statementDateInput, setStatementDateInput] = useState(getCurrentDateISO());
  const [reconcileNotes, setReconcileNotes] = useState('');

  // Form fields for new account
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [openingBalance, setOpeningBalance] = useState('');
  const [bankName, setBankName] = useState('');
  const [mask, setMask] = useState('');

  const liquidAccounts = accountsWithBalances.filter(
    (a) => a.type === 'BANK' || a.type === 'CASH' || a.type === 'WALLET'
  );
  const creditCardAccounts = accountsWithBalances.filter((a) => a.type === 'CREDIT_CARD');

  const totalLiquid = liquidAccounts.reduce((sum, a) => sum + Math.max(0, a.computedBalance), 0);
  const totalCardDebt = creditCardAccounts.reduce((sum, a) => sum + Math.max(0, a.computedBalance), 0);

  // Recent transactions for the account being reconciled
  const accountRecentTx = useMemo(() => {
    if (!reconcileAccount) return [];
    return state.transactions
      .filter((t) => t.accountId === reconcileAccount.id || t.toAccountId === reconcileAccount.id)
      .slice(0, 10);
  }, [reconcileAccount, state.transactions]);

  const handleOpenReconcile = (acc: typeof accountsWithBalances[0]) => {
    setReconcileAccount(acc);
    setStatementBalanceInput(String(acc.computedBalance));
    setStatementDateInput(getCurrentDateISO());
    setReconcileNotes(`Reconciliation for ${acc.name} as of ${formatIndianDate(getCurrentDateISO())}`);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(openingBalance) || 0;

    addAccount({
      name: name.trim() || 'New Account',
      type,
      openingBalance: balance,
      bankName: bankName.trim() || undefined,
      accountNumberMasked: mask.trim() ? `•••• ${mask.trim()}` : undefined,
      isActive: true,
    });

    showToast(`✓ Account "${name}" created`);
    setName('');
    setOpeningBalance('');
    setBankName('');
    setMask('');
    setIsAddOpen(false);
  };

  const handleReconcileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileAccount) return;

    const actual = parseFloat(statementBalanceInput);
    if (isNaN(actual)) {
      showToast('Please enter a valid statement balance', 'error');
      return;
    }

    const currentBook = reconcileAccount.computedBalance;
    const diff = actual - currentBook;

    reconcileAccountBalance({
      accountId: reconcileAccount.id,
      statementBalance: actual,
      statementDate: statementDateInput,
      adjustmentAmount: diff !== 0 ? diff : undefined,
      notes: reconcileNotes,
    });

    if (diff === 0) {
      showToast(`✓ ${reconcileAccount.name} reconciled: Book balance matches statement perfectly!`);
    } else {
      showToast(`✓ ${reconcileAccount.name} reconciled: Adjustment of ${diff > 0 ? '+' : ''}₹${diff.toLocaleString('en-IN')} recorded`);
    }

    setReconcileAccount(null);
  };

  const toggleVerifyTransaction = (tx: Transaction) => {
    const newStatus = tx.verificationStatus === 'CONFIRMED' ? 'NEEDS_VERIFICATION' : 'CONFIRMED';
    updateTransaction({
      ...tx,
      verificationStatus: newStatus,
    });
  };

  const handleDeleteAccountConfirm = () => {
    if (deleteAccountId) {
      const acc = accountsWithBalances.find((a) => a.id === deleteAccountId);
      deleteAccount(deleteAccountId);
      showToast(`✓ Account "${acc?.name || ''}" deleted`);
      setDeleteAccountId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
            Accounts & Reconciliation
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Bank accounts, cash in hand, digital wallets, credit cards, and ledger statement reconciliation
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Account</span>
        </button>
      </div>

      {/* Top Totals Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
            Total Liquid Cash
          </div>
          <div className="text-3xl font-bold text-[#16A34A] dark:text-[#22C55E] tabular-nums mt-1">
            {formatINR(totalLiquid)}
          </div>
          <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Across {liquidAccounts.length} deposit & cash accounts
          </div>
        </div>

        <div className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
            Credit Card Outstanding
          </div>
          <div className="text-3xl font-bold text-[#EA580C] dark:text-[#F97316] tabular-nums mt-1">
            {formatINR(totalCardDebt)}
          </div>
          <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1">
            Across {creditCardAccounts.length} credit lines
          </div>
        </div>
      </div>

      {/* Liquid Accounts Section */}
      <div>
        <h2 className="text-base font-semibold text-[#111827] dark:text-[#F3F4F6] mb-3">
          Liquid Accounts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {liquidAccounts.map((acc) => {
            const isNegative = acc.computedBalance < 0;
            const hasReconciled = !!acc.lastReconciledDate;

            return (
              <div
                key={acc.id}
                className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
                        {acc.type === 'BANK' && <Building2 className="w-5 h-5" />}
                        {acc.type === 'CASH' && <Banknote className="w-5 h-5" />}
                        {acc.type === 'WALLET' && <Wallet className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">
                          {acc.name}
                        </div>
                        <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                          {acc.accountNumberMasked || acc.bankName || acc.type}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenReconcile(acc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                        title="Reconcile with bank statement"
                      >
                        <Scale className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Reconcile</span>
                      </button>
                      <button
                        onClick={() => setDeleteAccountId(acc.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        title="Delete account"
                        aria-label="Delete account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Current Available Balance</div>
                    <div
                      className={`text-2xl font-bold tabular-nums mt-0.5 ${
                        isNegative ? 'text-[#DC2626]' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatINR(acc.computedBalance)}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  {hasReconciled ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified {formatIndianDate(acc.lastReconciledDate!)}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Unreconciled</span>
                  )}
                  <span>Opening: {formatINR(acc.openingBalance)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Credit Cards Section */}
      <div>
        <h2 className="text-base font-semibold text-[#111827] dark:text-[#F3F4F6] mb-3">
          Credit Cards & Liabilities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {creditCardAccounts.map((acc) => {
            const card = state.creditCards.find((c) => c.accountId === acc.id);
            const limit = card?.creditLimit || 50000;
            const used = Math.max(0, acc.computedBalance);
            const available = Math.max(0, limit - used);
            const usedPct = Math.min(100, Math.round((used / limit) * 100));

            return (
              <div
                key={acc.id}
                className="bg-white dark:bg-[#131926] border border-[#E5E7EB] dark:border-[#1F2937] rounded-2xl p-5 shadow-xs space-y-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#EA580C] dark:bg-orange-950/40 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">
                        {acc.name}
                      </div>
                      <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                        {acc.accountNumberMasked || 'Credit Card'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenReconcile(acc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      title="Reconcile with statement"
                    >
                      <Scale className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Reconcile</span>
                    </button>
                    <button
                      onClick={() => setDeleteAccountId(acc.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      title="Delete card account"
                      aria-label="Delete card account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Used Credit</div>
                    <div className="text-xl font-bold text-[#EA580C] tabular-nums">
                      {formatINR(used)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Available Credit</div>
                    <div className="text-xl font-bold text-[#16A34A] tabular-nums">
                      {formatINR(available)}
                    </div>
                  </div>
                </div>

                {/* Credit Limit Progress */}
                <div>
                  <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    <span>Credit Limit: {formatINR(limit)}</span>
                    <span>{usedPct}% utilized</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        usedPct >= 80 ? 'bg-[#DC2626]' : usedPct >= 50 ? 'bg-[#EAB308]' : 'bg-slate-900 dark:bg-slate-100'
                      }`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                </div>

                {card && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    <span>Statement Due: {card.paymentDueDate}th of month</span>
                    <span>Min Due: {formatINR(card.minimumDue || Math.round(used * 0.05))}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Account Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131926] p-6 shadow-2xl border border-[#E5E7EB] dark:border-[#1F2937]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                Add New Account
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  ACCOUNT NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SBI Savings, Cash Wallet..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  ACCOUNT TYPE *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                >
                  <option value="BANK">Bank Account</option>
                  <option value="CASH">Cash in Hand</option>
                  <option value="WALLET">UPI / Digital Wallet</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  {type === 'CREDIT_CARD' ? 'CURRENT USED BALANCE (₹)' : 'OPENING BALANCE (₹)'}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white tabular-nums"
                />
              </div>

              {type === 'BANK' && (
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    LAST 4 DIGITS (MASKED)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 4921"
                    value={mask}
                    onChange={(e) => setMask(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advanced Reconciliation Modal with Transaction Verification */}
      {reconcileAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#131926] p-6 shadow-2xl border border-[#E5E7EB] dark:border-[#1F2937] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                  Reconcile {reconcileAccount.name}
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Verify transactions and balance against actual passbook or netbanking
                </p>
              </div>
              <button
                onClick={() => setReconcileAccount(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReconcileSubmit} className="space-y-4">
              {/* Balances Comparison Box */}
              <div className="p-3.5 bg-slate-50 dark:bg-[#0B0F17] rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">App Book Balance:</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatINR(reconcileAccount.computedBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Statement Entered:</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {statementBalanceInput ? formatINR(parseFloat(statementBalanceInput) || 0) : '—'}
                  </span>
                </div>
                {statementBalanceInput && !isNaN(parseFloat(statementBalanceInput)) && (
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-bold">
                    <span>Discrepancy Variance:</span>
                    <span
                      className={`tabular-nums ${
                        parseFloat(statementBalanceInput) - reconcileAccount.computedBalance === 0
                          ? 'text-[#16A34A]'
                          : 'text-[#DC2626]'
                      }`}
                    >
                      {parseFloat(statementBalanceInput) - reconcileAccount.computedBalance === 0
                        ? '✓ ₹0 (Perfect Match)'
                        : `${parseFloat(statementBalanceInput) - reconcileAccount.computedBalance > 0 ? '+' : ''}${formatINR(
                            parseFloat(statementBalanceInput) - reconcileAccount.computedBalance
                          )}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    STATEMENT BALANCE (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={statementBalanceInput}
                    onChange={(e) => setStatementBalanceInput(e.target.value)}
                    className="w-full px-3 py-2 text-base font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                    STATEMENT DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={statementDateInput}
                    onChange={(e) => setStatementDateInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Transactions Checklist */}
              {accountRecentTx.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Recent Account Transactions ({accountRecentTx.length})</span>
                    <span className="text-[10px] text-slate-400 font-normal">Click checkmark to toggle verified</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    {accountRecentTx.map((tx) => (
                      <div
                        key={tx.id}
                        onClick={() => toggleVerifyTransaction(tx)}
                        className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 ${
                              tx.verificationStatus === 'CONFIRMED'
                                ? 'text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {tx.description || tx.type}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-2">
                              {formatIndianDate(tx.date)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`font-semibold tabular-nums ${
                            tx.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {tx.type === 'INCOME' ? '+' : '-'}
                          {formatINR(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">
                  AUDIT / RECONCILIATION NOTES
                </label>
                <input
                  type="text"
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReconcileAccount(null)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
                >
                  Confirm Reconciliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteAccountId}
        title="Delete Account"
        message="Are you sure you want to delete this account? Transactions linked directly to this account will be cleaned up to protect ledger integrity."
        confirmText="Delete Account"
        isDestructive={true}
        onConfirm={handleDeleteAccountConfirm}
        onCancel={() => setDeleteAccountId(null)}
      />
    </div>
  );
};
