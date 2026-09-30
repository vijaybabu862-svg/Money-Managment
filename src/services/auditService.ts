import { AuditAction, AuditEvent } from '../types/finance';

/**
 * CASH FLOW — Stage 8 Audit Service
 * Maintains an immutable chronological audit trail of all ledger events.
 * Strictly respects privacy: masks sensitive account/card numbers and omits raw SMS.
 */

export function maskSensitiveString(str?: string): string {
  if (!str) return '';
  // Mask 16-digit card or long bank account numbers
  return str.replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?(\d{4})\b/g, '•••• •••• •••• $1')
            .replace(/\b\d{6,12}(\d{4})\b/g, '••••$1');
}

export const maskSensitiveText = maskSensitiveString;
export const maskSensitiveDetails = maskSensitiveString;


/**
 * Sanitizes before/after payloads for audit retention
 */
export function sanitizeAuditPayload(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;

  const clone = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;

  // Scrub any raw SMS text
  if ('rawText' in clone) {
    clone.rawText = '[RAW_SMS_SCRUBBED_FOR_PRIVACY]';
  }
  if ('rawSms' in clone) {
    clone.rawSms = '[RAW_SMS_SCRUBBED_FOR_PRIVACY]';
  }

  // Mask card numbers
  if ('accountNumber' in clone && typeof clone.accountNumber === 'string') {
    clone.accountNumber = maskSensitiveString(clone.accountNumber);
  }
  if ('cardNumber' in clone && typeof clone.cardNumber === 'string') {
    clone.cardNumber = maskSensitiveString(clone.cardNumber);
  }

  return clone;
}

export function createAuditEvent(
  action: AuditAction,
  entityType: string,
  entityId: string,
  summary: string,
  options?: {
    before?: unknown;
    after?: unknown;
    source?: string;
    canUndo?: boolean;
  }
): AuditEvent {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    action,
    entityType,
    entityId,
    summary: maskSensitiveString(summary),
    before: options?.before ? sanitizeAuditPayload(options.before) : undefined,
    after: options?.after ? sanitizeAuditPayload(options.after) : undefined,
    source: options?.source || 'MANUAL',
    canUndo: options?.canUndo ?? (action === 'CREATE' || action === 'UPDATE' || action === 'DELETE'),
  };
}

export function appendAuditEventWithRetention(
  existingEvents: AuditEvent[] = [],
  newEvent: AuditEvent,
  retentionDays: number = 365
): AuditEvent[] {
  const updated = [newEvent, ...existingEvents];

  if (retentionDays <= 0) {
    // 0 = unlimited retention
    return updated;
  }

  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return updated.filter((ev) => {
    const evTime = new Date(ev.timestamp).getTime();
    return isNaN(evTime) || evTime >= cutoffTime;
  });
}

export function filterAuditTrail(
  events: AuditEvent[],
  filters: {
    query?: string;
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }
): AuditEvent[] {
  const normQuery = filters.query ? filters.query.toLowerCase().trim() : '';

  return events.filter((ev) => {
    if (filters.entityType && filters.entityType !== 'ALL' && ev.entityType !== filters.entityType) {
      return false;
    }
    if (filters.action && filters.action !== 'ALL' && ev.action !== filters.action) {
      return false;
    }
    if (filters.startDate) {
      const evDate = ev.timestamp.split('T')[0];
      if (evDate < filters.startDate) return false;
    }
    if (filters.endDate) {
      const evDate = ev.timestamp.split('T')[0];
      if (evDate > filters.endDate) return false;
    }
    if (normQuery) {
      const matchSummary = ev.summary.toLowerCase().includes(normQuery);
      const matchEntity = ev.entityType.toLowerCase().includes(normQuery);
      const matchId = ev.entityId.toLowerCase().includes(normQuery);
      if (!matchSummary && !matchEntity && !matchId) {
        return false;
      }
    }
    return true;
  });
}

export function recordAuditEvent(
  existingEvents: AuditEvent[],
  action: AuditAction,
  entityType: string,
  entityId: string,
  summary: string,
  options?: {
    before?: unknown;
    after?: unknown;
    source?: string;
    canUndo?: boolean;
  }
): AuditEvent[] {
  const ev = createAuditEvent(action, entityType, entityId, summary, options);
  return appendAuditEventWithRetention(existingEvents, ev);
}

