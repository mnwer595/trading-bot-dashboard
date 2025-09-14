# MT5 Request Endpoint Documentation

## Overview

The `/mt5_request` endpoint provides a unified interface for all MetaTrader 5 operations in a multi-account environment. It allows you to place trades, close positions, modify orders, and retrieve account information through a single endpoint.

## Endpoint Details

- **URL**: `/mt5_request`
- **Method**: `POST`
- **Account Parameter**: `account_id` (query parameter only)
- **Content-Type**: `application/json`

## Basic Usage

```bash
curl -X POST "http://localhost:5000/mt5_request?account_id=test" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "place_trade",
       "symbol": "XAUUSDm",
       "order_type": "buy",
       "volume": 0.01,
       "comment": "Test trade"
     }'
```

## Available Actions

### 1. Trading Actions

#### Place Trade
Place a new trade or pending order.

**Required Fields:**
- `action`: "place_trade"
- `symbol`: Symbol name (e.g., "XAUUSDm")
- `order_type`: Order type (see Order Types below)
- `volume`: Trade volume

**Optional Fields:**
- `price`: Order price (0 for market orders)
- `sl`: Stop Loss price
- `tp`: Take Profit price
- `comment`: Trade comment
- `magic`: Magic number
- `deviation`: Price deviation in points
- `type_filling`: Filling type (see Filling Types below)

**Example:**
```json
{
  "action": "place_trade",
  "symbol": "XAUUSDm",
  "order_type": "buy",
  "volume": 0.01,
  "price": 0,
  "sl": 1950.0,
  "tp": 2050.0,
  "comment": "Buy signal",
  "magic": 12345,
  "deviation": 20,
  "type_filling": "FOK"
}
```

#### Close Position
Close an existing position.

**Required Fields:**
- `action`: "close_position"
- `ticket`: Position ticket number

**Optional Fields:**
- `volume`: Volume to close (0 = close all)
- `comment`: Close comment

**Example:**
```json
{
  "action": "close_position",
  "ticket": 12345,
  "volume": 0,
  "comment": "Manual close"
}
```

#### Modify Position
Modify an existing position's Stop Loss and Take Profit.

**Required Fields:**
- `action`: "modify_position"
- `ticket`: Position ticket number

**Optional Fields:**
- `sl`: New Stop Loss price
- `tp`: New Take Profit price
- `comment`: Modification comment

**Example:**
```json
{
  "action": "modify_position",
  "ticket": 12345,
  "sl": 1950.0,
  "tp": 2050.0,
  "comment": "Updated SL/TP"
}
```

#### Cancel Order
Cancel a pending order.

**Required Fields:**
- `action`: "cancel_order"
- `ticket`: Order ticket number

**Optional Fields:**
- `comment`: Cancellation comment

**Example:**
```json
{
  "action": "cancel_order",
  "ticket": 12345,
  "comment": "Cancelled by user"
}
```

### 2. Information Actions

#### Get Positions
Retrieve all open positions.

**Required Fields:**
- `action`: "get_positions"

**Optional Fields:**
- `symbol`: Filter by symbol

**Example:**
```json
{
  "action": "get_positions",
  "symbol": "XAUUSDm"
}
```

#### Get Orders
Retrieve all pending orders.

**Required Fields:**
- `action`: "get_orders"

**Optional Fields:**
- `symbol`: Filter by symbol

**Example:**
```json
{
  "action": "get_orders",
  "symbol": "XAUUSDm"
}
```

#### Get Account Info
Retrieve account information.

**Required Fields:**
- `action`: "get_account_info"

**Example:**
```json
{
  "action": "get_account_info"
}
```

#### Get Symbol Info
Retrieve symbol information.

**Required Fields:**
- `action`: "get_symbol_info"
- `symbol`: Symbol name

**Example:**
```json
{
  "action": "get_symbol_info",
  "symbol": "XAUUSDm"
}
```

#### Get Quote
Get current price quote for a symbol.

**Required Fields:**
- `action`: "get_quote"
- `symbol`: Symbol name

**Example:**
```json
{
  "action": "get_quote",
  "symbol": "XAUUSDm"
}
```

#### Get History
Retrieve trade history.

**Required Fields:**
- `action`: "get_history"

**Optional Fields:**
- `symbol`: Filter by symbol
- `from_date`: Start date (YYYY-MM-DD)
- `to_date`: End date (YYYY-MM-DD)
- `group`: Symbol group filter

**Example:**
```json
{
  "action": "get_history",
  "symbol": "XAUUSDm",
  "from_date": "2024-01-01",
  "to_date": "2024-01-31",
  "group": "USD*"
}
```

## Order Types

| Type | Description |
|------|-------------|
| `buy` | Market buy order |
| `sell` | Market sell order |
| `buy_limit` | Buy limit pending order |
| `sell_limit` | Sell limit pending order |
| `buy_stop` | Buy stop pending order |
| `sell_stop` | Sell stop pending order |
| `buy_stop_limit` | Buy stop limit pending order |
| `sell_stop_limit` | Sell stop limit pending order |

## Filling Types

| Type | Description |
|------|-------------|
| `FOK` | Fill or Kill - order must be filled completely or cancelled |
| `IOC` | Immediate or Cancel - fill what can be filled immediately, cancel the rest |
| `RETURN` | Return - return order to queue if cannot be filled immediately |

## Response Format

### Success Response
```json
{
  "status": "success",
  "message": "MT5 request place_trade completed successfully for account test",
  "account_id": "test",
  "action": "place_trade",
  "result": {
    "success": true,
    "ticket": 12345,
    "retcode": 10009
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "MT5 request place_trade failed for account test",
  "account_id": "test",
  "action": "place_trade",
  "error": "Invalid symbol",
  "result": {
    "success": false,
    "retcode": 10004,
    "error": "Invalid symbol"
  }
}
```

## Common MT5 Return Codes

| Code | Description |
|------|-------------|
| 10009 | Request completed successfully |
| 10004 | Invalid request |
| 10006 | Request rejected |
| 10007 | Request canceled by trader |
| 10008 | Order placed |
| 10010 | Request completed with errors |
| 10011 | Request canceled by timeout |
| 10012 | Request canceled by user |
| 10013 | Request canceled by timeout |
| 10014 | Request canceled by timeout |
| 10015 | Request canceled by timeout |
| 10016 | Request canceled by timeout |
| 10017 | Request canceled by timeout |
| 10018 | Request canceled by timeout |
| 10019 | Request canceled by timeout |
| 10020 | Request canceled by timeout |

## Usage Examples

### Place a Market Buy Order
```bash
curl -X POST "http://localhost:5000/mt5_request?account_id=test" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "place_trade",
       "symbol": "XAUUSDm",
       "order_type": "buy",
       "volume": 0.01,
       "comment": "Buy signal"
     }'
```

### Place a Buy Limit Order
```bash
curl -X POST "http://localhost:5000/mt5_request?account_id=test" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "place_trade",
       "symbol": "XAUUSDm",
       "order_type": "buy_limit",
       "volume": 0.01,
       "price": 1950.0,
       "sl": 1940.0,
       "tp": 1960.0,
       "comment": "Buy limit order"
     }'
```

### Close a Position
```bash
curl -X POST "http://localhost:5000/mt5_request?account_id=test" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "close_position",
       "ticket": 12345,
       "comment": "Manual close"
     }'
```

### Modify Position SL/TP
```bash
curl -X POST "http://localhost:5000/mt5_request?account_id=test" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "modify_position",
       "ticket": 12345,
       "sl": 1950.0,
       "tp": 2050.0,
       "comment": "Updated SL/TP"
     }'
```

### Get All Positions
```bash
curl -X POST "http://localhost:5000/mt5_request?account_id=test" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "get_positions"
     }'
```

### Get Account Information
```bash
curl -X POST "http://localhost:5000/mt5_request?account_id=test" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "get_account_info"
     }'
```

### Get Symbol Quote
```bash
curl -X POST "http://localhost:5000/mt5_request?account_id=test" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "get_quote",
       "symbol": "XAUUSDm"
     }'
```

## Error Handling

The endpoint provides comprehensive error handling with detailed error messages:

- **400 Bad Request**: Missing required fields or invalid data format
- **500 Internal Server Error**: Multi-account manager not available or MT5 connection issues

## Multi-Account Support

The endpoint supports multiple trading accounts by specifying the `account_id` query parameter:

- `?account_id=test` - Test account
- `?account_id=real` - Real account
- `?account_id=demo` - Demo account

Each account operates independently with its own MT5 connection and settings.

## Security Notes

- Always validate account IDs before processing requests
- Use appropriate error handling for production environments
- Monitor MT5 connection status and handle disconnections gracefully
- Implement proper logging for audit trails

## Integration Examples

### Python
```python
import requests

def place_trade(account_id, symbol, order_type, volume, **kwargs):
    url = f"http://localhost:5000/mt5_request?account_id={account_id}"
    data = {
        "action": "place_trade",
        "symbol": symbol,
        "order_type": order_type,
        "volume": volume,
        **kwargs
    }
    response = requests.post(url, json=data)
    return response.json()

# Usage
result = place_trade("test", "XAUUSDm", "buy", 0.01, comment="Python API")
print(result)
```

### JavaScript
```javascript
async function placeTrade(accountId, symbol, orderType, volume, options = {}) {
    const url = `http://localhost:5000/mt5_request?account_id=${accountId}`;
    const data = {
        action: "place_trade",
        symbol: symbol,
        order_type: orderType,
        volume: volume,
        ...options
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    
    return await response.json();
}

// Usage
placeTrade("test", "XAUUSDm", "buy", 0.01, { comment: "JavaScript API" })
    .then(result => console.log(result))
    .catch(error => console.error(error));
```

## Troubleshooting

### Common Issues

1. **"Multi-account manager not available"**
   - Ensure the multi-account manager is properly initialized
   - Check that the webhook server is running

2. **"Invalid symbol"**
   - Verify the symbol name is correct (e.g., "XAUUSDm" not "XAUUSD")
   - Check that the symbol is available in the broker's symbol list

3. **"Account not found"**
   - Verify the account_id exists in accounts.json
   - Ensure the account is enabled

4. **"MT5 connection failed"**
   - Check MT5 terminal is running
   - Verify account credentials are correct
   - Ensure auto-trading is enabled in MT5

### Debug Mode

Enable debug logging by checking the webhook server logs for detailed information about request processing and MT5 responses.
