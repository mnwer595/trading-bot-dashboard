#!/usr/bin/env python3
"""
Startup script for Trading Bot Services
Launches API gateway and trading bots in separate processes
"""

import subprocess
import sys
import time
import signal
import os
from typing import List

class ServiceManager:
    def __init__(self):
        self.processes = []
        self.services = [
            {
                "name": "API Gateway",
                "script": "api-gateway-server.py",
                "port": 8000
            },
            {
                "name": "Trading Bot 1 (Account 1)",
                "script": "trading-bot-1.py",  # You'll need to create this
                "port": 8001
            },
            {
                "name": "Trading Bot 2 (Account 2)", 
                "script": "trading-bot-2.py",  # You'll need to create this
                "port": 8002
            }
        ]
    
    def start_service(self, service):
        """Start a single service"""
        try:
            print(f"Starting {service['name']} on port {service['port']}...")
            
            # Check if script exists
            if not os.path.exists(service['script']):
                print(f"Warning: {service['script']} not found. Skipping...")
                return None
            
            # Start the process
            process = subprocess.Popen(
                [sys.executable, service['script']],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            self.processes.append({
                "name": service['name'],
                "process": process,
                "port": service['port']
            })
            
            print(f"✓ {service['name']} started (PID: {process.pid})")
            return process
            
        except Exception as e:
            print(f"✗ Failed to start {service['name']}: {e}")
            return None
    
    def start_all(self):
        """Start all services"""
        print("🚀 Starting Trading Bot Services...")
        print("=" * 50)
        
        for service in self.services:
            self.start_service(service)
            time.sleep(1)  # Small delay between starts
        
        print("=" * 50)
        print("✅ All services started!")
        print("\n📊 Service Status:")
        print("- API Gateway: http://localhost:8000")
        print("- Bot 1: http://localhost:8001") 
        print("- Bot 2: http://localhost:8002")
        print("\n📖 API Documentation: http://localhost:8000/docs")
        print("\n⏹️  Press Ctrl+C to stop all services")
    
    def stop_all(self):
        """Stop all services"""
        print("\n🛑 Stopping all services...")
        
        for proc_info in self.processes:
            try:
                proc_info['process'].terminate()
                print(f"✓ Stopped {proc_info['name']}")
            except Exception as e:
                print(f"✗ Error stopping {proc_info['name']}: {e}")
        
        # Wait for processes to terminate
        for proc_info in self.processes:
            try:
                proc_info['process'].wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc_info['process'].kill()
                print(f"⚠️  Force killed {proc_info['name']}")
        
        print("✅ All services stopped!")

def signal_handler(signum, frame):
    """Handle Ctrl+C signal"""
    print("\n🛑 Received interrupt signal...")
    manager.stop_all()
    sys.exit(0)

if __name__ == "__main__":
    manager = ServiceManager()
    
    # Register signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        manager.start_all()
        
        # Keep the script running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        pass
    finally:
        manager.stop_all() 