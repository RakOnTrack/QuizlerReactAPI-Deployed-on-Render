// Test mongo database

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongo = null;
let db = {}

db.Question = require("../models/question.model.js");
db.Quiz = require("../models/quiz.model.js");
db.Directory = require("../models/directory.model.js");
 
const connect = async () => {
    try {
        mongo = await MongoMemoryServer.create();
        const uri = mongo.getUri();
        //process.env.MONGO_URL = uri;
        await mongoose.connect(uri, {})

        console.log(`Test MongoDB connected: ${uri}`)
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
};

const close = async () => {
    try {
        if (mongo) {
            await mongoose.connection.dropDatabase();
            await mongoose.connection.close();
            await mongo.stop();
        }
    } catch {
        console.log(err);
        process.exit(1);
    }
};

const clear = async () => {
    if (mongo) {
        const collections = await mongoose.connection.db.collections();
        for (let collection of collections) {
          await collection.remove();
        }
    }
};

module.exports =  { connect, close, clear, db };