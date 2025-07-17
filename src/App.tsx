import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GameProvider, useGame } from './contexts/GameContext';
import { WalletModeProvider } from './contexts/WalletModeContext';
import AuthPage from './components/Auth/AuthPage';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { AdminSidebar } from './components/Admin/AdminSidebar';
import { Stats } from './components/Dashboard/Stats';
import { Profile } from './components/Dashboard/Profile';
import { PlayGames } from './components/Dashboard/PlayGames';
import { SupportClient } from './components/Support/SupportClient';
import Friends from './components/Dashboard/Friends';
import { GameCard } from './components/Games/GameCard';
import { DiamondHunt } from './components/Games/DiamondHunt';
import { ConnectFour } from './components/Games/ConnectFour';
import { DiceBattle } from './components/Games/DiceBattle';
import { TicTacToe5x5 } from './components/Games/TicTacToe5x5';
import { MatchmakingWaitingRoom } from './components/Games/MatchmakingWaitingRoom';
import { Leaderboard } from './components/Leaderboard/Leaderboard';
import { WalletDashboard } from './components/Wallet/WalletDashboard';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { UserManagement } from './components/Admin/UserManagement';
import { GameManagement } from './components/Admin/GameManagement';
import { PaymentManagement } from './components/Admin/PaymentManagement';
import { NotificationSystem } from './components/Admin/NotificationSystem';
import { CommissionSystem } from './components/Admin/CommissionSystem';
import ComplianceManagement from './components/Admin/ComplianceManagement';
import { ContentManagement } from './components/Admin/ContentManagement';
import KYCManagement from './components/Admin/KYCManagement';
import { SecurityControl } from './components/Admin/SecurityControl';
import { SettingsConfig } from './components/Admin/SettingsConfig';
import { SupportTools } from './components/Admin/SupportTools';
import { WalletManagement } from './components/Admin/WalletManagement';
import { OwnerProfitManagement } from './components/Admin/OwnerProfitManagement';
import { AnalyticsReports } from './components/Admin/AnalyticsReports';
import { PlatformRevenue } from './components/Admin/PlatformRevenue';
import './index.css';
import { 
  Gamepad2, 
  TrendingUp, 
  Users, 
  Zap,
  Crown,
  Play,
  Star,
  Trophy,
  Target,
  Dice6
} from 'lucide-react';
import { Settings } from './components/Dashboard/Settings';
import { Footer } from './components/Layout/Footer';
import { Chess } from './components/Games/Chess';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';

// ErrorBoundary component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    // You can log errorInfo to an error reporting service here
    // console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', padding: 32 }}><h2>Something went wrong.</h2><pre>{String(this.state.error)}</pre></div>;
    }
    return this.props.children;
  }
}

function GameSection({ activeGame, onPlayGame, onBackToGames, currentMatchId }: { 
  activeGame: string | null; 
  onPlayGame: (gameId: string) => void;
  onBackToGames: () => void;
  currentMatchId?: string | null;
}) {
  const { games } = useGame();
  const { user, refreshWalletBalance } = useAuth();

  const handleGameEnd = (result: { winner: string; stake: number; result: string } | string) => {
    if (user) {
      // Always fetch new balance from backend after match
      refreshWalletBalance();
      setTimeout(() => {
        onBackToGames();
      }, 2000);
    }
  };

  const renderGame = () => {
    switch (activeGame) {
      case 'chess':
        return <Chess onGameEnd={handleGameEnd} matchId={currentMatchId || undefined} />;
      case 'diamond-hunt':
        return <DiamondHunt onGameEnd={handleGameEnd} matchId={currentMatchId || undefined} />;
      case 'connect-four':
        return <ConnectFour matchId={currentMatchId || undefined} />;
      case 'dice-battle':
        return <DiceBattle onGameEnd={(winner: string) => handleGameEnd(winner)} matchId={currentMatchId || undefined} />;
      case 'tictactoe-5x5':
        return <TicTacToe5x5 onGameEnd={(winner: string) => handleGameEnd(winner)} matchId={currentMatchId || undefined} />;
      case 'matchmaking-waiting-room':
        return <MatchmakingWaitingRoom 
          gameType="chess"
          stakeAmount={10}
          onMatchFound={() => {}}
          onCancel={() => {}}
        />;
      default:
        return null;
    }
  };

  if (activeGame) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToGames}
            className="text-gaming-accent hover:text-gaming-gold transition-colors font-medium"
          >
            ← Back to Games
          </button>
        </div>
        {renderGame()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Games</h1>
        <div className="flex items-center space-x-2 bg-gaming-dark px-4 py-2 rounded-lg">
          <Play className="h-5 w-5 text-gaming-accent" />
          <span className="text-white font-medium">{games.filter(g => g.isActive).length} Games Available</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onPlay={onPlayGame}
          />
        ))}
      </div>

      <div className="bg-card-gradient rounded-xl p-8 border border-gray-700">
        <div className="text-center">
          <Crown className="h-12 w-12 text-gaming-gold mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Ready to Play?</h2>
          <p className="text-gray-400 mb-6">
            Choose a game above and start your 1v1 battle. Win games to climb the leaderboard and earn rewards!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-gaming-dark p-4 rounded-lg">
              <Gamepad2 className="h-8 w-8 text-gaming-accent mx-auto mb-2" />
              <h3 className="text-white font-semibold mb-1">Choose Game</h3>
              <p className="text-gray-400 text-sm">Pick from 4 exciting games</p>
            </div>
            <div className="bg-gaming-dark p-4 rounded-lg">
              <Users className="h-8 w-8 text-gaming-gold mx-auto mb-2" />
              <h3 className="text-white font-semibold mb-1">Find Opponent</h3>
              <p className="text-gray-400 text-sm">Real-time matchmaking</p>
            </div>
            <div className="bg-gaming-dark p-4 rounded-lg">
              <TrendingUp className="h-8 w-8 text-gaming-purple mx-auto mb-2" />
              <h3 className="text-white font-semibold mb-1">Win & Earn</h3>
              <p className="text-gray-400 text-sm">Climb ranks and earn rewards</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MainApp() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('home');
  const [isInAdminPanel, setIsInAdminPanel] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);

  if (!user) {
    return <AuthPage />;
  }

  const handleAdminClick = () => {
    setIsInAdminPanel(true);
    setActiveSection('admin-users');
    setIsMobileMenuOpen(false);
  };

  const handleBackToMain = () => {
    setIsInAdminPanel(false);
    setActiveSection('home');
    setIsMobileMenuOpen(false);
  };

  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
  };

  const handlePlayGame = (gameId: string) => {
    setActiveGame(gameId);
    setActiveSection('games');
  };

  const handleBackToGames = () => {
    setActiveGame(null);
    setCurrentMatchId(null);
  };

  const handleNavigateToGame = (gameType: string, matchId: string) => {
    setActiveGame(gameType);
    setCurrentMatchId(matchId);
    setActiveSection('games');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <DashboardHome />;
      case 'profile':
        return <Profile />;
      case 'play-games':
        return <PlayGames onPlayGame={handlePlayGame} />;
      case 'games':
        return <GameSection activeGame={activeGame} onPlayGame={handlePlayGame} onBackToGames={handleBackToGames} currentMatchId={currentMatchId} />;
      case 'wallet':
        return <WalletDashboard />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'friends':
        return <Friends onNavigateToGame={handleNavigateToGame} />;
      case 'support':
        return <SupportClient />;
      case 'settings':
        return <Settings />;
      case 'admin-users':
        return <UserManagement />;
      case 'admin-analytics':
        return <AdminDashboard />;
      case 'admin-analytics-reports':
        return <AnalyticsReports />;
      case 'admin-security':
        return <SecurityControl />;
      case 'admin-games':
        return <GameManagement />;
      case 'admin-wallet':
        return <PaymentManagement />;
      case 'admin-payments':
        return <PaymentManagement />;
      case 'admin-content':
        return <ContentManagement />;
      case 'admin-notifications':
        return <NotificationSystem />;
      case 'admin-settings':
        return <SettingsConfig />;
      case 'admin-kyc':
        return <KYCManagement />;
      case 'admin-support':
        return <SupportTools />;
      case 'admin-commission':
        return <CommissionSystem />;
      case 'admin-compliance':
        return <ComplianceManagement />;
      case 'admin-owner-profit':
        return <OwnerProfitManagement />;
      case 'admin-platform-revenue':
        return <PlatformRevenue />;
      default:
        return <DashboardHome />;
    }
  };

  function DashboardHome() {
    const { user } = useAuth();
    const { games } = useGame();

    const featuredGames = games.filter(g => g.isActive).slice(0, 4);

    return (
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 bg-gaming-dark/50 px-4 py-2 rounded-full border border-gray-700">
            <Star className="h-4 w-4 text-gaming-gold" />
            <span className="text-white font-medium text-sm">Level {user?.level}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-gray-400 text-base max-w-xl mx-auto">
            Ready to dominate the leaderboard? Choose your game and start your winning streak.
          </p>
        </div>

        {/* Featured Games */}
        <div className="bg-card-gradient rounded-2xl p-8 border border-gray-700">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Featured Games</h2>
            <p className="text-gray-400">Jump into action with our most popular games</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredGames.map((game) => (
              <div key={game.id} className="group relative">
                <div className="bg-gaming-dark rounded-xl p-6 hover:bg-gray-700 transition-all duration-300 border border-gray-600 hover:border-gaming-accent cursor-pointer transform hover:scale-105">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gaming-accent/20 rounded-full flex items-center justify-center">
                      <Gamepad2 className="h-8 w-8 text-gaming-accent" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg mb-1">{game.name}</h3>
                      <p className="text-gray-400 text-sm">Bet: ${game.minBet}-${game.maxBet}</p>
                    </div>
                    <button 
                      onClick={() => handlePlayGame(game.id)}
                      className="w-full bg-gradient-to-r from-emerald-400 to-blue-400 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                    >
                      Play Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <button 
              onClick={() => handleSectionChange('play-games')}
              className="inline-flex items-center space-x-2 text-gaming-accent hover:text-gaming-gold transition-colors font-semibold"
            >
              <span>View All Games</span>
              <Play className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin Panel Layout
  if (isInAdminPanel) {
    return (
      <div className="min-h-screen bg-gaming-gradient">
        <Header 
          onMenuToggle={handleMenuToggle}
          isMobileMenuOpen={isMobileMenuOpen}
          onSectionChange={handleSectionChange}
        />
        <div className="flex">
          <AdminSidebar 
            activeSection={activeSection} 
            onSectionChange={handleSectionChange}
            onBackToMain={handleBackToMain}
            isOpen={isMobileMenuOpen}
          />
          <main className="flex-1 p-2 sm:p-4 lg:p-6 lg:ml-0">
            {renderContent()}
          </main>
        </div>
        <Footer />
      </div>
    );
  }

  // Main Site Layout
  return (
    <div className="min-h-screen bg-gaming-gradient">
      <Header 
        onMenuToggle={handleMenuToggle}
        isMobileMenuOpen={isMobileMenuOpen}
        onSectionChange={handleSectionChange}
      />
      <div className="flex">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={handleSectionChange}
          onAdminClick={handleAdminClick}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 lg:ml-0 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

// MatchRoom component to load the correct game by matchId
type MatchRoomProps = {};
const MatchRoom: React.FC<MatchRoomProps> = () => {
  const { matchId } = useParams();
  React.useEffect(() => {
    console.log('[MatchRoom] Mounted with matchId:', matchId);
  }, [matchId]);
  if (!matchId) {
    console.error('[MatchRoom] No matchId in URL');
    return <div style={{ color: 'red', padding: 32 }}>Error: No match ID found in the URL. Please return to the dashboard and try again.</div>;
  }
  try {
    // TODO: Fetch match/game type and render correct game component
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-white">Match Room</h1>
        <p className="text-lg text-gray-300">Match ID: {matchId}</p>
        {/* TODO: Render the correct game component here based on match info */}
      </div>
    );
  } catch (err) {
    console.error('[MatchRoom] Error rendering match room:', err);
    return <div style={{ color: 'red', padding: 32 }}>Unexpected error loading match room: {String(err)}</div>;
  }
};

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <WalletModeProvider>
            <GameProvider>
              <Routes>
                <Route path="/match/:matchId" element={<MatchRoom />} />
                <Route path="/*" element={<MainApp />} />
              </Routes>
            </GameProvider>
          </WalletModeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;