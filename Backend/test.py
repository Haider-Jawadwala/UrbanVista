from pymongo import MongoClient

# Assuming you already have a MongoDB connection
client = MongoClient("mongodb+srv://abizer:abizer786@cluster0.7x9mozn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0lrBHf77WZrhZfv3nsv27lcJyTKVtqOjz")
db = client.get_database("plot_recommendations")

# Create a new collection for plot status
plot_status_collection = db.plot_status

# Create a unique index on latitude and longitude
plot_status_collection.create_index([("latitude", 1), ("longitude", 1)], unique=True)