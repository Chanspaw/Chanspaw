import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletMode } from '../../contexts/WalletModeContext';
import { Menu, X, Search, Plus, Bell, User, Settings, LogOut, Users, Shield, ToggleLeft, ToggleRight, Coins, DollarSign, RefreshCw, CheckCircle } from 'lucide-react';

import { autoLoginAsAdmin } from '../../utils/autoLogin';
import { Dialog } from '@headlessui/react';

interface HeaderProps {
  onMenuToggle: () => void;
  isMobileMenuOpen: boolean;
  onSectionChange?: (section: string) => void;
}

export function Header({ onMenuToggle, isMobileMenuOpen, onSectionChange }: HeaderProps) {
  const { user, logout } = useAuth();
  const { walletMode, toggleWalletMode, isRealMode, isVirtualMode } = useWalletMode();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [walletBalance, setWalletBalance] = useState<{ real_balance: number; virtual_balance: number }>({ real_balance: 0, virtual_balance: 0 });
  const [reloadLoading, setReloadLoading] = useState(false);
  const [reloadSuccess, setReloadSuccess] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Fetch wallet balances on mount or when user changes
  useEffect(() => {
    async function fetchBalance() {
      if (!user) return;
      try {
        const res = await fetch(import.meta.env.VITE_API_URL + '/api/wallet/balance', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          setWalletBalance({
            real_balance: data.data?.real_balance ?? 0,
            virtual_balance: data.data?.virtual_balance ?? 0
          });
        }
      } catch (e) {
        setWalletBalance({ real_balance: 0, virtual_balance: 0 });
      }
    }
    fetchBalance();
  }, [user]);

  const handleDepositClick = () => {
    if (onSectionChange) {
      onSectionChange('wallet');
    }
  };



  const handleAdminLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await autoLoginAsAdmin();
      if (result.success) {
        window.location.reload();
      } else {
        alert('Admin login failed: ' + result.error);
      }
    } catch (error) {
      alert('Admin login error: ' + error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleVirtualReload = async () => {
    setReloadLoading(true);
    setReloadSuccess(false);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/wallet/virtual-reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance((prev) => ({ ...prev, virtual_balance: data.data.virtual_balance }));
        setReloadSuccess(true);
        setTimeout(() => setReloadSuccess(false), 1500);
      }
    } finally {
      setReloadLoading(false);
    }
  };

  return (
    <header className="bg-gaming-darker border-b border-gaming-card px-3 py-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
      <div className="flex items-center justify-between w-full gap-3">
        {/* Logo and Mobile Menu */}
        <div className="flex items-center gap-3 sm:gap-3 lg:gap-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg bg-gaming-card hover:bg-gray-600 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 text-white" />
            ) : (
              <Menu className="h-5 w-5 text-white" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSectionChange && onSectionChange('home')}
              className="flex items-center gap-2 focus:outline-none"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              aria-label="Go to Home"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm sm:text-base">C</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-white font-bold text-sm lg:text-lg">Chanspaw</h1>
                <p className="text-gray-400 text-xs">Gaming Platform</p>
              </div>
            </button>
          </div>
        </div>

        {/* Center: Switch + Wallet Card */}
        <div className="flex items-center gap-2 w-full max-w-[400px]">
          <div className="flex items-center bg-gradient-to-r from-gray-900/90 to-gray-800/80 border border-gaming-card shadow-lg rounded-2xl px-3 py-1.5 w-full sm:w-auto">
            {/* Wallet Mode Switch */}
            <div className="flex items-center bg-gray-800 rounded-full p-1 shadow-inner mr-3 transition-all">
              <button
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all focus:outline-none focus:ring-0 ${isRealMode ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                onClick={() => isVirtualMode && toggleWalletMode()}
                disabled={isRealMode}
              >
                Real
              </button>
              <button
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all focus:outline-none focus:ring-0 ${isVirtualMode ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                onClick={() => isRealMode && toggleWalletMode()}
                disabled={isVirtualMode}
              >
                Virtual
              </button>
            </div>
            {/* Wallet Display - Always Horizontal */}
            <div className="flex items-center min-w-0 gap-2">
              {isRealMode && (
                <div className="flex items-center gap-1 bg-gray-950/80 rounded-lg px-3 py-1 shadow-lg border border-gray-800 min-w-[120px] whitespace-nowrap">
                  <button
                    onClick={handleDepositClick}
                    className="focus:outline-none hover:scale-110 active:scale-95 transition-transform border border-green-400 rounded-full p-1.5 bg-white/5 hover:bg-green-500/20"
                    title="Add Money"
                    style={{ lineHeight: 1, height: '1.3em', width: '1.3em', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 0, marginRight: '2px' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="10" cy="10" r="9" stroke="#22c55e" strokeWidth="2" fill="#fff"/>
                      <path d="M10 6V14" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M6 10H14" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <span className="font-medium text-green-400 text-lg whitespace-nowrap px-1 truncate max-w-[90px]">
                    ${walletBalance.real_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="uppercase text-xs text-gray-400 font-semibold">USD</span>
                </div>
              )}
              {isVirtualMode && (
                <div className="flex items-center gap-1 bg-gray-950/80 rounded-lg px-3 py-1 shadow-lg border border-gray-800 min-w-[120px] whitespace-nowrap">
                  <button
                    onClick={handleVirtualReload}
                    className="flex items-center justify-center rounded-full bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-150 focus:outline-none"
                    style={{ width: 22, height: 22, padding: 0, marginRight: '2px' }}
                    title="Reload Virtual Coins"
                    type="button"
                  >
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5a8 8 0 1 0 6 6" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.5 4.5v4h-4" />
                    </svg>
                  </button>
                  <span className="font-medium text-blue-400 text-base whitespace-nowrap px-1 truncate max-w-[90px]">
                    {walletBalance.virtual_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="uppercase text-xs text-gray-400 font-semibold">COIN</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center gap-2">
          {/* User Menu removed as per request */}
        </div>
      </div>

      {/* Admin Panel Link */}
      {user?.isAdmin && (
        <div className="mt-3">
          <a
            href="/admin"
            className="inline-flex items-center space-x-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium text-xs sm:text-xs hover:opacity-90 transition-opacity"
            title="Go to Admin Dashboard"
          >
            <Shield className="h-3 w-3 sm:h-3 sm:w-3" />
            <span className="hidden sm:inline">Admin Panel</span>
          </a>
        </div>
      )}

      {/* Search Dialog */}
      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm rounded-lg bg-gaming-card p-4 shadow-xl">
            <div className="flex items-center mb-2">
              <Search className="h-5 w-5 text-gray-400 mr-2" />
              <input
                autoFocus
                type="text"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                placeholder="Search games, players..."
                className="w-full bg-transparent border-b border-gaming-accent text-white placeholder-gray-400 focus:outline-none text-base px-2 py-1"
              />
              <button onClick={() => setSearchOpen(false)} className="ml-2 p-1 rounded hover:bg-gray-700">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Click outside to close dropdowns */}
      {/* Removed dropdown click outside handler since user menu is gone */}
    </header>
  );
}