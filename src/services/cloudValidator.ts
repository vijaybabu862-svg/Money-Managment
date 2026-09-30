/**
 * CASH FLOW — Cloud Payload Validator
 * Stage 10 Production Security Hardening
 * Validates financial invariants and data structure before any Firestore upload.
 */

export interface CloudValidationResult {
  valid: boolean;
  error?: string;
}

export function validateCloudPayload(
  collectionName: string,
  docId: string,
  payload: unknown,
  userId: string
): CloudValidationResult {
  // 1. Identity validation
  if (!docId || typeof docId !== 'string' || docId.trim().length === 0) {
    return { valid: false, error: 'Entity ID must be a non-empty string.' };
  }

  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return { valid: false, error: 'User ownership UID is required.' };
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'Payload must be a valid document object.' };
  }

  const doc = payload as Record<string, any>;

  // 2. Cross-user reference isolation
  if (doc.userId && doc.userId !== userId) {
    return {
      valid: false,
      error: `Cross-user reference rejected. Payload user (${doc.userId}) does not match authenticated user (${userId}).`,
    };
  }

  // 3. Collection-specific invariants
  switch (collectionName) {
    case 'transactions': {
      if (typeof doc.amount !== 'number' || isNaN(doc.amount) || !isFinite(doc.amount)) {
        return { valid: false, error: 'Transaction amount must be a finite numeric value (NaN/Infinity prohibited).' };
      }
      if (doc.amount <= 0 && doc.type !== 'ADJUSTMENT') {
        return { valid: false, error: 'Transaction amount must be strictly greater than zero.' };
      }
      if (!doc.accountId || typeof doc.accountId !== 'string') {
        return { valid: false, error: 'Transaction must have an associated account reference.' };
      }
      if (!doc.date || isNaN(Date.parse(doc.date))) {
        return { valid: false, error: 'Transaction must have a valid parseable date.' };
      }
      const validTypes = ['INCOME', 'EXPENSE', 'TRANSFER', 'DEBT_PAYMENT', 'DEBT_DRAW', 'REFUND', 'ADJUSTMENT'];
      if (!validTypes.includes(doc.type)) {
        return { valid: false, error: `Invalid transaction type: "${doc.type}".` };
      }
      if (doc.type === 'TRANSFER' && (!doc.toAccountId || typeof doc.toAccountId !== 'string')) {
        return { valid: false, error: 'Transfer transaction requires a valid destination account.' };
      }
      break;
    }

    case 'accounts': {
      if (!doc.name || typeof doc.name !== 'string') {
        return { valid: false, error: 'Account must have a name.' };
      }
      if (typeof doc.openingBalance !== 'number' || isNaN(doc.openingBalance) || !isFinite(doc.openingBalance)) {
        return { valid: false, error: 'Account opening balance must be a valid finite number.' };
      }
      const validTypes = ['BANK', 'CASH', 'WALLET', 'CREDIT_CARD', 'INVESTMENT', 'OTHER'];
      if (!validTypes.includes(doc.type)) {
        return { valid: false, error: `Invalid account type: "${doc.type}".` };
      }
      break;
    }

    case 'debts': {
      if (!doc.name || typeof doc.name !== 'string') {
        return { valid: false, error: 'Debt must have a name.' };
      }
      const orig = doc.originalPrincipal ?? doc.principalAmount;
      if (typeof orig !== 'number' || isNaN(orig) || !isFinite(orig) || orig < 0) {
        return { valid: false, error: 'Debt principal must be a non-negative finite number.' };
      }
      if (
        typeof doc.outstandingPrincipal !== 'number' ||
        isNaN(doc.outstandingPrincipal) ||
        !isFinite(doc.outstandingPrincipal) ||
        doc.outstandingPrincipal < 0
      ) {
        return { valid: false, error: 'Outstanding principal must be a non-negative finite number.' };
      }
      break;
    }

    case 'payments': {
      if (!doc.title || typeof doc.title !== 'string') {
        return { valid: false, error: 'Payment commitment must have a title.' };
      }
      if (typeof doc.amount !== 'number' || isNaN(doc.amount) || !isFinite(doc.amount) || doc.amount <= 0) {
        return { valid: false, error: 'Payment amount must be a positive finite number.' };
      }
      if (!doc.dueDate || isNaN(Date.parse(doc.dueDate))) {
        return { valid: false, error: 'Payment requires a valid due date.' };
      }
      break;
    }

    case 'devices': {
      if (!doc.deviceId || typeof doc.deviceId !== 'string') {
        return { valid: false, error: 'Device record requires a valid deviceId.' };
      }
      break;
    }

    case 'smsCandidates': {
      // Stage 10 Privacy Rule: Check if raw SMS body is present and not explicitly allowed
      if (doc.rawSmsBody && !doc.allowRawCloudUpload) {
        return { valid: false, error: 'Raw SMS body upload is strictly prohibited by privacy policy.' };
      }
      break;
    }
  }

  return { valid: true };
}
