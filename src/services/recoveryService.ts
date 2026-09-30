import { AppState, StorageService } from './storage';
import {
  AuditEvent,
  BackupSnapshot,
  Debt,
  SnapshotReason,
  Transaction,
} from '../types/finance';

/**
 * CASH FLOW — Stage 8 Recovery & Safe Reversal Service
 * Provides snapshot isolation, rollback protection, safe single-entity undo,
 * and double-entry compensating financial reversals.
 */

export const RecoveryService = {
  createSnapshot(
    state: AppState,
    reason: SnapshotReason,
    description?: string
  ): BackupSnapshot {
    return StorageService.createLocalSnapshot(state, reason, description);
  },

  getSnapshots(): BackupSnapshot[] {
    return StorageService.getSnapshots();
  },

  restoreFromSnapshot(snapshotId: string): {
    success: boolean;
    restoredState?: AppState;
    error?: string;
  } {
    try {
      const restored = StorageService.restoreSnapshot(snapshotId);
      if (!restored) {
        return { success: false, error: 'Snapshot not found or corrupted.' };
      }
      return { success: true, restoredState: restored };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },

  deleteSnapshot(snapshotId: string): void {
    StorageService.deleteSnapshot(snapshotId);
  },

  /**
   * Safe Undo for a specific Audit Event
   * Reverts an entity to its 'before' state without wiping unrelated data.
   */
  undoAuditEvent(
    state: AppState,
    event: AuditEvent
  ): {
    success: boolean;
    updatedState?: AppState;
    error?: string;
  } {
    if (!event.canUndo && event.action !== 'CREATE' && event.action !== 'UPDATE' && event.action !== 'DELETE') {
      return { success: false, error: `Audit action ${event.action} cannot be safely undone.` };
    }

    // 1. Transaction Undo
    if (event.entityType === 'Transaction') {
      if (event.action === 'CREATE') {
        // To undo a create, remove the created transaction
        const updatedTxs = (state.transactions || []).filter((t) => t.id !== event.entityId);
        const updatedState: AppState = {
          ...state,
          transactions: updatedTxs,
        };
        StorageService.saveState(updatedState);
        return { success: true, updatedState };
      }

      if (event.action === 'UPDATE' && event.before) {
        // To undo an update, restore the before snapshot of the transaction
        const beforeTx = event.before as Transaction;
        const updatedTxs = (state.transactions || []).map((t) => (t.id === event.entityId ? beforeTx : t));
        const updatedState: AppState = {
          ...state,
          transactions: updatedTxs,
        };
        StorageService.saveState(updatedState);
        return { success: true, updatedState };
      }

      if (event.action === 'DELETE' && event.before) {
        // To undo a delete, re-insert the deleted transaction
        const restoredTx = event.before as Transaction;
        const exists = (state.transactions || []).some((t) => t.id === restoredTx.id);
        const updatedTxs = exists
          ? state.transactions
          : [restoredTx, ...(state.transactions || [])];
        const updatedState: AppState = {
          ...state,
          transactions: updatedTxs,
        };
        StorageService.saveState(updatedState);
        return { success: true, updatedState };
      }
    }

    // 2. Goal Undo
    if (event.entityType === 'Goal' && event.before && event.action === 'UPDATE') {
      const beforeGoal = event.before as AppState['goals'][0];
      const updatedGoals = (state.goals || []).map((g) => (g.id === event.entityId ? beforeGoal : g));
      const updatedState: AppState = { ...state, goals: updatedGoals };
      StorageService.saveState(updatedState);
      return { success: true, updatedState };
    }

    // 3. Budget Undo
    if (event.entityType === 'Budget' && event.before && event.action === 'UPDATE') {
      const beforeBudget = event.before as AppState['budgets'][0];
      const updatedBudgets = (state.budgets || []).map((b) => (b.id === event.entityId ? beforeBudget : b));
      const updatedState: AppState = { ...state, budgets: updatedBudgets };
      StorageService.saveState(updatedState);
      return { success: true, updatedState };
    }

    return {
      success: false,
      error: `Undo for entity type ${event.entityType} with action ${event.action} is not supported.`,
    };
  },

  /**
   * Safe Financial Reversal
   * Generates a compensating adjustment transaction to cancel the financial effect
   * of an erroneous transaction while preserving strict audit integrity.
   */
  createCompensatingReversal(
    state: AppState,
    originalTx: Transaction,
    reversalReason: string
  ): {
    updatedState: AppState;
    reversalTransaction: Transaction;
  } {
    const isIncome = originalTx.type === 'INCOME';
    const reversalType = isIncome ? 'EXPENSE' : 'INCOME';

    const reversalTx: Transaction = {
      id: `rev_${Date.now()}_${originalTx.id.substring(0, 8)}`,
      date: new Date().toISOString().split('T')[0],
      amount: originalTx.amount,
      type: originalTx.type === 'TRANSFER' ? 'TRANSFER' : reversalType,
      accountId: originalTx.type === 'TRANSFER' ? (originalTx.toAccountId || originalTx.accountId) : originalTx.accountId,
      toAccountId: originalTx.type === 'TRANSFER' ? originalTx.accountId : undefined,
      categoryId: originalTx.categoryId,
      description: `Reversal of: ${originalTx.description || originalTx.id} (${reversalReason})`,
      notes: `Compensating reversal for transaction ${originalTx.id}. Reason: ${reversalReason}`,
      source: 'ADJUSTMENT',
      verificationStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedState: AppState = {
      ...state,
      transactions: [reversalTx, ...(state.transactions || [])],
    };

    StorageService.saveState(updatedState);

    return {
      updatedState,
      reversalTransaction: reversalTx,
    };
  },

  /**
   * Corrects a Debt Payment
   * Restores the principal balance on the debt, adds a reversing audit entry,
   * and marks the payment transaction reversed.
   */
  correctDebtPayment(
    state: AppState,
    debtPaymentId: string,
    correctionReason: string
  ): {
    success: boolean;
    updatedState?: AppState;
    error?: string;
  } {
    const payment = (state.debtPayments || []).find((dp) => dp.id === debtPaymentId);
    if (!payment) {
      return { success: false, error: 'Debt payment record not found.' };
    }

    const debt = (state.debts || []).find((d) => d.id === payment.debtId);
    if (!debt) {
      return { success: false, error: 'Associated debt not found.' };
    }

    // 1. Restore the principal on the debt
    const restoredOutstanding = (debt.outstandingPrincipal ?? 0) + (payment.principalAmount ?? 0);
    const updatedDebts = (state.debts || []).map((d): Debt => {
      if (d.id === debt.id) {
        return {
          ...d,
          outstandingPrincipal: restoredOutstanding,
          status: 'ACTIVE',
        };
      }
      return d;
    });

    // 2. Remove the debt payment record
    const updatedDebtPayments = (state.debtPayments || []).filter((dp) => dp.id !== debtPaymentId);

    // 3. Find and mark or reverse transaction
    const tx = (state.transactions || []).find((t) => t.id === payment.transactionId);
    let updatedTxs = state.transactions || [];
    if (tx) {
      const reversal = this.createCompensatingReversal(
        state,
        tx,
        `Debt payment correction: ${correctionReason}`
      );
      updatedTxs = reversal.updatedState.transactions;
    }

    const updatedState: AppState = {
      ...state,
      debts: updatedDebts,
      debtPayments: updatedDebtPayments,
      transactions: updatedTxs,
    };

    StorageService.saveState(updatedState);

    return {
      success: true,
      updatedState,
    };
  },
};

export function createSnapshot(
  state: AppState,
  reason: SnapshotReason,
  description?: string
): BackupSnapshot {
  return RecoveryService.createSnapshot(state, reason, description);
}

export function restoreFromSnapshot(
  snapshots: BackupSnapshot[],
  snapshotId: string
): AppState | null {
  const found = snapshots.find((s) => s.id === snapshotId);
  if (!found) return null;
  try {
    const parsed = JSON.parse(found.stateData) as AppState;
    return parsed;
  } catch {
    return null;
  }
}

export function generateReversalTransaction(
  originalTx: Transaction,
  reversalReason: string
): Transaction {
  let reversalType: Transaction['type'] = 'EXPENSE';
  if (originalTx.type === 'EXPENSE' || originalTx.type === 'DEBT_PAYMENT') {
    reversalType = 'INCOME';
  } else if (originalTx.type === 'INCOME') {
    reversalType = 'EXPENSE';
  }

  return {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    amount: originalTx.amount,
    date: new Date().toISOString().split('T')[0],
    type: originalTx.type === 'TRANSFER' ? 'TRANSFER' : reversalType,
    accountId: originalTx.type === 'TRANSFER' ? (originalTx.toAccountId || originalTx.accountId) : originalTx.accountId,
    toAccountId: originalTx.type === 'TRANSFER' ? originalTx.accountId : undefined,
    categoryId: originalTx.categoryId,
    description: `REVERSAL: ${originalTx.description || originalTx.id}`,
    notes: `Reversal for transaction ${originalTx.id}. Reason: ${reversalReason}`,
    source: 'MANUAL',
    verificationStatus: 'CONFIRMED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}


