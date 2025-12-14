'use client';

import React from 'react';

interface GraphNode {
  id: string;
  type: string;
  label: string;
}

interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
}

interface KnowledgeGraphProps {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  data?: any; // Fallback for any other format
}

export default function KnowledgeGraph({ nodes, edges, data }: KnowledgeGraphProps) {
  const graphNodes = nodes || data?.nodes || [];
  const graphEdges = edges || data?.edges || [];

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
      <h3 className="text-lg font-semibold mb-4">📊 Knowledge Graph</h3>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center min-h-[300px] flex items-center justify-center">
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            🚧 Knowledge graph visualization coming soon
          </p>
          <p className="text-sm text-gray-500">
            {graphNodes.length} nodes, {graphEdges.length} edges
          </p>
          {(graphNodes.length > 0 || graphEdges.length > 0) && (
            <div className="mt-4 text-left">
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                  View raw data
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded overflow-auto max-h-64">
                  {JSON.stringify({ nodes: graphNodes, edges: graphEdges }, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
