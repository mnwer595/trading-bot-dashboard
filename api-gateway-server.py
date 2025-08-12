#!/usr/bin/env python3
"""
Central API Gateway Server for Trading Bots
Routes commands to appropriate trading bots based on account ID
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import uvicorn
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Trading Bot API Gateway", version="1.0.0")

# Add CORS middleware for web dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Add your dashboard URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration for trading bots
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

# Pydantic models for request/response
class CommandRequest(BaseModel):
    account_id: str
    command: str
    parameters: Optional[Dict[str, Any]] = None

class BotStatus(BaseModel):
    account_id: str
    status: str
    balance: Optional[float] = None
    last_update: datetime

class BotResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

# Global status tracking
bot_statuses: Dict[str, BotStatus] = {}

async def send_command_to_bot(account_id: str, command: str, parameters: Optional[Dict] = None) -> Dict[str, Any]:
    """Send command to specific trading bot"""
    if account_id not in TRADING_BOTS:
        raise HTTPException(status_code=404, detail=f"Account {account_id} not found")
    
    bot_config = TRADING_BOTS[account_id]
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "command": command,
                "parameters": parameters or {},
                "timestamp": datetime.now().isoformat()
            }
            
            response = await client.post(
                f"{bot_config['url']}/execute",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Bot {account_id} returned error: {response.status_code} - {response.text}")
                return {"success": False, "error": f"Bot error: {response.status_code}"}
                
    except httpx.RequestError as e:
        logger.error(f"Failed to communicate with bot {account_id}: {e}")
        return {"success": False, "error": f"Communication error: {str(e)}"}

async def update_bot_status(account_id: str):
    """Update status of a specific bot"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{TRADING_BOTS[account_id]['url']}/status")
            if response.status_code == 200:
                status_data = response.json()
                bot_statuses[account_id] = BotStatus(
                    account_id=account_id,
                    status=status_data.get("status", "unknown"),
                    balance=status_data.get("balance"),
                    last_update=datetime.now()
                )
    except Exception as e:
        logger.error(f"Failed to update status for bot {account_id}: {e}")

# API Endpoints

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Trading Bot API Gateway", "version": "1.0.0"}

@app.get("/accounts")
async def get_accounts():
    """Get list of all accounts"""
    return {
        "accounts": [
            {
                "id": acc_id,
                "name": config["name"],
                "status": bot_statuses.get(acc_id, BotStatus(
                    account_id=acc_id,
                    status="unknown",
                    last_update=datetime.now()
                )).status
            }
            for acc_id, config in TRADING_BOTS.items()
        ]
    }

@app.get("/status/{account_id}")
async def get_account_status(account_id: str):
    """Get status of specific account"""
    if account_id not in TRADING_BOTS:
        raise HTTPException(status_code=404, detail="Account not found")
    
    await update_bot_status(account_id)
    return bot_statuses.get(account_id, {"account_id": account_id, "status": "unknown"})

@app.post("/execute")
async def execute_command(request: CommandRequest, background_tasks: BackgroundTasks):
    """Execute command on specific account"""
    try:
        result = await send_command_to_bot(request.account_id, request.command, request.parameters)
        
        # Update status in background
        background_tasks.add_task(update_bot_status, request.account_id)
        
        return BotResponse(
            success=result.get("success", False),
            message=result.get("message", "Command executed"),
            data=result.get("data")
        )
    except Exception as e:
        logger.error(f"Error executing command: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/execute-all")
async def execute_command_all(request: CommandRequest, background_tasks: BackgroundTasks):
    """Execute command on all accounts"""
    results = {}
    
    for account_id in TRADING_BOTS.keys():
        try:
            result = await send_command_to_bot(account_id, request.command, request.parameters)
            results[account_id] = result
            background_tasks.add_task(update_bot_status, account_id)
        except Exception as e:
            results[account_id] = {"success": False, "error": str(e)}
    
    return {"results": results}

@app.get("/status")
async def get_all_status():
    """Get status of all accounts"""
    # Update all statuses
    tasks = [update_bot_status(acc_id) for acc_id in TRADING_BOTS.keys()]
    await asyncio.gather(*tasks, return_exceptions=True)
    
    return {
        "statuses": [
            bot_statuses.get(acc_id, BotStatus(
                account_id=acc_id,
                status="unknown",
                last_update=datetime.now()
            )).dict()
            for acc_id in TRADING_BOTS.keys()
        ]
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    # Initialize status tracking
    for acc_id in TRADING_BOTS.keys():
        bot_statuses[acc_id] = BotStatus(
            account_id=acc_id,
            status="unknown",
            last_update=datetime.now()
        )
    
    # Run the server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    ) 