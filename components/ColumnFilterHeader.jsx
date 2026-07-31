import { useState, useRef, useEffect } from 'react';

export default function ColumnFilterHeader({ label, values, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const isFiltered = selected && selected.size > 0 && selected.size < values.length;
  const filteredValues = values.filter(v => v.toLowerCase().includes(search.toLowerCase()));

  function toggleValue(v) {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v); else next.add(v);
    onChange(next);
  }

  function selectAll() {
    onChange(new Set(values));
  }
  function clearAll() {
    onChange(new Set());
  }

  return (
    <th style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{label}</span>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px',
            color: isFiltered ? '#2563eb' : '#94a3b8', fontSize: 11, lineHeight: 1,
          }}
          title="Filtrlə"
        >
          ▼
        </button>
      </div>
      {open && (
        <div ref={ref} style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 30,
          background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8,
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)', padding: 10, width: 220,
          fontWeight: 400, textTransform: 'none',
        }}>
          <input
            type="text" placeholder="Axtar..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', marginBottom: 8, fontSize: 12.5 }}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 11.5 }}>
            <button onClick={selectAll} style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', padding: 0 }}>Hamısını seç</button>
            <button onClick={clearAll} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}>Təmizlə</button>
          </div>
          <div style={{ maxHeight: 220, overflow: 'auto' }}>
            {filteredValues.map(v => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '3px 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.has(v)} onChange={() => toggleValue(v)} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
              </label>
            ))}
            {filteredValues.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8', padding: '6px 0' }}>Tapılmadı</div>}
          </div>
        </div>
      )}
    </th>
  );
}
