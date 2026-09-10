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
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', color: isFiltered ? 'var(--blue)' : 'var(--ink-400)', fontSize: 11, lineHeight: 1 }}
          title="Filtrlə"
        >
          ▼
        </button>
      </div>
      {open && (
        <div ref={ref} style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 30,
          background: 'var(--surface)', border: '1px solid var(--ink-300)', borderRadius: 10,
          boxShadow: 'var(--shadow-lg)', padding: 10, width: 230,
          fontWeight: 400, textTransform: 'none',
        }}>
          <input type="text" placeholder="Axtar..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 8, fontSize: 12.5 }} />
          <div style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 11.5 }}>
            <button onClick={selectAll} className="btn-ghost" style={{ padding: 0 }}>Hamısını seç</button>
            <button onClick={selectNone} style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', padding: 0, fontSize: 11.5 }}>Heç birini seçmə</button>
          </div>
          <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 10, borderTop: '1px solid var(--ink-100)', borderBottom: '1px solid var(--ink-100)', padding: '4px 0' }}>
            {filteredValues.map((v) => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '3px 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={draft.has(v)} onChange={() => toggleValue(v)} style={{ width: 'auto' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
              </label>
            ))}
            {filteredValues.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-400)', padding: '6px 0' }}>Tapılmadı</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={cancel} className="btn btn-outline btn-sm" style={{ flex: 1 }}>Ləğv et</button>
            <button onClick={apply} className="btn btn-primary btn-sm" style={{ flex: 1 }}>Tətbiq et</button>
          </div>
        </div>
      )}
    </th>
  );
}
