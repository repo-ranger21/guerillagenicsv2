import { Search } from 'lucide-react';
import { useState } from 'react';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  showShortcut?: boolean;
  className?: string;
}

export function SearchBar({
  placeholder = 'Search teams, players, futures...',
  onSearch,
  showShortcut = true,
  className = '',
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          flex items-center gap-3 px-4 py-2.5 bg-bg-surface border
          ${isFocused ? 'border-border-active' : 'border-border-default'}
          transition-colors
        `}
      >
        <Search size={16} className="text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent font-mono text-[11px] text-text-primary placeholder:text-text-muted outline-none"
        />
        {showShortcut && !isFocused && !query && (
          <div className="label-xs text-text-muted">⌘K</div>
        )}
      </div>
    </div>
  );
}
