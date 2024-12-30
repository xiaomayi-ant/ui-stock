import { StructuredTool } from "@langchain/core/tools";
import { SearchResult, KnowledgeBaseResponse, QueryInput } from "./types.js";
import { MILVUS_CONFIG } from "./config.js";
import { MilvusClient } from "@zilliz/milvus2-sdk-node";
import { OpenAIEmbeddings } from "@langchain/openai";
import { z } from "zod";

let milvusClient: MilvusClient | null = null;
const embeddings = new OpenAIEmbeddings();

const getMilvusClient = async () => {
  if (!milvusClient) {
    milvusClient = new MilvusClient({
      address: MILVUS_CONFIG.address,
    });
  }
  return milvusClient;
};

export const queryMilvusKnowledgeBase = async ({ input }: QueryInput): Promise<KnowledgeBaseResponse> => {
  try {
    const client = await getMilvusClient();
    console.log(`Searching Milvus for: ${input}`);
    
    // Convert input text to vector embedding
    const vectorEmbedding = await embeddings.embedQuery(input);
    
    const searchResponse = await client.search({
      collection_name: MILVUS_CONFIG.collection,
      vector: vectorEmbedding,
      limit: 5,
      output_fields: ["content", "metadata"],
    });

    return {
      search_results: [{
        collection_name: MILVUS_CONFIG.collection,
        results: searchResponse.results.map(result => ({
          id: Number(result.id),
          distance: Number(result.distance),
          content: String(result.content),
          metadata: result.metadata ? JSON.parse(String(result.metadata)) : {},
        })),
      }]
    };
  } catch (error) {
    console.error("Error querying Milvus:", error);
    throw error;
  }
};

class MilvusSearchTool extends StructuredTool {
  name = "milvus_search";
  description = "Search the Milvus vector database for relevant information";
  schema = z.object({
    input: z.string().describe("The search query to find relevant information"),
  });

  async _call({ input }: z.infer<typeof this.schema>) {
    const response = await queryMilvusKnowledgeBase({ input });
    return JSON.stringify(response);
  }
}

export const milvusSearchTool = new MilvusSearchTool();