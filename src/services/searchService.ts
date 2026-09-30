import { Debt, Goal, Payment, Transaction } from '../types/finance';
import { AppState } from './storage';


/**
 * CASH FLOW — Stage 8 Global Search Service
 * Fast, multi-entity search across transactions, accounts, debts, goals, payments, and audit history.
 * Read-only & strictly privacy-preserving (never searches deleted raw SMS).
 */

export interface SearchResultItem {
  id: string;
  category: 'TRANSACTION' | 'ACCOUNT' | 'DEBT' | 'PAYMENT' | 'GOAL' | 'SWIGGY' | 'SMS' | 'NOTIFICATION' | 'AUDIT';
  title: string;
  subtitle: string;
  badge?: string;
  route: string;
  amount?: number;
}

export function searchCashFlow(state: AppState, query: string): SearchResultItem[] {
  const normQuery = query.toLowerCase().trim();
  if (!normQuery) return [];

  const results: SearchResultItem[] = [];

  // 1. Transactions
  for (const tx of state.transactions || []) {
    const descMatch = (tx.description || '').toLowerCase().includes(normQuery);
    const noteMatch = (tx.notes || '').toLowerCase().includes(normQuery);
    const amtStr = String(tx.amount);
    const amtMatch = amtStr.includes(normQuery) || `₹${amtStr}`.includes(normQuery);
    const dateMatch = tx.date.includes(normQuery);

    if (descMatch || noteMatch || amtMatch || dateMatch) {
      results.push({
        id: `tx_${tx.id}`,
        category: 'TRANSACTION',
        title: tx.description || `${tx.type} Transaction`,
        subtitle: `${tx.date} • ${tx.type}`,
        badge: tx.type,
        amount: tx.amount,
        route: '/transactions',
      });
    }
  }

  // 2. Accounts
  for (const acc of state.accounts || []) {
    const nameMatch = acc.name.toLowerCase().includes(normQuery);
    const bankMatch = (acc.bankName || '').toLowerCase().includes(normQuery);
    const numMatch = (acc.accountNumberMasked || '').toLowerCase().includes(normQuery);

    if (nameMatch || bankMatch || numMatch) {
      results.push({
        id: `acc_${acc.id}`,
        category: 'ACCOUNT',
        title: acc.name,
        subtitle: `${acc.bankName || acc.type} • ${acc.accountNumberMasked || 'Active'}`,
        badge: acc.type,
        amount: acc.currentBalance,
        route: '/accounts',
      });
    }
  }

  // 3. Debts
  for (const debt of state.debts || []) {
    const nameMatch = debt.name.toLowerCase().includes(normQuery);
    const lenderMatch = (debt.lenderName || '').toLowerCase().includes(normQuery);
    const typeMatch = debt.type.toLowerCase().includes(normQuery);

    if (nameMatch || lenderMatch || typeMatch) {
      results.push({
        id: `debt_${debt.id}`,
        category: 'DEBT',
        title: debt.name,
        subtitle: `${debt.lenderName || debt.type} • Status: ${debt.status}`,
        badge: debt.type,
        amount: debt.outstandingPrincipal,
        route: '/debts',
      });
    }
  }

  // 4. Payments
  for (const pay of state.payments || []) {
    const titleMatch = pay.title.toLowerCase().includes(normQuery);
    const amtMatch = String(pay.amount).includes(normQuery);

    if (titleMatch || amtMatch) {
      results.push({
        id: `pay_${pay.id}`,
        category: 'PAYMENT',
        title: pay.title,
        subtitle: `Due: ${pay.dueDate} • Status: ${pay.status}`,
        badge: pay.status,
        amount: pay.amount,
        route: '/payments',
      });
    }
  }

  // 5. Goals
  for (const goal of state.goals || []) {
    const nameMatch = goal.name.toLowerCase().includes(normQuery);

    if (nameMatch) {
      results.push({
        id: `goal_${goal.id}`,
        category: 'GOAL',
        title: goal.name,
        subtitle: `Target: ₹${goal.targetAmount.toLocaleString('en-IN')}`,
        badge: goal.type || goal.status,
        amount: goal.currentAmount,
        route: '/goals',
      });

    }
  }

  // 6. SMS Candidates (Privacy safe: search merchant & detected fields only)
  for (const sms of state.smsCandidates || []) {
    const merchant = sms.detectedMerchant || sms.detectedPayee || sms.detectedDescription || '';
    const merchantMatch = merchant.toLowerCase().includes(normQuery);
    const amtStr = sms.detectedAmount !== undefined ? String(sms.detectedAmount) : '';
    const amtMatch = amtStr.includes(normQuery);

    if (merchantMatch || amtMatch) {
      results.push({
        id: `sms_${sms.id}`,
        category: 'SMS',
        title: merchant ? `SMS: ${merchant}` : 'SMS Candidate',
        subtitle: `Status: ${sms.reviewStatus} • ${sms.detectedTransactionDate || ''}`,
        badge: sms.reviewStatus,
        amount: sms.detectedAmount,
        route: '/sms',
      });
    }
  }


  // 7. Audit Events
  for (const ev of (state.auditEvents || []).slice(0, 50)) {
    const summaryMatch = ev.summary.toLowerCase().includes(normQuery);
    const entityMatch = ev.entityType.toLowerCase().includes(normQuery);

    if (summaryMatch || entityMatch) {
      results.push({
        id: `audit_${ev.id}`,
        category: 'AUDIT',
        title: ev.summary,
        subtitle: `${ev.action} on ${ev.entityType} • ${ev.timestamp.split('T')[0]}`,
        badge: ev.action,
        route: '/audit',
      });
    }
  }

  // Cap results at 30 to preserve UI responsiveness
  return results.slice(0, 30);
}

export function performGlobalSearch(state: AppState, query: string) {
  const items = searchCashFlow(state, query);
  return items.map((i) => ({
    ...i,
    type: i.category,
  }));
}

