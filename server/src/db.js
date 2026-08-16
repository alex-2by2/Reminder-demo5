'use strict';

const { MongoClient } = require('mongodb');
const { config } = require('./config');

let clientPromise;

async function getDb() {
  if (!config.mongoUri) return null;
  if (!clientPromise) {
    const client = new MongoClient(config.mongoUri);
    clientPromise = client.connect();
  }
  const client = await clientPromise;
  return client.db(config.mongoDbName);
}

async function closeDb() {
  if (!clientPromise) return;
  const client = await clientPromise;
  await client.close();
  clientPromise = undefined;
}

module.exports = { getDb, closeDb };
