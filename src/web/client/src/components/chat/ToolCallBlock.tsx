import { useState } from 'react';
import type { ToolEvent } from '../../api/useChat';
import { useTheme } from '../../context/ThemeContext';

function formatToolName(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function summarizeArgs(args: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(args)) {
    if (typeof val === 'string' && val.length < 60) {
      parts.push(`${key}: ${val}`);
    }
  }
  return parts.join(', ') || JSON.stringify(args).slice(0, 80);
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function extractSourceUrls(result?: string): string[] {
  if (!result) return [];
  try {
    const parsed = JSON.parse(result);
    if (parsed?.sourceUrls && Array.isArray(parsed.sourceUrls)) {
      return parsed.sourceUrls.filter((u: unknown) => typeof u === 'string' && u.startsWith('http'));
    }
  } catch {
    // not JSON or no sourceUrls
  }
  return [];
}

function urlHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function ToolCallBlock({ tool }: { tool: ToolEvent }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    tool.status === 'running' ? '⏳' : tool.status === 'done' ? '✓' : '✗';

  const statusColor =
    tool.status === 'running'
      ? 'text-blue-400'
      : tool.status === 'done'
        ? 'text-emerald-400'
        : 'text-red-400';

  const sourceUrls = extractSourceUrls(tool.result);

  return (
    <div className={`py-1.5 px-3 rounded-lg border text-sm mb-1.5 ${
      isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-start gap-2">
        <span className={`${statusColor} mt-0.5 flex-shrink-0`}>{statusIcon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              {formatToolName(tool.tool)}
            </span>
            <span className={`text-xs truncate ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
              ({summarizeArgs(tool.args)})
            </span>
            {tool.duration != null && (
              <span className={`text-xs ml-auto flex-shrink-0 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
                {formatDuration(tool.duration)}
              </span>
            )}
          </div>
          {tool.status === 'running' && tool.progressMessage && (
            <p className={`text-xs mt-0.5 animate-pulse ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
              {tool.progressMessage}
            </p>
          )}
          {tool.status === 'error' && tool.error && (
            <p className="text-xs text-red-400/80 mt-0.5">{tool.error}</p>
          )}
        </div>
      </div>

      {/* Source URLs */}
      {sourceUrls.length > 0 && tool.status === 'done' && (
        <div className="mt-1.5 ml-6">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-xs flex items-center gap-1 transition-colors ${
              isDark ? 'text-zinc-500 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="inline-block w-3 text-center">{expanded ? '▼' : '▶'}</span>
            <span>🔗 {sourceUrls.length} source{sourceUrls.length > 1 ? 's' : ''}</span>
          </button>
          {expanded && (
            <div className="mt-1 ml-4 space-y-0.5">
              {sourceUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-blue-400 hover:text-blue-300 hover:underline truncate"
                  title={url}
                >
                  {urlHostname(url)}{url.split('/').slice(3).join('/') ? ' / ' + decodeURIComponent(url.split('/').slice(3).join('/').slice(0, 60)) : ''}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
