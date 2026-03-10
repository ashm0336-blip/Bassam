from motor.motor_asyncio import AsyncIOMotorClient
import os

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=10000,
    connectTimeoutMS=10000,
    socketTimeoutMS=30000,
    retryWrites=True,
    w="majority"
)
db = client[os.environ['DB_NAME']]
