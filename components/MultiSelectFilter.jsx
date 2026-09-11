import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export default function MultiSelectFilter({ label, options, selected, onChange, labelFor }) {
  const displayLabel = labelFor || ((v) => v);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery(''); }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  if (!options.length) return null;

  const filteredOptions = options.filter((o) => displayLabel(o).toLowerCase().includes(query.toLowerCase()));
  const allSelected = selected.size === options.length;
  const activeCount = selected.size;

  function toggle(val) {
    const next = new Set(selected);
    if (next.has(val)) next.delete(val); else next.add(val);
    onChange(next);
  }

  return (
    <div className="slicer" ref={ref}>
      <button type="button" className={'slicer-trigger' + (!allSelected ? ' active' : '')} onClick={() => setOpen((o) => !o)}>
        {label}
        {!allSelected && <span className="slicer-count">{activeCount}</span>}
        <ChevronDown size={13} strokeWidth={2.2} />
      </button>
      {open && (
        <div className="slicer-panel">
          <div className="slicer-search">
            <Search size={13} strokeWidth={2} />
            <input autoFocus type="text" placeholder="Axtar..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="slicer-actions">
            <button type="button" onClick={() => onChange(new Set(options))}>Hamısını seç</button>
            <button type="button" onClick={() => onChange(new Set())}>Təmizlə</button>
          </div>
          <div className="slicer-options">
            {filteredOptions.length === 0 && <div className="slicer-empty">Nəticə yoxdur</div>}
            {filteredOptions.map((o) => (
              <label key={o} className="slicer-option">
                <input type="checkbox" checked={selected.has(o)} onChange={() => toggle(o)} />
                <span>{displayLabel(o)}</span>
                {selected.has(o) && <Check size={13} strokeWidth={2.6} className="slicer-check" />}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
