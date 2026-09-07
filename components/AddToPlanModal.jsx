import { useState } from 'react';
import { sb } from '../lib/supabase';
import { computeBudgetStatus } from '../lib/helpers';

export default function AddToPlanModal({ request, planYear, onClose, onSubmitted }) {
  const [vendor, setVendor] = useState('');
  const [manHours, setManHours] = useState(0);
  const [budget, setBudget] = useState(0);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const budgetStatus = computeBudgetStatus();

  async function handleSubmit() {
    setSaving(true);
    setError('');
    const trainingPayload = {
      dept: request.dept, sube: request.sube || null, employee_name: request.employee_name,
      position: request.position || null, skill: request.training_title,
      comp_cat: request.comp_cat || null, vendor: vendor.trim() || null,
      man_hours: Number(manHours) || 0, budget: Number(budget) || 0,
      status: 'Scheduled to Commence on Planned Date',
      plan_year: planYear || new Date().getFullYear(),
      start_date: request.preferred_start || null, end_date: request.preferred_end || null,
      importance_level: request.importance_level || null,
      current_skill_level: request.current_skill_level || null,
      required_skill_level: request.required_skill_level || null,
      priority: request.priority, category: category || null, budget_status: budgetStatus,
    };
    const { data, error: err } = await sb.from('trainings').insert(trainingPayload).select().single();
    if (err) { setError('Xəta: ' + err.message); setSaving(false); return; }
    await sb.from('training_requests').update({ linked_training_id: data.id }).eq('id', request.id);
    setSaving(false);
    onSubmitted();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: 460 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>İllik Plana (TNA) Əlavə Et</div>
        <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 16 }}>
          {request.employee_name} — {request.dept}{request.sube ? ' / ' + request.sube : ''} — <b>{request.training_title}</b>
        </div>

        {budgetStatus === 'Büdcədən kənar' ? (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: 12.5, padding: '10px 12px', borderRadius: 8, marginBottom: 14 }}>
            Bu təlim illik büdcə planlaşdırma dövründən (Oktyabr–Yanvar) kənarda təsdiqlənir, ona görə <b>&quot;Büdcədən kənar&quot;</b> kateqoriyasında qeyd olunacaq. Əvvəlcədən planlaşdırılmış büdcəyə daxil olmadığı üçün <b>təsdiq ehtimalı aşağıdır</b> və əlavə təsdiq tələb oluna bilər.
          </div>
        ) : (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 12.5, padding: '10px 12px', borderRadius: 8, marginBottom: 14 }}>
            İllik büdcə planlaşdırma dövründə əlavə olunur — <b>&quot;Büdcələnmiş&quot;</b> kateqoriyasında qeyd olunacaq.
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Vendor</label>
          <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, color: '#64748b' }}>Man Hours</label>
            <input type="number" value={manHours} onChange={(e) => setManHours(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, color: '#64748b' }}>Büdcə (₼)</label>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12.5, color: '#64748b' }}>Vəzifə Kateqoriyası</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%' }}>
            <option value="">— Seçilməyib —</option>
            <option value="Support Staff">Support Staff</option>
            <option value="Junior Specialist">Junior Specialist</option>
            <option value="Specialist">Specialist</option>
            <option value="Senior Specialist">Senior Specialist</option>
            <option value="Leading Specialist">Leading Specialist</option>
            <option value="Manager">Manager</option>
            <option value="Middle Manager">Middle Manager</option>
            <option value="Senior Manager">Senior Manager</option>
          </select>
        </div>
        {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Ləğv et</button>
          <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#0b2545', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            {saving ? 'Əlavə olunur...' : 'Plana Əlavə Et'}
          </button>
        </div>
      </div>
    </div>
  );
}
