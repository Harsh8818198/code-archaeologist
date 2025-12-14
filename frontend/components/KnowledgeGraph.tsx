'use client';

import React from 'react';

interface KnowledgeGraphProps {
  data?: any;
}

export default function KnowledgeGraph({ data }: KnowledgeGraphProps) {
  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
      <h3 className="text-lg font-semibold mb-4">📊 Knowledge Graph</h3>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center min-h-[300px] flex items-center justify-center">
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            🚧 Knowledge graph visualization coming soon
          </p>
          <p className="text-sm text-gray-500">
            Will display repository structure and relationships
          </p>
        </div>
      </div>
    </div>
  );
}
