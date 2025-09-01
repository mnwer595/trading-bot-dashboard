# API Instructions for AI Trading Bot

## Overview

The AI Trading Bot API now supports multiple trading accounts with separate configurations. Each account has its own settings, experts, symbols, and position options.

## Account System

### Available Accounts

The system supports two main accounts:

1. **Real Account** (`account_id=real`)
   - Path: `C:\Users\Administrator\Desktop\Aitrading\Aitrading`
   - Purpose: Live trading with real money
   - Description: Real Trading Account

2. **Test Account** (`account_id=test`)
   - Path: `C:\Users\Administrator\Desktop\Aitrading\Aitrading - Test`
   - Purpose: Strategy testing and development
   - Description: Test Trading Account

### Account Identification

All API endpoints support account identification through one of these methods:

1. **Query Parameter**: `?account_id=real` or `?account_id=test`
2. **Header**: `X-Account-ID: real` or `X-Account-ID: test`
3. **JSON Body**: `{"account_id": "real", ...}` or `{"account_id": "test", ...}`

If no account is specified, the system defaults to `"real"`.

## API Endpoints

### Account Management

#### GET /accounts
Get all available accounts.

**Example:**
```bash
curl -X GET "http://localhost:80/accounts"
```

**Response:**
```json
{
  "total_accounts": 2,
  "enabled_accounts": 2,
  "disabled_accounts": 0,
  "accounts": [
    {
      "id": "real",
      "name": "Real Trading Account",
      "path": "C:\\Users\\Administrator\\Desktop\\Aitrading\\Aitrading",
      "description": "Live trading account for real money",
      "enabled": true
    },
    {
      "id": "test",
      "name": "Test Trading Account", 
      "path": "C:\\Users\\Administrator\\Desktop\\Aitrading\\Aitrading - Test",
      "description": "Test account for strategy testing and development",
      "enabled": true
    }
  ]
}
```

### Configuration Endpoints

#### GET /getsettings
Get settings for specific account.

**Examples:**
```bash
# Get settings for real account
curl -X GET "http://localhost:80/getsettings?account_id=real"

# Get settings for test account
curl -X GET "http://localhost:80/getsettings?account_id=test"
```

**Response:**
```json
{
  "webhook_enabled": true,
  "trade_monitoring_enabled": true,
  "data_logger": {
    "enabled": true,
    "webhook_log": true,
    "mt5_handler_log": true,
    "trade_monitor_log": true,
    "position_manager_log": true,
    "message_sender_log": true
  }
}
```

#### POST /savesettings
Save settings for specific account.

**Examples:**
```bash
# Save settings for real account
curl -X POST "http://localhost:80/savesettings" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: real" \
  -d '{
    "webhook_enabled": true,
    "trade_monitoring_enabled": true,
    "data_logger": {
      "enabled": true,
      "webhook_log": true,
      "mt5_handler_log": true,
      "trade_monitor_log": true,
      "position_manager_log": true,
      "message_sender_log": true
    }
  }'

# Save settings for test account
curl -X POST "http://localhost:80/savesettings" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: test" \
  -d '{
    "webhook_enabled": false,
    "trade_monitoring_enabled": true
  }'
```

#### GET /getexperts
Get experts configuration for specific account.

**Examples:**
```bash
# Get experts for real account
curl -X GET "http://localhost:80/getexperts?account_id=real"

# Get experts for test account
curl -X GET "http://localhost:80/getexperts?account_id=test"
```

**Response:**
```json
[
  {
    "id": "expert1",
    "name": "Gold Expert",
    "lot_size": 0.1,
    "enabled": true
  },
  {
    "id": "expert2",
    "name": "Forex Expert",
    "lot_size": 0.01,
    "enabled": false
  }
]
```

#### POST /saveexperts
Save experts configuration for specific account.

**Examples:**
```bash
# Save experts for real account
curl -X POST "http://localhost:80/saveexperts" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: real" \
  -d '[
    {
      "id": "expert1",
      "name": "Gold Expert",
      "lot_size": 0.1,
      "enabled": true
    }
  ]'

# Save experts for test account
curl -X POST "http://localhost:80/saveexperts" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: test" \
  -d '[
    {
      "id": "expert1",
      "name": "Test Gold Expert",
      "lot_size": 0.01,
      "enabled": true
    }
  ]'
```

#### GET /getsymbols
Get symbols configuration for specific account.

**Examples:**
```bash
# Get symbols for real account
curl -X GET "http://localhost:80/getsymbols?account_id=real"

# Get symbols for test account
curl -X GET "http://localhost:80/getsymbols?account_id=test"
```

**Response:**
```json
[
  {
    "symbol": "XAUUSDm",
    "name": "Gold",
    "default_sl_pips": 50,
    "profit_lock_enabled": true,
    "profit_lock_start_pips": 50,
    "profit_lock_distance_pips": 10,
    "profit_secure_enabled": true,
    "sl_trailing_enabled": false,
    "sl_trailing_start_pips": 300,
    "sl_trailing_distance_pips": 20,
    "price2pips": 10,
    "digits": 2,
    "standard_lot": 0.01
  }
]
```

#### POST /savesymbols
Save symbols configuration for specific account.

**Examples:**
```bash
# Save symbols for real account
curl -X POST "http://localhost:80/savesymbols" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: real" \
  -d '[
    {
      "symbol": "XAUUSDm",
      "name": "Gold",
      "default_sl_pips": 50,
      "profit_lock_enabled": true,
      "profit_lock_start_pips": 50,
      "profit_lock_distance_pips": 10,
      "profit_secure_enabled": true,
      "sl_trailing_enabled": false,
      "sl_trailing_start_pips": 300,
      "sl_trailing_distance_pips": 20,
      "price2pips": 10,
      "digits": 2,
      "standard_lot": 0.01
    }
  ]'

# Save symbols for test account
curl -X POST "http://localhost:80/savesymbols" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: test" \
  -d '[
    {
      "symbol": "XAUUSDm",
      "name": "Gold Test",
      "default_sl_pips": 100,
      "profit_lock_enabled": false,
      "profit_secure_enabled": false,
      "sl_trailing_enabled": false,
      "price2pips": 10,
      "digits": 2,
      "standard_lot": 0.01
    }
  ]'
```

### Trading Endpoints

#### GET /getpositions
Get all positions for specific account.

**Examples:**
```bash
# Get positions for real account
curl -X GET "http://localhost:80/getpositions?account_id=real"

# Get positions for test account
curl -X GET "http://localhost:80/getpositions?account_id=test"
```

**Response:**
```json
[
  {
    "ticket": 12345,
    "symbol": "XAUUSDm",
    "type": "buy",
    "volume": 0.1,
    "open_price": 2000.00,
    "current_price": 2010.00,
    "profit": 100.00,
    "swap": 0.00,
    "open_time": "2024-01-15T10:30:00",
    "magic": 0,
    "comment": "",
    "sl": 1995.00,
    "tp": 0.00,
    "account_id": "real",
    "profit_secure_enabled": true,
    "profit_lock_enabled": true,
    "profit_lock_start_pips": 50,
    "profit_lock_distance_pips": 10,
    "sl_trailing_enabled": false,
    "sl_trailing_start_pips": 300,
    "sl_trailing_distance_pips": 20,
    "last_updated": "2024-01-15T14:30:00",
    "created_at": "2024-01-15T10:30:00"
  }
]
```

#### POST /syncpositions
Sync position options for specific account.

**Examples:**
```bash
# Sync positions for real account
curl -X POST "http://localhost:80/syncpositions" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: real" \
  -d '{}'

# Sync positions for test account
curl -X POST "http://localhost:80/syncpositions" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: test" \
  -d '{}'
```

**Response:**
```json
{
  "status": "success",
  "message": "Position options synced successfully for account real",
  "account_id": "real",
  "summary": {
    "total_mt5_positions": 5,
    "options_saved": 3,
    "errors": []
  }
}
```

#### POST /savepositions
Save position options for specific account.

**Examples:**
```bash
# Save position options for real account
curl -X POST "http://localhost:80/savepositions" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: real" \
  -d '{
    "positions": [
      {
        "ticket": 12345,
        "symbol": "XAUUSDm",
        "profit_secure_enabled": true,
        "profit_lock_enabled": true,
        "profit_lock_start_pips": 50,
        "profit_lock_distance_pips": 10,
        "sl_trailing_enabled": false,
        "sl_trailing_start_pips": 300,
        "sl_trailing_distance_pips": 20
      }
    ]
  }'

# Save position options for test account
curl -X POST "http://localhost:80/savepositions" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: test" \
  -d '{
    "positions": [
      {
        "ticket": 67890,
        "symbol": "XAUUSDm",
        "profit_secure_enabled": false,
        "profit_lock_enabled": false,
        "sl_trailing_enabled": false
      }
    ]
  }'
```

#### POST /close
Close position for specific account.

**Examples:**
```bash
# Close position for real account
curl -X POST "http://localhost:80/close" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: real" \
  -d '{
    "ticket": 12345,
    "volume": 0,
    "comment": "Closed via webhook"
  }'

# Close position for test account
curl -X POST "http://localhost:80/close" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: test" \
  -d '{
    "ticket": 67890,
    "volume": 0,
    "comment": "Test position closed"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Position 12345 closed successfully for account real",
  "account_id": "real",
  "result": {
    "success": true,
    "ticket": 12345,
    "volume": 0,
    "comment": "Closed via webhook"
  }
}
```

### Webhook Endpoint

#### POST /webhook
Receive webhook alerts for specific account.

**Examples:**
```bash
# Webhook for real account
curl -X POST "http://localhost:80/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: real" \
  -d '{
    "action": "buy",
    "symbol": "XAUUSDm",
    "volume": 0.1,
    "sl": 1995.00,
    "tp": 0.00,
    "comment": "Gold buy signal"
  }'

# Webhook for test account
curl -X POST "http://localhost:80/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Account-ID: test" \
  -d '{
    "action": "sell",
    "symbol": "XAUUSDm",
    "volume": 0.01,
    "sl": 0.00,
    "tp": 0.00,
    "comment": "Test sell signal"
  }'
```

**Response:**
```json
{
  "status": "success",
  "account_id": "real"
}
```

## Data Logger Settings

### Configuration
The data logger settings control console logging for various components:

```json
{
  "data_logger": {
    "enabled": true,
    "webhook_log": true,
    "mt5_handler_log": true,
    "trade_monitor_log": true,
    "position_manager_log": true,
    "message_sender_log": true
  }
}
```

### Usage
- **enabled**: Master switch for all logging
- **webhook_log**: Log webhook server activities
- **mt5_handler_log**: Log MT5 connection and operations
- **trade_monitor_log**: Log trade monitoring activities
- **position_manager_log**: Log position management operations
- **message_sender_log**: Log Telegram message sending

## Notes

### Account-Specific Operations
- All operations are account-specific and isolated
- No cross-account data access is possible
- Each account maintains its own configuration files
- Account validation ensures only enabled accounts are accessible

### Error Handling
- Invalid account IDs return 404 errors
- Missing account files return appropriate error messages
- All responses include the account_id for clarity

### Best Practices
1. **Always specify account_id** in production requests
2. **Use real account for live trading** and test account for development
3. **Test changes on test account** before applying to real account
4. **Monitor account-specific logs** for debugging
5. **Backup account configurations** regularly

### Data Logger Control
- Enable/disable logging per component
- Reduce console output for better performance
- Useful for debugging specific components

### Logging Performance
- Disabled logging improves performance
- Enable only necessary components
- Monitor system resources when logging is enabled