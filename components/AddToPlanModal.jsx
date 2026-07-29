import { useState } from 'react';
import { sb } from '../lib/supabase';
import { computeBudgetStatus } from '../lib/helpers';

const CATEGORY_OPTIONS = [
  'Support Staff', 'Junior Specialist', 'Specialist', 'Senior Specialist',
  'Leading Specialist', 'Manager', 'Middle Manager', 'Senior Manager',
];

export default function AddToPlanModal({ request, onClose, onDone }) {
  const [vendor, setVendor] = useState('');
  const [manHours, setManHours] = useState(0);
  const [budget, setBudget] = useState(0);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const budgetStatus = computeBudgetStatus();

  async function handleSubmit() {
    const trainingPayload = {
      dept: request.dept, employee_name: request.employee_name, position: request.position || null,
      skill: request.training_title, comp_cat: request.comp_cat || null,
      vendor: vendor.trim() || null,
      man_hours: Number(manHours) || 0,
      budget: Number(budget) || 0,
      status: 'Scheduled to Commence on Planned Date',
      start_date: request.preferred_start || null,
      end_date: request.preferred_end || null,
      importance_level: request.importance_level || null,
      current_skill_level: request.current_skill_level || null,
      required_skill_level: request.required_skill_level || null,
      priority: request.priority,
      category: category || null,
      budget_status: budgetStatus,
    };
    const { data, error } = await sb.from('trainings').insert(trainingPayload).select().single();
    if (error) { setError('Xəta: ' + error.message); return; }
    await sb.from('training_requests').update({ linked_training_id: data.id }).eq('id', request.id);
    onDone();
  }

  return (
    <div className="modal-overlay">
      <div className="card modal-card" style={{ width: 460 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>İllik Plana (TNA) Əlavə Et</div>
        <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 16 }}>
          {request.employee_name} — {request.dept}{request.sube ? ' / ' + request.sube : ''} — <b>{request.training_title}</b>
        </div>

        {budgetStatus === 'Büdcədən kənar' ? (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: 12.5, padding: '10px 12px', borderRadius: 8, marginBottom: 14 }}>
            Bu təlim illik büdcə planlaşdırma dövründən (Oktyabr–Yanvar) kənarda təsdiqlənir, ona görə <b>&quot;Büdcədən kənar&quot;</b> kateqoriyasında qeyd olunacaq. Əvvəlcədən planlaşdırılmış büdcəyə daxil olmadığı üçün əlavə təsdiq tələb oluna bilər.
          </div>
        ) : (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 12.5, padding: '10px 12px', borderRadius: 8, marginBottom: 14 }}>
            İllik büdcə planlaşdırma dövründə əlavə olunur — <b>&quot;Büdcələnmiş&quot;</b> kateqoriyasında qeyd olunacaq.
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Vendor</label>
          <input type="text" style={{ width: '100%' }} value={vendor} onChange={e => setVendor(e.target.value)} />
        </div>
        <div style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, color: '#64748b' }}>Man Hours</label>
            <input type="number" style={{ width: '100%' }} value={manHours} onChange={e => setManHours(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, color: '#64748b' }}>Büdcə (₼)</label>
            <input type="number" style={{ width: '100%' }} value={budget} onChange={e => setBudget(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Vəzifə Kateqoriyası</label>
          <select style={{ width: '100%' }} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">— Seçilməyib —</option>
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Ləğv et</button>
          <button onClick={handleSubmit} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#0b2545', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Plana Əlavə Et</button>
        </div>
      </div>
    </div>
  );
}
