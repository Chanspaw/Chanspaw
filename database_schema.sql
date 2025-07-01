-- =====================================================
-- Chanspaw Platform - Secure Database Schema
-- PostgreSQL/MySQL Compatible
-- =====================================================

-- Création de la base de données
-- CREATE DATABASE chanspaw_secure
--   WITH 
--   ENCODING = 'UTF8'
--   LC_COLLATE = 'en_US.UTF-8'
--   LC_CTYPE = 'en_US.UTF-8'
--   TEMPLATE = template0;

-- Utilisation de la base de données
-- USE chanspaw_secure;

-- =====================================================
-- TABLE: users (Utilisateurs)
-- =====================================================
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  
  -- Chiffrement des données sensibles
  password_hash VARCHAR(255) NOT NULL,
  password_iv VARCHAR(255) NOT NULL,
  password_algorithm VARCHAR(50) NOT NULL,
  
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  
  -- Téléphone chiffré
  phone_number VARCHAR(255),
  phone_iv VARCHAR(255),
  phone_algorithm VARCHAR(50),
  
  -- Informations de sécurité
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  login_attempts INTEGER DEFAULT 0,
  account_locked BOOLEAN DEFAULT FALSE,
  lockout_until TIMESTAMP,
  
  -- KYC/AML
  kyc_status VARCHAR(20) DEFAULT 'not_required',
  kyc_level INTEGER DEFAULT 1,
  aml_status VARCHAR(20) DEFAULT 'not_required',
  identity_verified BOOLEAN DEFAULT FALSE,
  
  -- Informations de jeu
  balance DECIMAL(15,2) DEFAULT 0.00,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  
  -- Rôles et permissions
  is_admin BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) DEFAULT 'user',
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  -- Index pour les performances
  INDEX idx_users_email (email),
  INDEX idx_users_username (username),
  INDEX idx_users_kyc_status (kyc_status),
  INDEX idx_users_is_admin (is_admin),
  INDEX idx_users_created_at (created_at)
);

-- =====================================================
-- TABLE: transactions (Transactions)
-- =====================================================
CREATE TABLE transactions (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'bet', 'win', 'loss'
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  
  -- Informations de paiement (chiffrées)
  payment_method VARCHAR(50),
  payment_details TEXT, -- Chiffré
  payment_iv VARCHAR(255),
  payment_algorithm VARCHAR(50),
  
  description TEXT,
  reference_id VARCHAR(100),
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Clés étrangères et index
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_transactions_user_id (user_id),
  INDEX idx_transactions_type (type),
  INDEX idx_transactions_status (status),
  INDEX idx_transactions_created_at (created_at),
  INDEX idx_transactions_user_status (user_id, status)
);

-- =====================================================
-- TABLE: audit_logs (Audit Trail)
-- =====================================================
CREATE TABLE audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  action VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
  table_name VARCHAR(50) NOT NULL,
  record_id VARCHAR(50) NOT NULL,
  
  -- Anciennes et nouvelles valeurs (JSON)
  old_values JSON,
  new_values JSON,
  
  -- Informations de session
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(100),
  
  -- Métadonnées
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Index pour les performances
  INDEX idx_audit_logs_user_id (user_id),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_table_name (table_name),
  INDEX idx_audit_logs_timestamp (timestamp),
  INDEX idx_audit_logs_ip_address (ip_address),
  INDEX idx_audit_logs_user_action (user_id, action)
);

-- =====================================================
-- TABLE: kyc_verifications (Vérifications KYC)
-- =====================================================
CREATE TABLE kyc_verifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'identity', 'address', 'income', 'source_of_funds'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  
  -- Documents (références vers stockage sécurisé)
  documents JSON, -- Liste des documents uploadés
  
  -- Informations personnelles (chiffrées)
  personal_info TEXT, -- Chiffré
  personal_info_iv VARCHAR(255),
  personal_info_algorithm VARCHAR(50),
  
  -- Métadonnées
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(50),
  rejection_reason TEXT,
  expiry_date TIMESTAMP,
  
  -- Clés étrangères et index
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_kyc_verifications_user_id (user_id),
  INDEX idx_kyc_verifications_status (status),
  INDEX idx_kyc_verifications_type (type),
  INDEX idx_kyc_verifications_submitted_at (submitted_at)
);

-- =====================================================
-- TABLE: login_sessions (Sessions de Connexion)
-- =====================================================
CREATE TABLE login_sessions (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  token VARCHAR(500) NOT NULL,
  refresh_token VARCHAR(500),
  
  -- Informations de l'appareil
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info JSON,
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Clés étrangères et index
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_login_sessions_user_id (user_id),
  INDEX idx_login_sessions_token (token),
  INDEX idx_login_sessions_expires_at (expires_at),
  INDEX idx_login_sessions_is_active (is_active)
);

-- =====================================================
-- TABLE: games (Jeux)
-- =====================================================
CREATE TABLE games (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'connect_four', 'tic_tac_toe', 'dice_battle', 'diamond_hunt'
  description TEXT,
  
  -- Configuration du jeu
  min_bet DECIMAL(10,2) DEFAULT 1.00,
  max_bet DECIMAL(10,2) DEFAULT 1000.00,
  house_edge DECIMAL(5,4) DEFAULT 0.05, -- 5%
  
  -- Statut
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_games_type (type),
  INDEX idx_games_is_active (is_active),
  INDEX idx_games_is_featured (is_featured)
);

-- =====================================================
-- TABLE: game_sessions (Sessions de Jeu)
-- =====================================================
CREATE TABLE game_sessions (
  id VARCHAR(50) PRIMARY KEY,
  game_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  
  -- Informations de la partie
  bet_amount DECIMAL(10,2) NOT NULL,
  result VARCHAR(20), -- 'win', 'loss', 'draw'
  win_amount DECIMAL(10,2) DEFAULT 0.00,
  
  -- Données du jeu (JSON)
  game_data JSON,
  
  -- Métadonnées
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  
  -- Clés étrangères et index
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_game_sessions_user_id (user_id),
  INDEX idx_game_sessions_game_id (game_id),
  INDEX idx_game_sessions_started_at (started_at),
  INDEX idx_game_sessions_result (result)
);

-- =====================================================
-- TABLE: backup_logs (Logs de Sauvegarde)
-- =====================================================
CREATE TABLE backup_logs (
  id VARCHAR(50) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  
  -- Type de sauvegarde
  backup_type VARCHAR(20) DEFAULT 'full', -- 'full', 'incremental'
  status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  retention_days INTEGER DEFAULT 30,
  
  INDEX idx_backup_logs_status (status),
  INDEX idx_backup_logs_created_at (created_at),
  INDEX idx_backup_logs_backup_type (backup_type)
);

-- =====================================================
-- TABLE: security_alerts (Alertes de Sécurité)
-- =====================================================
CREATE TABLE security_alerts (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  alert_type VARCHAR(50) NOT NULL, -- 'suspicious_activity', 'failed_login', 'unusual_transaction'
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Détails de l'alerte
  description TEXT NOT NULL,
  details JSON,
  
  -- Statut
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'false_positive'
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(50),
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_security_alerts_user_id (user_id),
  INDEX idx_security_alerts_alert_type (alert_type),
  INDEX idx_security_alerts_severity (severity),
  INDEX idx_security_alerts_status (status),
  INDEX idx_security_alerts_created_at (created_at)
);

-- =====================================================
-- TRIGGERS pour Audit Automatique
-- =====================================================

-- Trigger pour la table users
DELIMITER //
CREATE TRIGGER audit_users_changes
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (id, user_id, action, table_name, record_id, new_values)
    VALUES (CONCAT('audit-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 1000000)), NEW.id, 'CREATE', 'users', NEW.id, JSON_OBJECT('username', NEW.username, 'email', NEW.email));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_values, new_values)
    VALUES (CONCAT('audit-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 1000000)), NEW.id, 'UPDATE', 'users', NEW.id, JSON_OBJECT('username', OLD.username, 'email', OLD.email), JSON_OBJECT('username', NEW.username, 'email', NEW.email));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_values)
    VALUES (CONCAT('audit-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 1000000)), OLD.id, 'DELETE', 'users', OLD.id, JSON_OBJECT('username', OLD.username, 'email', OLD.email));
  END IF;
END//
DELIMITER ;

-- Trigger pour la table transactions
DELIMITER //
CREATE TRIGGER audit_transactions_changes
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (id, user_id, action, table_name, record_id, new_values)
    VALUES (CONCAT('audit-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 1000000)), NEW.user_id, 'CREATE', 'transactions', NEW.id, JSON_OBJECT('type', NEW.type, 'amount', NEW.amount, 'status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_values, new_values)
    VALUES (CONCAT('audit-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 1000000)), NEW.user_id, 'UPDATE', 'transactions', NEW.id, JSON_OBJECT('type', OLD.type, 'amount', OLD.amount, 'status', OLD.status), JSON_OBJECT('type', NEW.type, 'amount', NEW.amount, 'status', NEW.status));
  END IF;
END//
DELIMITER ;

-- =====================================================
-- VUES pour Rapports
-- =====================================================

-- Vue pour les statistiques utilisateur
CREATE VIEW user_stats AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.balance,
  u.wins,
  u.losses,
  u.level,
  u.kyc_status,
  u.created_at,
  COUNT(t.id) as total_transactions,
  SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE 0 END) as total_deposits,
  SUM(CASE WHEN t.type = 'withdrawal' THEN t.amount ELSE 0 END) as total_withdrawals,
  COUNT(gs.id) as total_games_played
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
LEFT JOIN game_sessions gs ON u.id = gs.user_id
GROUP BY u.id, u.username, u.email, u.balance, u.wins, u.losses, u.level, u.kyc_status, u.created_at;

-- Vue pour les alertes de sécurité actives
CREATE VIEW active_security_alerts AS
SELECT 
  sa.*,
  u.username,
  u.email
FROM security_alerts sa
LEFT JOIN users u ON sa.user_id = u.id
WHERE sa.status IN ('open', 'investigating')
ORDER BY sa.severity DESC, sa.created_at DESC;

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Insérer les jeux par défaut
INSERT INTO games (id, name, type, description, min_bet, max_bet, house_edge, is_active, is_featured) VALUES
('game-connect-four', 'Connect Four', 'connect_four', 'Classic Connect Four game with betting', 1.00, 100.00, 0.05, TRUE, TRUE),
('game-tic-tac-toe', 'Tic Tac Toe 5x5', 'tic_tac_toe', 'Advanced 5x5 Tic Tac Toe', 1.00, 50.00, 0.05, TRUE, TRUE),
('game-dice-battle', 'Dice Battle', 'dice_battle', 'Roll the dice and battle for victory', 1.00, 200.00, 0.05, TRUE, TRUE),
('game-diamond-hunt', 'Diamond Hunt', 'diamond_hunt', 'Find diamonds and win big', 1.00, 500.00, 0.05, TRUE, TRUE);

-- =====================================================
-- INDEX ADDITIONNELS POUR PERFORMANCE
-- =====================================================

-- Index composites pour les requêtes complexes
CREATE INDEX idx_transactions_user_type_date ON transactions(user_id, type, created_at);
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp);
CREATE INDEX idx_game_sessions_user_result ON game_sessions(user_id, result);
CREATE INDEX idx_security_alerts_user_severity ON security_alerts(user_id, severity);

-- Index pour les recherches textuelles
CREATE INDEX idx_users_search ON users(username, email, first_name, last_name);
CREATE INDEX idx_audit_logs_search ON audit_logs(action, table_name, ip_address);

-- =====================================================
-- COMMENTAIRES ET DOCUMENTATION
-- =====================================================

-- Commentaires sur les tables
ALTER TABLE users COMMENT = 'Table des utilisateurs avec chiffrement des données sensibles';
ALTER TABLE transactions COMMENT = 'Table des transactions financières avec audit trail';
ALTER TABLE audit_logs COMMENT = 'Table d''audit trail pour toutes les actions';
ALTER TABLE kyc_verifications COMMENT = 'Table des vérifications KYC/AML';
ALTER TABLE login_sessions COMMENT = 'Table des sessions de connexion actives';
ALTER TABLE games COMMENT = 'Table des jeux disponibles';
ALTER TABLE game_sessions COMMENT = 'Table des sessions de jeu';
ALTER TABLE backup_logs COMMENT = 'Table des logs de sauvegarde';
ALTER TABLE security_alerts COMMENT = 'Table des alertes de sécurité';

-- =====================================================
-- FIN DU SCHÉMA
-- =====================================================

-- Vérification de l'intégrité
-- SELECT 'Schema created successfully' as status; 