import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { searchCashFlow, SearchResultItem } from '../../services/searchService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { state } = useFinance();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global keydown handler for Escape & Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = searchCashFlow(state, query);

  const handleSelectResult = (item: SearchResultItem) => {
    onClose();
    navigate(item.route);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center p-4 sm:pt-20">
      <div className="bg-white dark:bg-[#131926] border border-gray-200 dark:border-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search transactions, accounts, debts, goals, audit trail... (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
            ESC to close
          </span>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto p-2 divide-y divide-gray-50 dark:divide-gray-800/60">
          {!query.trim() ? (
            <div className="p-8 text-center text-xs text-gray-400">
              Type an amount (e.g. ₹1,704), lender name, merchant, or account name to search across the entire ledger.
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No ledger records found matching &ldquo;{query}&rdquo;.
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectResult(item)}
                className="w-full text-left p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {item.category}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{item.subtitle}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.amount !== undefined && (
                    <span className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 flex items-center justify-between">
          <span>Read-only local search • Privacy-preserving</span>
          <span className="flex items-center gap-1">
            Navigate with <CornerDownLeft className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
};
