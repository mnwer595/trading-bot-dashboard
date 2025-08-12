# Trading Bot API Gateway Setup Guide

## Overview
This solution provides a central API gateway that can receive commands and route them to multiple trading bots running on the same machine. Instead of using separate Telegram bots, you'll have one central server that manages all your trading bots.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Dashboard │    │  API Gateway     │    │ Trading Bot 1   │
│   (Next.js)     │◄──►│  (Port 8000)     │◄──►│  (Port 8001)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Trading Bot 2   │
                       │  (Port 8002)    │
                       └─────────────────┘
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Install Python packages
pip install -r requirements.txt

# Or install individually:
pip install fastapi uvicorn httpx pydantic python-telegram-bot
```

### 2. Configure the API Gateway

Edit `api-gateway-server.py`:

```python
# Update the TRADING_BOTS configuration
TRADING_BOTS = {
    "acc1": {
        "name": "Account 1 Bot",
        "url": "http://localhost:8001",  # Bot 1 API endpoint
        "telegram_bot_token": "YOUR_BOT1_TOKEN",
        "status": "running"
    },
    "acc2": {
        "name": "Account 2 Bot", 
        "url": "http://localhost:8002",  # Bot 2 API endpoint
        "telegram_bot_token": "YOUR_BOT2_TOKEN",
        "status": "running"
    }
}
```

### 3. Configure Individual Trading Bots

For each trading bot, create a copy of `trading-bot-template.py` and modify:

**Bot 1 (Account 1):**
```python
BOT_CONFIG = {
    "account_id": "acc1",
    "name": "Account 1 Bot",
    "port": 8001,
    "telegram_bot_token": "YOUR_BOT1_TOKEN"
}
```

**Bot 2 (Account 2):**
```python
BOT_CONFIG = {
    "account_id": "acc2", 
    "name": "Account 2 Bot",
    "port": 8002,
    "telegram_bot_token": "YOUR_BOT2_TOKEN"
}
```

### 4. Integrate with Your Existing Bots

In each trading bot template, replace the placeholder functions with your actual trading logic:

```python
async def handle_start_bot():
    """Start the trading bot"""
    try:
        # Replace this with your existing bot start logic
        # Example:
        # await start_trading_session()
        # await connect_to_broker()
        # await initialize_experts()
        
        bot_state["status"] = "running"
        bot_state["is_trading"] = True
        return {"success": True, "message": "Bot started successfully"}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def handle_get_status():
    """Get bot status"""
    try:
        # Replace with your actual balance fetching logic
        # Example:
        # balance = await get_account_balance()
        # bot_state["balance"] = balance
        
        return {
            "success": True,
            "data": {
                "account_id": BOT_CONFIG["account_id"],
                "status": bot_state["status"],
                "balance": bot_state["balance"],
                "last_update": bot_state["last_update"].isoformat(),
                "is_trading": bot_state["is_trading"]
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### 5. Start the Services

**Terminal 1 - API Gateway:**
```bash
python api-gateway-server.py
# Runs on http://localhost:8000
```

**Terminal 2 - Bot 1:**
```bash
python trading-bot-1.py  # Your modified template for Account 1
# Runs on http://localhost:8001
```

**Terminal 3 - Bot 2:**
```bash
python trading-bot-2.py  # Your modified template for Account 2
# Runs on http://localhost:8002
```

### 6. Update Your Web Dashboard

Update your Next.js dashboard to use the API gateway instead of direct bot communication:

```typescript
// Example API calls from your dashboard

// Get all accounts status
const getAccountsStatus = async () => {
  const response = await fetch('http://localhost:8000/status');
  return response.json();
};

// Execute command on specific account
const executeCommand = async (accountId: string, command: string, parameters?: any) => {
  const response = await fetch('http://localhost:8000/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account_id: accountId,
      command: command,
      parameters: parameters
    })
  });
  return response.json();
};

// Execute command on all accounts
const executeCommandAll = async (command: string, parameters?: any) => {
  const response = await fetch('http://localhost:8000/execute-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      command: command,
      parameters: parameters
    })
  });
  return response.json();
};
```

## Available Commands

The API gateway supports these commands:

### Individual Account Commands
- `start` - Start the trading bot
- `stop` - Stop the trading bot  
- `status` - Get bot status and balance
- `update_settings` - Update bot settings
- `execute_trade` - Execute a trade
- `get_settings` - Get current settings
- `get_experts` - Get expert configurations

### All Accounts Commands
- `execute-all` - Execute the same command on all accounts

## Example Usage

### Start both bots:
```bash
curl -X POST http://localhost:8000/execute-all \
  -H "Content-Type: application/json" \
  -d '{"command": "start"}'
```

### Get status of specific account:
```bash
curl http://localhost:8000/status/acc1
```

### Update settings for Account 1:
```bash
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "acc1",
    "command": "update_settings",
    "parameters": {
      "settings": {
        "risk": "High",
        "mode": "Auto"
      }
    }
  }'
```

## Benefits of This Solution

1. **Centralized Control**: One API gateway manages all bots
2. **Web Dashboard Integration**: Easy integration with your Next.js dashboard
3. **Scalable**: Easy to add more accounts/bots
4. **Reliable**: HTTP-based communication with error handling
5. **Real-time Status**: Live status updates from all bots
6. **Flexible**: Support for individual and bulk operations

## Security Considerations

1. **Add Authentication**: Implement API keys or JWT tokens
2. **HTTPS**: Use SSL certificates in production
3. **Firewall**: Restrict access to API endpoints
4. **Rate Limiting**: Prevent abuse of the API

## Production Deployment

For production, consider:

1. **Process Management**: Use systemd, supervisor, or PM2
2. **Logging**: Implement proper logging and monitoring
3. **Backup**: Regular backups of configurations
4. **Monitoring**: Health checks and alerting
5. **Load Balancing**: If running multiple instances

## Troubleshooting

### Common Issues:

1. **Port Already in Use**: Change port numbers in configuration
2. **Connection Refused**: Check if bots are running
3. **CORS Errors**: Update CORS settings in API gateway
4. **Timeout Errors**: Increase timeout values for slow operations

### Debug Commands:

```bash
# Check if services are running
curl http://localhost:8000/health
curl http://localhost:8001/health  
curl http://localhost:8002/health

# Check API documentation
# Visit http://localhost:8000/docs for interactive API docs
``` 