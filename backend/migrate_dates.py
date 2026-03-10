#!/usr/bin/env python3
"""
Migration script to convert old Hijri string dates to ISO 8601 format
"""
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import asyncio
from dotenv import load_dotenv
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def migrate_transaction_dates():
    """Migrate all transaction dates from Hijri string to ISO format"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print(f"Connected to database: {os.environ['DB_NAME']}")
    
    # Find all transactions with old date format
    transactions = await db.transactions.find({}).to_list(None)
    
    print(f"Found {len(transactions)} transactions")
    
    updated_count = 0
    
    for trans in transactions:
        update_fields = {}
        
        # Check transaction_date
        if trans.get('transaction_date'):
            trans_date = trans['transaction_date']
            # Check if it's old format (doesn't contain 'T' or '-')
            if not ('T' in trans_date or '-' in trans_date):
                # Old format detected, use created_at as fallback
                if trans.get('created_at'):
                    update_fields['transaction_date'] = trans['created_at']
                    print(f"  Transaction {trans.get('transaction_number', 'UNKNOWN')}: Converting date from '{trans_date}' to '{trans['created_at']}'")
                else:
                    # If no created_at, use current time
                    iso_date = datetime.now().isoformat()
                    update_fields['transaction_date'] = iso_date
                    print(f"  Transaction {trans.get('transaction_number', 'UNKNOWN')}: Converting date from '{trans_date}' to '{iso_date}' (using current time)")
        
        # Check due_date
        if trans.get('due_date'):
            due_date = trans['due_date']
            if not ('T' in due_date or '-' in due_date):
                # Old format, set to None or use transaction_date + 7 days
                update_fields['due_date'] = None
                print(f"  Transaction {trans.get('transaction_number', 'UNKNOWN')}: Removing invalid due_date '{due_date}'")
        
        # Update the document if needed
        if update_fields:
            await db.transactions.update_one(
                {"id": trans["id"]},
                {"$set": update_fields}
            )
            updated_count += 1
    
    print(f"\nMigration complete! Updated {updated_count} transactions.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_transaction_dates())
