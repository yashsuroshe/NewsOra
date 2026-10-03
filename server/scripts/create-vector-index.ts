/**
 * create-vector-index.ts
 *
 * Run this ONCE after your MongoDB Atlas cluster is set up to create
 * the vector search index on the vectorchunks collection.
 *
 * Usage:
 *   npx tsx scripts/create-vector-index.ts
 *
 * Requirements:
 *   - MONGODB_URI must point to an Atlas cluster (not localhost)
 *   - The Atlas user must have Atlas Admin or Project Data Access Admin role
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { config } from '../src/config/index.js';

async function createVectorIndex(): Promise<void> {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(config.MONGODB_URI);

  const db = mongoose.connection.db;
  if (!db) throw new Error('No database connection');

  const collectionName = 'vectorchunks';

  console.log(`Creating Atlas Vector Search index on collection: ${collectionName}`);

  try {
    // MongoDB Atlas Search Index definition for vector search
    await db.command({
      createSearchIndexes: collectionName,
      indexes: [
        {
          name: 'vector_index',
          type: 'vectorSearch',
          definition: {
            fields: [
              {
                type: 'vector',
                path: 'embedding',
                numDimensions: 768,        // gemini-embedding-001 output dimension
                similarity: 'cosine',      // Cosine similarity for semantic search
              },
              // Pre-filter fields for hybrid search
              {
                type: 'filter',
                path: 'metadata.topics',
              },
              {
                type: 'filter',
                path: 'metadata.publishedAt',
              },
            ],
          },
        },
      ],
    });

    console.log('✅ Vector search index created successfully!');
    console.log('Note: Index may take a few minutes to become active in Atlas.');
  } catch (err) {
    const error = err as { codeName?: string; message?: string };
    if (error.codeName === 'IndexAlreadyExists') {
      console.log('ℹ️  Vector index already exists — skipping.');
    } else {
      console.error('❌ Failed to create vector index:', error.message);
      throw err;
    }
  } finally {
    await mongoose.disconnect();
  }
}

createVectorIndex().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
