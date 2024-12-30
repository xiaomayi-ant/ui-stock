/**
 * ----------------------------------------------------
 * --------- /search/results ---------
 * ----------------------------------------------------
 */
export interface SearchResult {
  collection_name: string;
  results: Array<{
    id: number;
    distance: number;
    content: string;
  }>;
}

export interface KnowledgeBaseResponse {
  search_results: SearchResult[];
}

export interface QueryInput {
  input: string;
}

/**
 * ----------------------------------------------------
 * ------------------ /company/facts ------------------
 * ----------------------------------------------------
 */
// ... rest of the file remains unchanged

