# 🗄️ Base de Données Sécurisée - Chanspaw Platform

## 📋 Vue d'ensemble

Ce guide détaille l'implémentation d'une base de données sécurisée pour la plateforme Chanspaw avec :
- **PostgreSQL/MySQL** avec chiffrement
- **Sauvegarde automatique quotidienne**
- **Audit trail complet** de toutes les transactions
- **Chiffrement des données sensibles**

---

## 🏗️ Architecture de la Base de Données

### Configuration Recommandée

```sql
-- PostgreSQL Configuration
CREATE DATABASE chanspaw_secure
  WITH 
  ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8'
  TEMPLATE = template0;

-- MySQL Configuration
CREATE DATABASE chanspaw_secure
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### Variables d'Environnement

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chanspaw_secure
DB_USER=chanspaw_user
DB_PASSWORD=your_secure_password
DB_SSL=true

# Security Configuration
ENCRYPTION_KEY=your-256-bit-encryption-key-here
AUDIT_LOGGING=true
BACKUP_INTERVAL=24

# Backup Configuration
BACKUP_PATH=/backups/chanspaw
BACKUP_RETENTION_DAYS=30
```

---

## 🔐 Chiffrement des Données

### Données Sensibles à Chiffrer

1. **Informations Personnelles**
   - Numéros de téléphone
   - Adresses physiques
   - Documents d'identité

2. **Données Financières**
   - Numéros de cartes bancaires
   - Codes CVV
   - Informations de compte bancaire

3. **Données d'Authentification**
   - Mots de passe (hashés + chiffrés)
   - Codes 2FA
   - Tokens de session

### Implémentation du Chiffrement

```typescript
// Chiffrement AES-256-GCM
private static encrypt(data: string): EncryptedData {
  const algorithm = 'aes-256-gcm';
  const key = this.config.encryptionKey;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    algorithm
  };
}

// Déchiffrement
private static decrypt(encryptedData: EncryptedData): string {
  const algorithm = encryptedData.algorithm;
  const key = Buffer.from(this.config.encryptionKey, 'hex');
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const decipher = crypto.createDecipher(algorithm, key);
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

---

## 📊 Schéma de Base de Données

### Table Users (Utilisateurs)

```sql
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
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  -- Index pour les performances
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_kyc_status (kyc_status)
);
```

### Table Transactions (Transactions)

```sql
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
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### Table Audit Logs (Audit Trail)

```sql
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
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_table_name (table_name),
  INDEX idx_timestamp (timestamp),
  INDEX idx_ip_address (ip_address)
);
```

### Table KYC Verifications (Vérifications KYC)

```sql
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
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_type (type)
);
```

### Table Login Sessions (Sessions de Connexion)

```sql
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
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),
  INDEX idx_is_active (is_active)
);
```

---

## 💾 Sauvegarde Automatique

### Script de Sauvegarde PostgreSQL

```bash
#!/bin/bash
# backup_postgresql.sh

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="chanspaw_secure"
DB_USER="chanspaw_user"
BACKUP_PATH="/backups/chanspaw"
RETENTION_DAYS=30

# Créer le répertoire de sauvegarde
mkdir -p $BACKUP_PATH

# Nom du fichier de sauvegarde
BACKUP_FILE="chanspaw_backup_$(date +%Y%m%d_%H%M%S).sql"

# Effectuer la sauvegarde
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  --verbose --clean --no-owner --no-privileges \
  --file="$BACKUP_PATH/$BACKUP_FILE"

# Compresser la sauvegarde
gzip "$BACKUP_PATH/$BACKUP_FILE"

# Calculer le checksum
CHECKSUM=$(sha256sum "$BACKUP_PATH/$BACKUP_FILE.gz" | cut -d' ' -f1)

# Enregistrer les métadonnées de sauvegarde
echo "{
  \"filename\": \"$BACKUP_FILE.gz\",
  \"size\": $(stat -c%s "$BACKUP_PATH/$BACKUP_FILE.gz"),
  \"checksum\": \"$CHECKSUM\",
  \"created_at\": \"$(date -Iseconds)\",
  \"status\": \"completed\"
}" > "$BACKUP_PATH/${BACKUP_FILE}.meta.json"

# Nettoyer les anciennes sauvegardes
find $BACKUP_PATH -name "*.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_PATH -name "*.meta.json" -mtime +$RETENTION_DAYS -delete

echo "Sauvegarde terminée: $BACKUP_FILE.gz"
```

### Script de Sauvegarde MySQL

```bash
#!/bin/bash
# backup_mysql.sh

# Configuration
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="chanspaw_secure"
DB_USER="chanspaw_user"
DB_PASSWORD="your_password"
BACKUP_PATH="/backups/chanspaw"
RETENTION_DAYS=30

# Créer le répertoire de sauvegarde
mkdir -p $BACKUP_PATH

# Nom du fichier de sauvegarde
BACKUP_FILE="chanspaw_backup_$(date +%Y%m%d_%H%M%S).sql"

# Effectuer la sauvegarde
mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD \
  --single-transaction --routines --triggers \
  --hex-blob --opt $DB_NAME > "$BACKUP_PATH/$BACKUP_FILE"

# Compresser la sauvegarde
gzip "$BACKUP_PATH/$BACKUP_FILE"

# Calculer le checksum
CHECKSUM=$(sha256sum "$BACKUP_PATH/$BACKUP_FILE.gz" | cut -d' ' -f1)

# Enregistrer les métadonnées de sauvegarde
echo "{
  \"filename\": \"$BACKUP_FILE.gz\",
  \"size\": $(stat -c%s "$BACKUP_PATH/$BACKUP_FILE.gz"),
  \"checksum\": \"$CHECKSUM\",
  \"created_at\": \"$(date -Iseconds)\",
  \"status\": \"completed\"
}" > "$BACKUP_PATH/${BACKUP_FILE}.meta.json"

# Nettoyer les anciennes sauvegardes
find $BACKUP_PATH -name "*.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_PATH -name "*.meta.json" -mtime +$RETENTION_DAYS -delete

echo "Sauvegarde terminée: $BACKUP_FILE.gz"
```

### Configuration Cron pour Sauvegarde Automatique

```bash
# Ajouter à crontab (sauvegarde quotidienne à 2h du matin)
0 2 * * * /path/to/backup_postgresql.sh >> /var/log/chanspaw_backup.log 2>&1

# Sauvegarde hebdomadaire complète
0 3 * * 0 /path/to/backup_postgresql.sh --full >> /var/log/chanspaw_backup_full.log 2>&1
```

---

## 🔍 Audit Trail Complet

### Implémentation de l'Audit Trail

```typescript
// Logging automatique de toutes les actions
private static async logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
  const auditEntry: AuditEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date()
  };

  // Insérer dans la table audit_logs
  await this.connection.query(
    'INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, timestamp, session_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
    [auditEntry.id, auditEntry.userId, auditEntry.action, auditEntry.table, auditEntry.recordId, 
     JSON.stringify(auditEntry.oldValues), JSON.stringify(auditEntry.newValues), auditEntry.ipAddress, 
     auditEntry.userAgent, auditEntry.timestamp, auditEntry.sessionId]
  );
}
```

### Triggers pour Audit Automatique

```sql
-- Trigger pour la table users
CREATE OR REPLACE FUNCTION audit_users_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (NEW.id, 'CREATE', 'users', NEW.id, to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (NEW.id, 'UPDATE', 'users', NEW.id, to_json(OLD), to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (OLD.id, 'DELETE', 'users', OLD.id, to_json(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_users_changes();

-- Trigger pour la table transactions
CREATE OR REPLACE FUNCTION audit_transactions_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (NEW.user_id, 'CREATE', 'transactions', NEW.id, to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (NEW.user_id, 'UPDATE', 'transactions', NEW.id, to_json(OLD), to_json(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_audit_trigger
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION audit_transactions_changes();
```

---

## 🛡️ Sécurité et Monitoring

### Détection d'Activité Suspecte

```typescript
static async detectSuspiciousActivity(userId: string): Promise<{
  success: boolean;
  suspicious?: boolean;
  reasons?: string[];
  error?: string;
}> {
  const reasons: string[] = [];

  // Vérifier les tentatives de connexion échouées
  const failedLogins = await this.getFailedLoginAttempts(userId);
  if (failedLogins > 5) {
    reasons.push('Multiple failed login attempts');
  }

  // Vérifier les patterns de transaction inhabituels
  const recentTransactions = await this.getRecentTransactions(userId);
  const totalAmount = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  if (totalAmount > 10000) {
    reasons.push('Unusual transaction volume');
  }

  // Vérifier les adresses IP multiples
  const uniqueIPs = await this.getUniqueIPs(userId);
  if (uniqueIPs.length > 3) {
    reasons.push('Multiple IP addresses detected');
  }

  return { 
    success: true, 
    suspicious: reasons.length > 0,
    reasons
  };
}
```

### Requêtes de Sécurité

```sql
-- Détecter les tentatives de connexion échouées
SELECT user_id, COUNT(*) as failed_attempts
FROM audit_logs 
WHERE action = 'LOGIN_FAILED' 
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY user_id 
HAVING COUNT(*) > 5;

-- Détecter les transactions inhabituelles
SELECT user_id, SUM(amount) as total_amount
FROM transactions 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND status = 'completed'
GROUP BY user_id 
HAVING SUM(amount) > 10000;

-- Détecter les adresses IP multiples
SELECT user_id, COUNT(DISTINCT ip_address) as unique_ips
FROM audit_logs 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY user_id 
HAVING COUNT(DISTINCT ip_address) > 3;
```

---

## 📈 Performance et Optimisation

### Index Recommandés

```sql
-- Index pour les performances des requêtes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Index composites pour les requêtes complexes
CREATE INDEX idx_transactions_user_status ON transactions(user_id, status);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);
```

### Partitioning pour les Grandes Tables

```sql
-- Partitioning de la table audit_logs par mois
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit_logs_2024_02 PARTITION OF audit_logs
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Partitioning de la table transactions par mois
CREATE TABLE transactions_2024_01 PARTITION OF transactions
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

---

## 🔧 Configuration de Production

### Variables d'Environnement de Production

```bash
# Production Database Configuration
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=chanspaw_secure_prod
DB_USER=chanspaw_prod_user
DB_PASSWORD=your_very_secure_production_password
DB_SSL=true

# Security Configuration
ENCRYPTION_KEY=your-256-bit-production-encryption-key
AUDIT_LOGGING=true
BACKUP_INTERVAL=24

# Backup Configuration
BACKUP_PATH=/secure/backups/chanspaw
BACKUP_RETENTION_DAYS=90
BACKUP_ENCRYPTION=true

# Monitoring Configuration
MONITORING_ENABLED=true
ALERT_EMAIL=security@chanspaw.com
```

### Configuration SSL/TLS

```sql
-- PostgreSQL SSL Configuration
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
ssl_ca_file = '/path/to/ca.crt'
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
```

### Configuration de Réplication

```sql
-- Configuration Master-Slave pour haute disponibilité
-- Master
wal_level = replica
max_wal_senders = 3
wal_keep_segments = 64

-- Slave
hot_standby = on
```

---

## 📊 Monitoring et Alertes

### Script de Monitoring

```bash
#!/bin/bash
# monitor_database.sh

# Vérifier la connectivité
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; then
  echo "ALERT: Database connection failed" | mail -s "Database Alert" $ALERT_EMAIL
  exit 1
fi

# Vérifier l'espace disque
DISK_USAGE=$(df /backups | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
  echo "ALERT: Backup disk usage is ${DISK_USAGE}%" | mail -s "Disk Space Alert" $ALERT_EMAIL
fi

# Vérifier les sauvegardes récentes
LAST_BACKUP=$(find /backups -name "*.gz" -mtime -1 | wc -l)
if [ $LAST_BACKUP -eq 0 ]; then
  echo "ALERT: No recent backups found" | mail -s "Backup Alert" $ALERT_EMAIL
fi

echo "Database monitoring completed successfully"
```

---

## 🚀 Déploiement

### Étapes de Déploiement

1. **Préparation de l'Environnement**
   ```bash
   # Installer PostgreSQL/MySQL
   sudo apt-get update
   sudo apt-get install postgresql postgresql-contrib
   
   # Créer l'utilisateur de base de données
   sudo -u postgres createuser chanspaw_user
   sudo -u postgres createdb chanspaw_secure
   ```

2. **Configuration de la Sécurité**
   ```bash
   # Configurer SSL
   sudo cp server.crt /etc/postgresql/ssl/
   sudo cp server.key /etc/postgresql/ssl/
   
   # Configurer les permissions
   sudo chmod 600 /etc/postgresql/ssl/server.key
   ```

3. **Création des Tables**
   ```bash
   # Exécuter les scripts SQL
   psql -h localhost -U chanspaw_user -d chanspaw_secure -f schema.sql
   ```

4. **Configuration des Sauvegardes**
   ```bash
   # Configurer cron
   crontab -e
   # Ajouter les tâches de sauvegarde
   ```

5. **Test de Sécurité**
   ```bash
   # Tester le chiffrement
   npm run test:security
   
   # Tester les sauvegardes
   ./test_backup.sh
   ```

---

## 📋 Checklist de Sécurité

- [ ] **Chiffrement des données sensibles** implémenté
- [ ] **Audit trail complet** configuré
- [ ] **Sauvegardes automatiques** programmées
- [ ] **SSL/TLS** configuré
- [ ] **Index de performance** créés
- [ ] **Monitoring** configuré
- [ ] **Alertes de sécurité** activées
- [ ] **Tests de sécurité** effectués
- [ ] **Documentation** complète
- [ ] **Plan de reprise** préparé

---

*Ce guide garantit une base de données sécurisée, performante et conforme aux standards de sécurité pour la plateforme Chanspaw.* 