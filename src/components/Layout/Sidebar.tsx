import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletMode } from '../../contexts/WalletModeContext';
import { 
  Home, 
  User, 
  Gamepad2, 
  Wallet, 
  Trophy, 
  Users, 
  HelpCircle, 
  Settings,
  Crown,
  X,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onAdminClick: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ activeSection, onSectionChange, onAdminClick, isOpen = true, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { walletMode, toggleWalletMode } = useWalletMode();

  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'play-games', label: 'Play Games', icon: Gamepad2 },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'support', label: 'Support', icon: HelpCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-2 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">C</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">Chanspaw</h1>
            <p className="text-gray-400 text-xs">Gaming Platform</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
        >
          <X className="h-3 w-3 text-white" />
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-2 sm:p-3 lg:p-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all text-left group ${
                  isActive
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
              </button>
            );
          })}
          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-1.5 sm:py-2 mt-2 rounded-lg transition-all text-left group text-red-400 hover:bg-red-600/20 hover:text-white"
          >
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium truncate">Logout</span>
          </button>
        </div>

        {/* Admin Section */}
        {user?.isAdmin && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-700">
            <div className="px-2 sm:px-3 mb-1.5 sm:mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Admin</span>
            </div>
            <button
              onClick={onAdminClick}
              className="w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all text-left group text-gaming-gold hover:bg-gaming-gold/10"
            >
              <Crown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Admin Panel</span>
            </button>
          </div>
        )}
      </nav>

      {/* User Info */}
      <div className="p-2 sm:p-3 lg:p-4 border-t border-gray-700">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gaming-accent rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-xs sm:text-sm">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-xs sm:text-sm truncate">{user?.username}</p>
            <p className="text-gray-400 text-xs truncate">Level {user?.level}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`sidebar-mobile ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:relative`}>
        <div className="flex flex-col h-full">
          {/* User Profile Section */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm sm:text-base">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm sm:text-base truncate">
                  {user?.username || 'User'}
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm truncate">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>
            
            {/* Wallet Mode Toggle */}
            <div className="mt-4 p-2 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-xs sm:text-sm">Wallet Mode</span>
                <button
                  onClick={toggleWalletMode}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all focus:outline-none focus:ring-0 ${walletMode === 'real' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                  {walletMode === 'real' ? 'Real' : 'Virtual'}
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-2 sm:p-3 lg:p-4">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const isLeaderboard = item.id === 'leaderboard';
                if (isLeaderboard) {
                  return (
                    <div key={item.id} className="relative flex items-center">
                      <button
                        className={`w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all text-left group opacity-60 cursor-not-allowed`}
                        disabled
                        tabIndex={-1}
                        aria-disabled="true"
                      >
                        <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                      </button>
                      <span className="ml-2 text-xs text-gray-400 italic whitespace-nowrap">(Coming Soon)</span>
                    </div>
                  );
                }
                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all text-left group ${
                      isActive
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                  </button>
                );
              })}
              {/* Logout Button */}
              <button
                onClick={logout}
                className="w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-1.5 sm:py-2 mt-2 rounded-lg transition-all text-left group text-red-400 hover:bg-red-600/20 hover:text-white"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">Logout</span>
              </button>
            </div>

            {/* Admin Section */}
            {user?.isAdmin && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-700">
                <div className="px-2 sm:px-3 mb-1.5 sm:mb-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Admin</span>
                </div>
                <button
                  onClick={onAdminClick}
                  className="w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all text-left group text-gaming-gold hover:bg-gaming-gold/10"
                >
                  <Crown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">Admin Panel</span>
                </button>
              </div>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}