export const MILVUS_CONFIG = {
  address: process.env.MILVUS_ADDRESS || 'http://47.251.112.46:19530',
  collection: process.env.MILVUS_COLLECTION || "test_collection4",
  dimension: parseInt(process.env.MILVUS_DIMENSION || "1536", 10), // OpenAI embedding dimension
}; 