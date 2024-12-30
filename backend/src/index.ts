import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  Annotation,
  END,
  START,
  StateGraph,
  MessagesAnnotation,
} from "@langchain/langgraph";
import {
  BaseMessage,
  ToolMessage,
  type AIMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { SearchResult, KnowledgeBaseResponse } from "./types.js";
import { milvusSearchTool } from "./tools.js";
import express from 'express';
import cors from 'cors';

// Express app setup
const app = express();
app.use(cors());
app.use(express.json());

// Define our custom annotation type for Milvus query results
const GraphAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  milvusQueryResults: Annotation<SearchResult[]>,
});

const llm = new ChatOpenAI({
  model: "gpt-4",
  temperature: 0,
});

const ALL_TOOLS_LIST = [milvusSearchTool];

const toolNode = new ToolNode(ALL_TOOLS_LIST);

const callModel = async (state: typeof GraphAnnotation.State) => {
  const { messages } = state;

  const systemMessage = {
    role: "system",
    content:
      "You are a knowledgeable assistant with access to a Milvus vector database. " +
      "Your task is to help users find relevant information by querying the knowledge base. " +
      "Use the milvus_search tool to find information relevant to the user's question. " +
      "The knowledge base contains embedded documents that can be searched semantically.",
  };

  const llmWithTools = llm.bindTools(ALL_TOOLS_LIST);
  const result = await llmWithTools.invoke([systemMessage, ...messages]);
  return { messages: result };
};

const shouldContinue = (state: typeof GraphAnnotation.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  // Cast here since `tool_calls` does not exist on `BaseMessage`
  const messageCastAI = lastMessage as AIMessage;
  if (messageCastAI._getType() !== "ai" || !messageCastAI.tool_calls?.length) {
    // LLM did not call any tools, or it's not an AI message, so we should end.
    return END;
  }

  return "tools";
};

const processResults = async (state: typeof GraphAnnotation.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  
  if (lastMessage._getType() !== "tool") {
    throw new Error("Expected the last message to be a tool message");
  }

  // Parse the Milvus search results
  const results = JSON.parse(lastMessage.content as string) as KnowledgeBaseResponse;
  
  return {
    milvusQueryResults: results.search_results,
    messages: [
      ...messages,
      {
        role: "assistant",
        content: "I've found some relevant information from the knowledge base. Let me help you understand it.",
      },
    ],
  };
};

const workflow = new StateGraph(GraphAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addNode("process_results", processResults)
  .addEdge(START, "agent")
  .addEdge("tools", "process_results")
  .addEdge("process_results", "agent")
  .addConditionalEdges("agent", shouldContinue, [
    "tools",
    END,
  ]);

const graph = workflow.compile();

// API endpoints
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('Received message:', message);
    
    const result = await graph.invoke({
      messages: [{
        role: "user",
        content: message
      }]
    });
    
    console.log('Sending response:', result);
    res.json(result);
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

app.post('/threads', async (_, res) => {
  try {
    // Create a new thread
    const threadId = Math.random().toString(36).substring(7);
    res.json({ thread_id: threadId });
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

app.post('/threads/:threadId/runs', async (req, res) => {
  try {
    const { messages } = req.body;
    console.log('Received message:', messages);
    
    const result = await graph.invoke({
      messages: messages
    });
    
    console.log('Sending response:', result);
    res.json(result);
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Add stream endpoint
app.post('/threads/:threadId/runs/stream', async (req, res) => {
  try {
    const { input } = req.body;
    console.log('Received stream request:', {
      threadId: req.params.threadId,
      input
    });
    
    if (!input?.messages) {
      console.error('No messages found in request:', req.body);
      throw new Error('No messages provided in request body');
    }
    
    const result = await graph.invoke({
      messages: input.messages
    });
    
    console.log('Stream result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});
