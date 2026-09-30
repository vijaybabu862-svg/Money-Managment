// Polyfill localStorage for Node test runner
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

import { runStage3VerificationTests } from './financialIntelligence.test';
import { runStage5VerificationTests } from './stage5Master.test';
import { runStage6VerificationTests } from './stage6Master.test';
import { runStage7VerificationTests } from './stage7Master.test';
import { runStage8VerificationTests } from './stage8Master.test';
import { runStage9VerificationTests } from './stage9Master.test';
import { runStage10VerificationTests } from './stage10Master.test';
import { runDefectAuditTests } from './defectAudit.test';

const stage3 = runStage3VerificationTests();

console.log('====================================================');
console.log(`CASH FLOW Stage 3 Financial Verification Tests: ${stage3.passed}/${stage3.total} Passed`);
console.log('====================================================');

for (const r of stage3.results) {
  console.log(`[${r.status}] ${r.test}`);
  if (r.details) {
    console.log(`  -> Details: ${r.details}`);
  }
}

const stage5 = runStage5VerificationTests();

console.log('\n====================================================');
console.log(`CASH FLOW Stage 5 SMS & Review Verification Tests: ${stage5.passed}/${stage5.total} Passed`);
console.log('====================================================');

for (const r of stage5.results) {
  console.log(`[${r.status}] ${r.test}`);
  if (r.details) {
    console.log(`  -> Details: ${r.details}`);
  }
}

const stage6 = runStage6VerificationTests();

console.log('\n====================================================');
console.log(`CASH FLOW Stage 6 Notifications & Reminders Tests: ${stage6.passed}/${stage6.total} Passed`);
console.log('====================================================');

for (const r of stage6.results) {
  console.log(`[${r.status}] ${r.test}`);
  if (r.details) {
    console.log(`  -> Details: ${r.details}`);
  }
}

const stage7 = runStage7VerificationTests();

console.log('\n====================================================');
console.log(`CASH FLOW Stage 7 Command Center & Intelligence Tests: ${stage7.passed}/${stage7.total} Passed`);
console.log('====================================================');

for (const r of stage7.results) {
  console.log(`[${r.status}] ${r.test}`);
  if (r.details) {
    console.log(`  -> Details: ${r.details}`);
  }
}

const stage8 = runStage8VerificationTests();

console.log('\n====================================================');
console.log(`CASH FLOW Stage 8 Production Hardening & Recovery Tests: ${stage8.passed}/${stage8.total} Passed`);
console.log('====================================================');

for (const r of stage8.results) {
  console.log(`[${r.status}] ${r.test}`);
  if (r.details) {
    console.log(`  -> Details: ${r.details}`);
  }
}

const stage9 = runStage9VerificationTests();

console.log('\n====================================================');
console.log(`CASH FLOW Stage 9 Firebase & Multi-Device Tests: ${stage9.passed}/${stage9.total} Passed`);
console.log('====================================================');

for (const r of stage9.results) {
  console.log(`[${r.status}] ${r.test}`);
  if (r.details) {
    console.log(`  -> Details: ${r.details}`);
  }
}

const stage10 = runStage10VerificationTests();

console.log('\n====================================================');
console.log(`CASH FLOW Stage 10 Production Hardening & Release Tests: ${stage10.passed}/${stage10.total} Passed`);
console.log('====================================================');

for (const r of stage10.results) {
  console.log(`[${r.status}] ${r.test}`);
  if (r.details) {
    console.log(`  -> Details: ${r.details}`);
  }
}

const defectAudit = runDefectAuditTests();

console.log('\n====================================================');
console.log(`CASH FLOW Post-Stage-10 Defect Audit & Regression Tests: ${defectAudit.passed}/${defectAudit.total} Passed`);
console.log('====================================================');

for (const r of defectAudit.results) {
  console.log(`[${r.status}] ${r.test}`);
  if (r.details) {
    console.log(`  -> Details: ${r.details}`);
  }
}

const totalPassed =
  stage3.passed +
  stage5.passed +
  stage6.passed +
  stage7.passed +
  stage8.passed +
  stage9.passed +
  stage10.passed +
  defectAudit.passed;

const totalTests =
  stage3.total +
  stage5.total +
  stage6.total +
  stage7.total +
  stage8.total +
  stage9.total +
  stage10.total +
  defectAudit.total;

const allPassed =
  stage3.passed === stage3.total &&
  stage5.passed === stage5.total &&
  stage6.passed === stage6.total &&
  stage7.passed === stage7.total &&
  stage8.passed === stage8.total &&
  stage9.passed === stage9.total &&
  stage10.passed === stage10.total &&
  defectAudit.passed === defectAudit.total;

if (allPassed) {
  console.log('\n====================================================');
  console.log(`ALL MASTER & DEFECT AUDIT TESTS PASSED SUCCESSFULLY! (${totalPassed}/${totalTests})`);
  console.log('====================================================');
  process.exit(0);
} else {
  console.error(
    `\nFAILED: Stage 3 (${stage3.passed}/${stage3.total}), Stage 5 (${stage5.passed}/${stage5.total}), Stage 6 (${stage6.passed}/${stage6.total}), Stage 7 (${stage7.passed}/${stage7.total}), Stage 8 (${stage8.passed}/${stage8.total}), Stage 9 (${stage9.passed}/${stage9.total}), Stage 10 (${stage10.passed}/${stage10.total}), Defect Audit (${defectAudit.passed}/${defectAudit.total})`
  );
  process.exit(1);
}

