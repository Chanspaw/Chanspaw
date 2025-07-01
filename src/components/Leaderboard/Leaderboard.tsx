import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Trophy, 
  Medal, 
  Award, 
  Star, 
  Crown, 
  Activity,
  Target,
  Shield,
  Users
} from 'lucide-react';

export function Leaderboard() {
  const { user } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'month' | 'week'>('all');

  useEffect(() => {
    loadLeaderboardData();
  }, [selectedPeriod]);

  const loadLeaderboardData = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/leaderboard?period=' + selectedPeriod, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLeaderboardData(data.data?.leaderboard || data.leaderboard || []);
      } else {
        console.error('Failed to load leaderboard data:', response.status);
        setLeaderboardData([]);
      }
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-gaming-gold" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-gray-400 font-bold text-lg">{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-gaming-gold/50';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-slate-400/20 border-gray-400/50';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/50';
      default:
        return 'bg-card-gradient border-gray-700';
    }
  };

  // User stats calculations
  const totalGames = (user?.wins || 0) + (user?.losses || 0);
  const winRate = totalGames > 0 ? Math.round(((user?.wins || 0) / totalGames) * 100) : 0;

  const achievements = [
    {
      name: 'First Win',
      description: 'Win your first game',
      icon: Trophy,
      unlocked: (user?.wins || 0) > 0,
      color: 'text-gaming-gold'
    },
    {
      name: 'Win Streak',
      description: 'Win 3 games in a row',
      icon: Award,
      unlocked: (user?.winStreak || 0) >= 3,
      color: 'text-gaming-purple'
    },
    {
      name: 'Veteran',
      description: 'Play 50 games',
      icon: Shield,
      unlocked: totalGames >= 50,
      color: 'text-gaming-accent'
    },
    {
      name: 'Champion',
      description: 'Reach 80% win rate',
      icon: Star,
      unlocked: winRate >= 80,
      color: 'text-gaming-gold'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center">
          <Trophy className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3 text-gaming-gold" />
          Leaderboard
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-2 rounded-lg text-sm ${selectedPeriod === 'all' ? 'bg-gaming-accent text-white' : 'bg-gaming-dark text-gray-300 hover:bg-gray-600'}`}
            onClick={() => setSelectedPeriod('all')}
          >
            All Time
          </button>
          <button
            className={`px-3 py-2 rounded-lg text-sm ${selectedPeriod === 'month' ? 'bg-gaming-accent text-white' : 'bg-gaming-dark text-gray-300 hover:bg-gray-600'}`}
            onClick={() => setSelectedPeriod('month')}
          >
            This Month
          </button>
          <button
            className={`px-3 py-2 rounded-lg text-sm ${selectedPeriod === 'week' ? 'bg-gaming-accent text-white' : 'bg-gaming-dark text-gray-300 hover:bg-gray-600'}`}
            onClick={() => setSelectedPeriod('week')}
          >
            This Week
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Leaderboard Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top 3 Podium - Empty State */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <div className="bg-card-gradient rounded-xl p-4 lg:p-6 border border-gray-700 text-center">
              <div className="relative mb-3 lg:mb-4">
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full mx-auto border-4 border-gray-600 bg-gray-800 flex items-center justify-center">
                  <Users className="h-6 w-6 lg:h-8 lg:w-8 text-gray-500" />
                </div>
                <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2">
                  <Medal className="h-6 w-6 text-gray-400" />
                </div>
              </div>
              <h3 className="text-gray-400 font-bold text-base lg:text-lg mb-2">No Players</h3>
              <div className="space-y-1 text-xs lg:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Wins:</span>
                  <span className="text-gray-400 font-semibold">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Win Rate:</span>
                  <span className="text-gray-400 font-semibold">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Earnings:</span>
                  <span className="text-gray-400 font-semibold">-</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-gaming-gold/50 rounded-xl p-4 lg:p-6 text-center sm:order-2 transform sm:scale-105">
              <div className="relative mb-3 lg:mb-4">
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full mx-auto border-4 border-gaming-accent bg-gray-800 flex items-center justify-center">
                  <Trophy className="h-6 w-6 lg:h-8 lg:w-8 text-gaming-gold" />
                </div>
                <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2">
                  <Crown className="h-6 w-6 text-gaming-gold" />
                </div>
              </div>
              <h3 className="text-gray-400 font-bold text-base lg:text-lg mb-2">No Players</h3>
              <div className="space-y-1 text-xs lg:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Wins:</span>
                  <span className="text-gray-400 font-semibold">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Win Rate:</span>
                  <span className="text-gray-400 font-semibold">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Earnings:</span>
                  <span className="text-gray-400 font-semibold">-</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/50 rounded-xl p-4 lg:p-6 text-center sm:order-3">
              <div className="relative mb-3 lg:mb-4">
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full mx-auto border-4 border-gray-600 bg-gray-800 flex items-center justify-center">
                  <Award className="h-6 w-6 lg:h-8 lg:w-8 text-amber-600" />
                </div>
                <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2">
                  <Award className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <h3 className="text-gray-400 font-bold text-base lg:text-lg mb-2">No Players</h3>
              <div className="space-y-1 text-xs lg:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Wins:</span>
                  <span className="text-gray-400 font-semibold">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Win Rate:</span>
                  <span className="text-gray-400 font-semibold">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Earnings:</span>
                  <span className="text-gray-400 font-semibold">-</span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Leaderboard Table */}
          <div className="bg-card-gradient rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-gray-700">
              <h2 className="text-lg lg:text-xl font-bold text-white">Complete Rankings</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gaming-dark">
                  <tr>
                    <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="hidden sm:table-cell px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Wins
                    </th>
                    <th className="hidden md:table-cell px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Win Rate
                    </th>
                    <th className="hidden lg:table-cell px-3 lg:px-6 py-3 lg:py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total Earnings
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <tr>
                    <td colSpan={6} className="px-3 lg:px-6 py-12 text-center">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center">
                          <Users className="h-8 w-8 text-gray-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-2">No players yet</h3>
                          <p className="text-gray-400 text-sm">The leaderboard will populate once players start competing</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar with User Stats and Achievements */}
        <div className="space-y-4 lg:space-y-6">
          {/* Quick Stats */}
          <div className="bg-card-gradient rounded-xl p-4 lg:p-6 border border-gray-700">
            <h3 className="text-white font-semibold mb-3 lg:mb-4 flex items-center">
              <Activity className="h-4 w-4 lg:h-5 lg:w-5 mr-2 text-gaming-accent" />
              Quick Stats
            </h3>
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Total Games</span>
                <span className="text-white font-semibold text-sm lg:text-base">{totalGames}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Wins</span>
                <span className="text-green-400 font-semibold text-sm lg:text-base">{user?.wins || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Losses</span>
                <span className="text-red-400 font-semibold text-sm lg:text-base">{user?.losses || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Win Rate</span>
                <span className="text-gaming-gold font-semibold text-sm lg:text-base">{winRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Current Streak</span>
                <span className="text-gaming-purple font-semibold text-sm lg:text-base">{user?.winStreak || 0}</span>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-card-gradient rounded-xl p-4 lg:p-6 border border-gray-700">
            <h3 className="text-white font-semibold mb-3 lg:mb-4 flex items-center">
              <Award className="h-4 w-4 lg:h-5 lg:w-5 mr-2 text-gaming-gold" />
              Achievements
            </h3>
            <div className="space-y-2 lg:space-y-3">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className={`p-2 lg:p-3 rounded-lg border ${
                    achievement.unlocked
                      ? 'bg-gaming-dark border-gaming-gold/30'
                      : 'bg-gray-800/50 border-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-2 lg:space-x-3">
                    <div className={`p-1.5 lg:p-2 rounded-lg ${
                      achievement.unlocked ? achievement.color.replace('text-', 'bg-') + '/20' : 'bg-gray-700'
                    }`}>
                      <achievement.icon className={`h-3 w-3 lg:h-4 lg:w-4 ${
                        achievement.unlocked ? achievement.color : 'text-gray-500'
                      }`} />
                    </div>
                    <div>
                      <h4 className={`font-semibold text-xs lg:text-sm ${
                        achievement.unlocked ? 'text-white' : 'text-gray-500'
                      }`}>
                        {achievement.name}
                      </h4>
                      <p className={`text-xs ${
                        achievement.unlocked ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Favorite Games */}
          <div className="bg-card-gradient rounded-xl p-4 lg:p-6 border border-gray-700">
            <h3 className="text-white font-semibold mb-3 lg:mb-4">Favorite Games</h3>
            <div className="space-y-2 lg:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Diamond Hunt</span>
                <span className="text-white font-semibold text-sm lg:text-base">{user?.diamondHuntWins || 0} wins</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Connect Four</span>
                <span className="text-white font-semibold text-sm lg:text-base">{user?.connectFourWins || 0} wins</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Dice Battle</span>
                <span className="text-white font-semibold text-sm lg:text-base">{user?.diceBattleWins || 0} wins</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}