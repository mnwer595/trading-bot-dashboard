"use client";

import { useEffect, useState } from "react";

type Account = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

type AccountSelectorProps = {
  selectedAccount: string;
  onAccountChange: (accountId: string) => void;
  className?: string;
};

export default function AccountSelector({ selectedAccount, onAccountChange, className = "" }: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      console.log("Fetching accounts from /accounts.json");
      const response = await fetch('/accounts.json');
      console.log("Accounts response status:", response.status);
      if (response.ok) {
        const accountsData: Account[] = await response.json();
        console.log("Accounts data:", accountsData);
        setAccounts(accountsData);
      } else {
        console.error("Failed to fetch accounts, status:", response.status);
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-sm font-medium text-gray-300">Account:</span>
        <div className="animate-pulse bg-gray-700 h-8 w-32 rounded"></div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-sm font-medium text-gray-300">Account:</span>
        <div className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-400">
          No accounts available
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm font-medium text-gray-300">Account:</span>
      <div className="relative flex-1 sm:flex-none">
        <select
          value={selectedAccount}
          onChange={(e) => onAccountChange(e.target.value)}
          className="appearance-none bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer w-full sm:min-w-[150px]"
        >
          {accounts.filter(account => account.enabled).map(account => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
