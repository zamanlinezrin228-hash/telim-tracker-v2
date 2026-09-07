import { useState, useRef, useEffect } from 'react';

export default function ColumnFilterHeader({ label, values, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(selected);
  const ref = useRef(null);

  useEffect(() => {
    if (open) setDraft(new Set(selected));
  }, [open, selected]);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const isFiltered = selected && selected.size > 0 && selected.size < values.length;
  const filteredValues = values.filter((v) => v.toLowerCase().includes(search.toLowerCase()));

  function toggleValue(v) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v); else next.add(v);
      return next;
    });
  }
  function selectAll() { setDraft(new Set(values)); }
  function selectNone() { setDraft(new Set()); }
  function apply() { onChange(draft); setOpen(false); }
  function cancel() { setOpen(false); }

  return (
    <th style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{label}</span>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', color: isFiltered ? '#2563eb' : '#94a3b8', fontSize: 11, lineHeight: 1 }}
          title="Filtrlə"
        >
          ▼
        </button>
      </div>
      {open && (
        <div ref={ref} style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 30,
          background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8,
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)', padding: 10, width: 230,
          fontWeight: 400, textTransform: 'none',
        }}>
          <input type="text" placeholder="Axtar..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', marginBottom: 8, fontSize: 12.5 }} />
          <div style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 11.5 }}>
            <button onClick={selectAll} style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', padding: 0 }}>Hamısını seç</button>
            <button onClick={selectNone} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}>Heç birini seçmə</button>
          </div>
          <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 10, borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '4px 0' }}>
            {filteredValues.map((v) => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '3px 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={draft.has(v)} onChange={() => toggleValue(v)} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
              </label>
            ))}
            {filteredValues.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8', padding: '6px 0' }}>Tapılmadı</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={cancel} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 12 }}>Ləğv et</button>
            <button onClick={apply} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', background: '#0b2545', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Tətbiq et</button>
          </div>
        </div>
      )}
    </th>
  );
}
