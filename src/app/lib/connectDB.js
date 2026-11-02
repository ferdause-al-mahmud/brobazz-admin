const { MongoClient, ServerApiVersion } = require('mongodb');

// Same database as the Brobazz customer app.
const DB_NAME = process.env.DB_NAME || 'brobazz';

let db;
export const connectDB = async () => {
    if (db) {
        return db; // Return the cached DB instance if already connected
    }

    try {
        const uri = process.env.MONGODB_URI;
        const client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });
        await client.connect();  // Wait for the connection to be established
        db = client.db(DB_NAME);
        return db;
    } catch (error) {
        console.error('Failed to connect to the database', error);
        throw error;  // Rethrow the error so it can be caught in the calling function
    }
}
