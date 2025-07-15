import React from 'react';
import { 
  Users, 
  Settings,
  BarChart3,
  Shield,
  ArrowLeft,
  DollarSign,
  FileText,
  Bell,
  Cog,
  UserCheck,
  MessageSquare,
  PieChart,
  TrendingUp,
  Wallet
} from 'lucide-react';

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onBackToMain: () => void;
  isOpen?: boolean;
}

export function AdminSidebar({ activeSection, onSectionChange, onBackToMain, isOpen = true }: AdminSidebarProps) {
  const adminItems = [
    { id: 'admin-users', label: 'Users', icon: Users },
    { id: 'admin-kyc', label: 'KYC Management', icon: UserCheck },
    { id: 'admin-games', label: 'Game Management', icon: Settings },
    { id: 'admin-analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'admin-support', label: 'Support & Disputes', icon: MessageSquare },
    { id: 'admin-content', label: 'Content Management', icon: FileText },
    { id: 'admin-notifications', label: 'Notifications', icon: Bell },
    { id: 'admin-settings', label: 'Settings & Config', icon: Cog },
    { id: 'admin-security', label: 'Security & Admin Control', icon: Shield },
    { id: 'admin-compliance', label: 'Compliance', icon: Shield },
    { id: 'admin-owner-profit', label: 'Owner Profit', icon: DollarSign },
  ];

  return (
    <div className={`
      fixed lg:static inset-y-0 left-0 z-40
      w-64 bg-gaming-darker border-r border-gaming-card
      transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <nav className="mt-8 px-4 h-full overflow-y-auto">
        <div className="mb-6">
          <button
            onClick={onBackToMain}
            className="w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 text-gray-300 hover:bg-gaming-card hover:text-white"
          >
            <ArrowLeft className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="text-sm sm:text-base">Back to Main Site</span>
          </button>
        </div>

        <div className="mb-6">
          <h3 className="px-4 text-xs font-semibold text-gaming-gold uppercase tracking-wider mb-3">
            Admin Panel
          </h3>
        </div>

        <div className="space-y-2">
          {adminItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 ${
                activeSection === item.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gaming-card hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="text-sm sm:text-base">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Gestion Financière
          </h3>
        </div>
      </nav>
    </div>
  );
} 
