import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Check,
  X,
  User,
  Layers,
  Wallet,
  Briefcase,
  CreditCard,
  ShoppingBag,
  Bell,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { state, updateProfile, updateNotificationSettings } = useFinance();
  const [step, setStep] = useState(0);
  const [userName, setUserName] = useState(state.profile.name);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to CASH FLOW',
      subtitle: 'Your production-grade, local-first personal financial command center.',
      icon: Sparkles,
    },
    {
      title: 'Profile Identification',
      subtitle: 'Personalize your ledger display name.',
      icon: User,
    },
    {
      title: 'Currency & Locale',
      subtitle: 'Configured strictly for Indian Rupee (₹) and Indian accounting standards.',
      icon: Layers,
    },
    {
      title: 'Bank & Cash Accounts',
      subtitle: 'Maintain separate accounts for salary, cash-in-hand, and digital wallets.',
      icon: Wallet,
    },
    {
      title: 'Income Sources',
      subtitle: 'Track regular salary alongside gig platform earnings like Swiggy delivery.',
      icon: Briefcase,
    },
    {
      title: 'Debts & Borrowing',
      subtitle: 'Track personal loans, vehicle EMIs, and credit card balances with amortized models.',
      icon: CreditCard,
    },
    {
      title: 'Essential vs Discretionary',
      subtitle: 'Separate non-negotiable living expenses from discretionary lifestyle spending.',
      icon: ShoppingBag,
    },
    {
      title: 'Due Date Notifications',
      subtitle: 'Receive quiet-hour aware reminders for upcoming payment commitments.',
      icon: Bell,
    },
    {
      title: 'Ready to Operate',
      subtitle: 'Your financial command center is primed. Start tracking or explore demo data.',
      icon: Check,
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (step === 1 && userName.trim()) {
      updateProfile({ name: userName.trim() });
    }
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#131926] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Progress Bar */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Step {step + 1} of {steps.length}</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer font-medium"
          >
            Skip Tour
          </button>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Step Icon & Content */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
            <Icon className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{current.title}</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
            {current.subtitle}
          </p>
        </div>

        {/* Step-specific content */}
        {step === 1 && (
          <div className="max-w-xs mx-auto">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-center text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            {step === steps.length - 1 ? 'Finish & Explore' : 'Continue'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
