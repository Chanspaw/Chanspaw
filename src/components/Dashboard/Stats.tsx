import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Target, TrendingUp, Star, Gamepad2, Zap, Clock, Award } from 'lucide-react';

export function Stats() {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadUserStats();
    }
  }, [user?.id]);

  const loadUserStats = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/users/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.data || data);
      } else {
        console.error('Failed to load user stats:', response.status);
        setUserStats(null);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
      setUserStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading) return null;

  // Use userStats if available, otherwise fall back to user data
  const stats = userStats || user;
  const totalGames = (stats.wins || 0) + (stats.losses || 0);
  const winRate = totalGames > 0 ? Math.round(((stats.wins || 0) / totalGames) * 100) : 0;
  const currentStreak = stats.currentStreak || stats.winStreak || 0;
  const bestStreak = stats.bestStreak || stats.winStreak || 0;

  const statsArray = [
    {
      label: 'Total Wins',
      value: stats.wins || 0,
      icon: Trophy,
      color: 'text-gaming-accent',
      bg: 'bg-gaming-accent/10',
      subtitle: `${totalGames} games played`
    },
    {
      label: 'Win Rate',
      value: `${winRate}%`,
      icon: Target,
      color: 'text-gaming-gold',
      bg: 'bg-gaming-gold/10',
      subtitle: `${stats.wins || 0} wins, ${stats.losses || 0} losses`
    },
    {
      label: 'Current Streak',
      value: currentStreak,
      icon: Zap,
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
      subtitle: `Best: ${bestStreak} wins`
    },
    {
      label: 'Balance',
      value: `$${(stats.balance || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      subtitle: 'Available funds'
    },
    {
      label: 'Level',
      value: stats.level || 1,
      icon: Star,
      color: 'text-gaming-purple',
      bg: 'bg-gaming-purple/10',
      subtitle: 'Experience level'
    },
    {
      label: 'Games Today',
      value: stats.gamesToday || 0,
      icon: Gamepad2,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      subtitle: 'Daily activity'
    },
    {
      label: 'Avg Score',
      value: stats.averageScore || 0,
      icon: Award,
      color: 'text-pink-400',
      bg: 'bg-pink-400/10',
      subtitle: 'Per game average'
    },
    {
      label: 'Play Time',
      value: `${stats.totalPlayTime || 0}h`,
      icon: Clock,
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
      subtitle: 'Total time played'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsArray.slice(0, 4).map((stat, index) => (
          <div key={index} className="bg-card-gradient rounded-xl p-6 border border-gray-700 hover:border-gaming-accent/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs">{stat.label}</p>
                <p className="text-white text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
            <p className="text-gray-500 text-xs">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Additional Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsArray.slice(4).map((stat, index) => (
          <div key={index} className="bg-card-gradient rounded-xl p-4 border border-gray-700 hover:border-gaming-accent/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs font-medium">{stat.label}</p>
                <p className="text-white text-xl font-bold mt-1">{stat.value}</p>
                <p className="text-gray-500 text-xs mt-1">{stat.subtitle}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}