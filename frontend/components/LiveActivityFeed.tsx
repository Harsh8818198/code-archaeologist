'use client';

import { useEffect, useState } from 'react';

interface Event {
  id: string;
  type: string;
  repoUrl: string;
  commitHash?: string;
  message: string;
  timestamp: string;
}

export function LiveActivityFeed() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/api/events/recent`);
        const data = await res.json();
        
        if (data.success) {
          setEvents(data.events);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 5000);

    return () => clearInterval(interval);
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'excavation_started': return '🔍';
      case 'commit_analyzed': return '✅';
      case 'clarification_needed': return '❓';
      default: return '📝';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="animate-pulse">🔴</span> Live Activity
        </h3>
        <p className="text-sm text-gray-500">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <span className="animate-pulse">🔴</span> Live Activity
      </h3>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity</p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">{getEventIcon(event.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {event.message}
                  </p>
                  {event.commitHash && (
                    <p className="text-xs text-gray-500 font-mono">
                      {event.commitHash.substring(0, 7)}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTimestamp(event.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
