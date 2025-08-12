API url = http://198.23.206.54

getsettings JSON = "/getsettings"
respone shape : 
{
    "auto_trade": false,
    "channel_listener": true,
    "webhook_enabled": true,
    "risk_percentage": 10,
    "lot_size": 0.01,
    "default_sl_pips": 60,
    "risk_reward_ratio": 2,
    "trading_hours": {
        "start": 1,
        "end": 23
    },
    "algo_trading": {
        "enabled": false,
        "interval_minutes": 1
    },
    "hft_trading": {
        "enabled": false
    },
    "trade_secure": {
        "enabled": true
    }
}

save settings : "/savesettings"


Load experts configuration from /getexperts
Save expert settings to /saveexperts

JSON sample : (
[
  {
    "name": "Infinity-algo",
    "lot_size": 0.03,
    "enabled": true,
    "multi-actions": false,
    "multi-tp": true,
    "volume_keep": 0.01,
    "buy_only": false,
    "tp_enabled": false,
    "signal_in_same_direction": true,
    "tp_when_in_profit": false,
    "last_signal": "sell"
  },
  {
    "name": "gold-buy",
    "lot_size": 0.01,
    "enabled": true,
    "multi-actions": true,
    "multi-tp": true,
    "volume_keep": 0,
    "buy_only": true,
    "tp_enabled": true,
    "signal_in_same_direction": true,
    "last_signal": "buy"
  },
  {
    "name": "In-algo-usdjpy",
    "lot_size": 0.2,
    "enabled": true,
    "multi-actions": false,
    "multi-tp": false,
    "volume_keep": 0.03,
    "buy_only": false,
    "tp_enabled": false,
    "signal_in_same_direction": true,
    "tp_when_in_profit": true,
    "last_signal": "buy"
  }
]

)