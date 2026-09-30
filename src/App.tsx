import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FinanceProvider } from './context/FinanceContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// 6 Core Simplified Pages + Settings
import { Dashboard } from './features/dashboard/Dashboard';
import { LoansPage } from './features/loans/LoansPage';
import { SalaryPage } from './features/salary/SalaryPage';
import { SwiggyPage } from './features/swiggy/SwiggyPage';
import { ExpensesPage } from './features/expenses/ExpensesPage';
import { CashFlowPage } from './features/cashflow/CashFlowPage';
import { SettingsPage } from './features/settings/SettingsPage';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <FinanceProvider>
            <ErrorBoundary>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<AppShell />}>
                    {/* Core 7 Routes */}
                    <Route index element={<Dashboard />} />
                    <Route path="dashboard" element={<Navigate to="/" replace />} />
                    <Route path="loans" element={<LoansPage />} />
                    <Route path="salary" element={<SalaryPage />} />
                    <Route path="swiggy" element={<SwiggyPage />} />
                    <Route path="expenses" element={<ExpensesPage />} />
                    <Route path="cash-flow" element={<CashFlowPage />} />
                    <Route path="settings" element={<SettingsPage />} />

                    {/* Clean compatibility redirects for legacy routes */}
                    <Route path="debts" element={<Navigate to="/loans" replace />} />
                    <Route path="income" element={<Navigate to="/salary" replace />} />
                    <Route path="budget" element={<Navigate to="/expenses" replace />} />
                    <Route path="payments" element={<Navigate to="/loans" replace />} />
                    <Route path="reports" element={<Navigate to="/cash-flow" replace />} />
                    <Route path="timeline" element={<Navigate to="/cash-flow" replace />} />
                    <Route path="forecast" element={<Navigate to="/cash-flow" replace />} />
                    <Route path="planning" element={<Navigate to="/cash-flow" replace />} />
                    <Route path="sms" element={<Navigate to="/" replace />} />
                    <Route path="sms-review" element={<Navigate to="/" replace />} />
                    <Route path="diagnostics" element={<Navigate to="/settings" replace />} />
                    <Route path="sync" element={<Navigate to="/settings" replace />} />
                    <Route path="audit" element={<Navigate to="/settings" replace />} />
                    <Route path="command-center" element={<Navigate to="/" replace />} />
                    <Route path="notifications" element={<Navigate to="/" replace />} />
                    <Route path="data-quality" element={<Navigate to="/" replace />} />
                    <Route path="accounts" element={<Navigate to="/loans" replace />} />
                    <Route path="transactions" element={<Navigate to="/expenses" replace />} />
                    <Route path="goals" element={<Navigate to="/cash-flow" replace />} />
                    <Route path="calendar" element={<Navigate to="/cash-flow" replace />} />

                    {/* Catch-all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </ErrorBoundary>
          </FinanceProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
