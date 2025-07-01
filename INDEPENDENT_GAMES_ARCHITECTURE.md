# Independent Games Architecture with Shared Matchmaking

## Overview
This document outlines how to refactor the current monolithic game system into independent game services while maintaining unified matchmaking capabilities.

## Architecture Design

### 1. Shared Infrastructure (Keep Centralized)
```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Infrastructure                    │
├─────────────────────────────────────────────────────────────┤
│ • Authentication Service                                    │
│ • User Management Service                                   │
│ • Wallet Service                                            │
│ • Matchmaking Service                                       │
│ • Notification Service                                      │
│ • Analytics Service                                         │
└─────────────────────────────────────────────────────────────┘
```

### 2. Independent Game Services
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Chess Service │  │ Connect4 Service│  │ Diamond Service │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • Game Logic    │  │ • Game Logic    │  │ • Game Logic    │
│ • State Mgmt    │  │ • State Mgmt    │  │ • State Mgmt    │
│ • Move Validation│  │ • Move Validation│  │ • Move Validation│
│ • Win Detection │  │ • Win Detection │  │ • Win Detection │
│ • Chess API     │  │ • Connect4 API  │  │ • Diamond API   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 3. Shared Matchmaking Service
```
┌─────────────────────────────────────────────────────────────┐
│                 Matchmaking Service                         │
├─────────────────────────────────────────────────────────────┤
│ • Queue Management                                          │
│ • Player Matching                                           │
│ • Game Session Creation                                     │
│ • Load Balancing                                            │
│ • Cross-Game Compatibility                                  │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Extract Game Logic
1. **Create Game-Specific Services**
   - Each game gets its own service with dedicated API
   - Independent database schemas for game states
   - Game-specific business logic

2. **Standardize Game Interfaces**
   ```typescript
   interface GameService {
     initializeGame(players: string[], config: GameConfig): GameState;
     validateMove(state: GameState, move: Move, playerId: string): MoveResult;
     checkWinCondition(state: GameState): WinResult;
     getValidMoves(state: GameState, playerId: string): Move[];
   }
   ```

### Phase 2: Refactor Matchmaking
1. **Game-Agnostic Matchmaking**
   ```typescript
   interface MatchmakingService {
     joinQueue(gameId: string, playerId: string, config: QueueConfig): void;
     findMatch(gameId: string, playerId: string): Match | null;
     createGameSession(match: Match): GameSession;
   }
   ```

2. **Dynamic Game Routing**
   ```typescript
   class GameRouter {
     routeToGame(gameId: string, sessionId: string): GameService {
       const gameService = this.gameServices.get(gameId);
       return gameService;
     }
   }
   ```

### Phase 3: API Gateway Pattern
```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                              │
├─────────────────────────────────────────────────────────────┤
│ • Route /api/chess/* → Chess Service                        │
│ • Route /api/connect4/* → Connect4 Service                  │
│ • Route /api/diamond/* → Diamond Service                    │
│ • Route /api/matchmaking/* → Matchmaking Service            │
│ • Route /api/auth/* → Auth Service                          │
└─────────────────────────────────────────────────────────────┘
```

## Benefits of This Architecture

### 1. **Independent Development**
- Each game team can work independently
- Different release cycles per game
- Technology stack flexibility per game

### 2. **Scalability**
- Scale individual games based on demand
- Independent resource allocation
- Better performance isolation

### 3. **Maintainability**
- Easier to debug game-specific issues
- Reduced code coupling
- Clearer responsibility boundaries

### 4. **Shared Features**
- Unified matchmaking experience
- Consistent user authentication
- Centralized wallet management
- Common analytics and reporting

## Implementation Steps

### Step 1: Create Game Service Templates
```bash
# Create service structure for each game
mkdir -p services/chess-service
mkdir -p services/connect4-service
mkdir -p services/diamond-service
mkdir -p services/matchmaking-service
```

### Step 2: Extract Game Logic
```javascript
// services/chess-service/chessLogic.js
class ChessGameLogic {
  initializeBoard() { /* Chess-specific logic */ }
  validateMove(board, move, player) { /* Chess-specific validation */ }
  checkWinCondition(board) { /* Chess-specific win check */ }
}

// services/connect4-service/connect4Logic.js
class Connect4GameLogic {
  initializeBoard() { /* Connect4-specific logic */ }
  validateMove(board, move, player) { /* Connect4-specific validation */ }
  checkWinCondition(board) { /* Connect4-specific win check */ }
}
```

### Step 3: Standardize Game Interfaces
```typescript
// shared/interfaces/GameService.ts
export interface GameService {
  gameId: string;
  initializeGame(config: GameConfig): GameState;
  validateMove(state: GameState, move: Move): MoveResult;
  checkWinCondition(state: GameState): WinResult;
  getGameConfig(): GameConfig;
}

// shared/interfaces/MatchmakingService.ts
export interface MatchmakingService {
  joinQueue(gameId: string, playerId: string, config: QueueConfig): Promise<void>;
  leaveQueue(playerId: string): Promise<void>;
  findMatch(gameId: string, playerId: string): Promise<Match | null>;
  createGameSession(match: Match): Promise<GameSession>;
}
```

### Step 4: Implement Service Discovery
```javascript
// services/matchmaking-service/serviceRegistry.js
class GameServiceRegistry {
  constructor() {
    this.services = new Map();
  }

  registerGameService(gameId: string, service: GameService) {
    this.services.set(gameId, service);
  }

  getGameService(gameId: string): GameService {
    return this.services.get(gameId);
  }

  getAllGameIds(): string[] {
    return Array.from(this.services.keys());
  }
}
```

### Step 5: Update Frontend
```typescript
// src/services/gameServiceFactory.ts
export class GameServiceFactory {
  static createGameService(gameId: string): GameService {
    switch (gameId) {
      case 'chess':
        return new ChessGameService();
      case 'connect_four':
        return new Connect4GameService();
      case 'diamond_hunt':
        return new DiamondGameService();
      default:
        throw new Error(`Unknown game: ${gameId}`);
    }
  }
}
```

## Database Schema Changes

### Independent Game Tables
```sql
-- Each game gets its own state table
CREATE TABLE chess_game_states (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL,
  board JSONB NOT NULL,
  current_turn VARCHAR(50) NOT NULL,
  move_history JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE connect4_game_states (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL,
  board JSONB NOT NULL,
  current_turn VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shared matchmaking table
CREATE TABLE game_matches (
  id UUID PRIMARY KEY,
  game_id VARCHAR(50) NOT NULL,
  player1_id VARCHAR(50) NOT NULL,
  player2_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  stake DECIMAL(10,2) NOT NULL,
  wallet_mode VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);
```

## Deployment Strategy

### Docker Compose Setup
```yaml
version: '3.8'
services:
  # Shared Services
  auth-service:
    build: ./services/auth-service
    ports: ["3001:3001"]
  
  wallet-service:
    build: ./services/wallet-service
    ports: ["3002:3002"]
  
  matchmaking-service:
    build: ./services/matchmaking-service
    ports: ["3003:3003"]
  
  # Game Services
  chess-service:
    build: ./services/chess-service
    ports: ["4001:4001"]
  
  connect4-service:
    build: ./services/connect4-service
    ports: ["4002:4002"]
  
  diamond-service:
    build: ./services/diamond-service
    ports: ["4003:4003"]
  
  # API Gateway
  api-gateway:
    build: ./services/api-gateway
    ports: ["8080:8080"]
```

## Migration Plan

### Phase 1: Preparation (Week 1-2)
1. Create service templates
2. Set up independent databases
3. Create shared interfaces

### Phase 2: Game Extraction (Week 3-6)
1. Extract Chess service
2. Extract Connect4 service
3. Extract Diamond service
4. Test each service independently

### Phase 3: Matchmaking Integration (Week 7-8)
1. Update matchmaking service
2. Implement service discovery
3. Test cross-game matchmaking

### Phase 4: Frontend Updates (Week 9-10)
1. Update frontend to use new services
2. Implement service factory pattern
3. Test end-to-end functionality

### Phase 5: Deployment (Week 11-12)
1. Deploy microservices
2. Set up monitoring and logging
3. Performance testing and optimization

## Monitoring and Observability

### Service Health Checks
```javascript
// Each service implements health check
app.get('/health', (req, res) => {
  res.json({
    service: 'chess-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '1.0.0'
  });
});
```

### Distributed Tracing
```javascript
// Use OpenTelemetry for tracing
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('game-service');

// Trace game operations
const span = tracer.startSpan('validate-move');
// ... game logic
span.end();
```

## Conclusion

This architecture provides:
- ✅ **Independent game development**
- ✅ **Shared matchmaking capabilities**
- ✅ **Scalable and maintainable codebase**
- ✅ **Technology flexibility per game**
- ✅ **Unified user experience**

The key is maintaining the shared infrastructure (auth, wallet, matchmaking) while making each game completely independent in terms of logic, state management, and deployment. 