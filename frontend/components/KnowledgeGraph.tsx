'use client';

import React from 'react';

interface GraphNode {
  id: string;
  type: string;
  label: string;
  metadata?: Record<string, unknown>;
}

interface GraphEdge {
  source: string;
  target: string;
  relationship?: string;  // Made optional to match data
  label?: string;
  weight?: number;
}

interface KnowledgeGraphProps {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  data?: {
    nodes?: GraphNode[];
    edges?: GraphEdge[];
  };
}

export default function KnowledgeGraph({ nodes, edges, data }: KnowledgeGraphProps) {
  const graphNodes = nodes || data?.nodes || [];
  const graphEdges = edges || data?.edges || [];

  // Normalize edges to ensure relationship exists
  const normalizedEdges = graphEdges.map(edge => ({
    ...edge,
    relationship: edge.relationship || edge.label || 'related'
  }));

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
      <h3 className="text-lg font-semibold mb-4">📊 Knowledge Graph</h3>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 min-h-[300px]">
        {graphNodes.length === 0 && graphEdges.length === 0 ? (
          <div className="text-center text-gray-500">
            <p className="mb-2">No graph data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                {graphNodes.length} nodes
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                {normalizedEdges.length} edges
              </span>
            </div>

            {/* Simple visualization */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
              {graphNodes.slice(0, 12).map((node) => (
                <div
                  key={node.id}
                  className="p-2 bg-slate-700 rounded text-xs text-center truncate"
                  title={node.label}
                >
                  <span className="text-blue-400">{node.type}</span>
                  <br />
                  <span className="text-white">{node.label}</span>
                </div>
              ))}
            </div>

            {graphNodes.length > 12 && (
              <p className="text-center text-sm text-gray-500">
                +{graphNodes.length - 12} more nodes
              </p>
            )}

            {/* Edge list */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-300">
                View all connections ({normalizedEdges.length})
              </summary>
              <div className="mt-2 max-h-40 overflow-y-auto text-xs space-y-1">
                {normalizedEdges.slice(0, 20).map((edge, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-400">
                    <span className="text-blue-400">{edge.source}</span>
                    <span className="text-green-400">→ {edge.relationship}</span>
                    <span className="text-purple-400">{edge.target}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
