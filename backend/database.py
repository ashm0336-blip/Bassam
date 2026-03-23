from motor.motor_asyncio import AsyncIOMotorClient
import os
import ssl

mongo_url = os.environ['MONGO_URL']

connect_args = {
    "serverSelectionTimeoutMS": 10000,
    "connectTimeoutMS": 10000,
    "socketTimeoutMS": 30000,
    "retryWrites": True,
    "w": "majority",
}

if mongo_url.startswith("mongodb+srv://") or "mongodb.net" in mongo_url:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    connect_args["tlsCAFile"] = None
    connect_args["ssl"] = True
    connect_args["tlsAllowInvalidCertificates"] = True
    connect_args["tlsAllowInvalidHostnames"] = True

client = AsyncIOMotorClient(mongo_url, **connect_args)
db = client[os.environ['DB_NAME']]
