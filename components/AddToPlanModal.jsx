import { useState } from 'react';
import { ListPlus } from 'lucide-react';
import { sb } from '../lib/supabase';
import { computeBudgetStatus } from '../lib/helpers';

const COMP_CAT_OPTIONS = ['Hard Skills', 'Soft Skills'];

export default function AddToPlanModal({ request, planYear, onClose, onSubmitted }) {
  const [vendor, setVendor] = useState('');
  const [manHours, setManHours] = useState(0);
  const [budget, setBudget] = useState(0);
  const [usedBudget, setUsedBudget] = useState(0);
  const [category, setCategory] = useState('');
  const [compCat, setCompCat] = useState(request.comp_cat || '');
  const [transformationArea, setTransformationArea] = useState('');
  const [learningMethod, setLearningMethod] = useState('');
  const [activityDuration, setActivityDuration] = useState('');
  const [needReason, setNeedReason] = useState(request.reason || '');
  const [learningGoal, setLearningGoal] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const budgetStatus = computeBudgetStatus();

  async function handleSubmit() {
    setSaving(true);
    setError('');
    const trainingPayload = {
      dept: request.dept, sube: request.sube || null, employee_name: request.employee_name,
      position: request.position || null, skill: request.training_title,
      comp_cat: compCat || null, vendor: vendor.trim() || null,
      man_hours: Number(manHours) || 0, budget: Number(budget) || 0, used_budget: Number(usedBudget) || 0,
      status: 'Scheduled to Commence on Planned Date',
      plan_year: planYear || new Date().getFullYear(),
      start_date: request.preferred_start || null, end_date: request.preferred_end || null,
      importance_level: request.importance_level || null,
      current_skill_level: request.current_skill_level || null,
      required_skill_level: request.required_skill_level || null,
      priority: request.priority, category: category || null, budget_status: budgetStatus,
      transformation_area: transformationArea.trim() || null,
      learning_method: learningMethod.trim() || null,
      activity_duration: activityDuration.trim() || null,
      need_reason: needReason.trim() || null,
      learning_goal: learningGoal.trim() || null,
    };
    const { data, error: err } = await sb.from('trainings').insert(trainingPayload).select().single();
    if (err) { setError('Xəta: ' + err.message); setSaving(false); return; }
    await sb.from('training_requests').update({ linked_training_id: data.id }).eq('id', request.id);
    setSaving(false);
    onSubmitted();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: 540, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-title" style={{ marginBottom: 6 }}>İllik Plana (TNA) Əlavə Et</div>
        <div className="section-sub" style={{ marginBottom: 16 }}>
          {request.employee_name} — {request.dept}{request.sube ? ' / ' + request.sube : ''} — <b>{request.training_title}</b>
        </div>

        <div className={'notice ' + (budgetStatus === 'Büdcədən kənar' ? 'notice-warning' : 'notice-success')} style={{ marginBottom: 14 }}>
          {budgetStatus === 'Büdcədən kənar' ? (
            <>Bu təlim illik büdcə planlaşdırma dövründən (Oktyabr–Yanvar) kənarda təsdiqlənir, ona görə <b>&quot;Büdcədən kənar&quot;</b> kateqoriyasında qeyd olunacaq. Əvvəlcədən planlaşdırılmış büdcəyə daxil olmadığı üçün <b>təsdiq ehtimalı aşağıdır</b> və əlavə təsdiq tələb oluna bilər.</>
          ) : (
            <>İllik büdcə planlaşdırma dövründə əlavə olunur — <b>&quot;Büdcələnmiş&quot;</b> kateqoriyasında qeyd olunacaq.</>
          )}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Vendor</label>
          <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Man Hours</label>
            <input type="number" value={manHours} onChange={(e) => setManHours(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Planlanmış Büdcə (₼)</label>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>İstifadə olunmuş Büdcə (₼)</label>
            <input type="number" value={usedBudget} onChange={(e) => setUsedBudget(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Vəzifə Kateqoriyası</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
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
          <div style={{ flex: 1 }}>
            <label>Səriştə kateqoriyası (bacarıq/bilik/səriştə)</label>
            <select value={compCat} onChange={(e) => setCompCat(e.target.value)}>
              <option value="">— Seçilməyib —</option>
              {COMP_CAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Transformation Capability Area</label>
          <input type="text" value={transformationArea} onChange={(e) => setTransformationArea(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Öyrənmə metodu</label>
            <input type="text" value={learningMethod} onChange={(e) => setLearningMethod(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Təlim/İnkişaf Aktivliyinin Müddəti</label>
            <input type="text" value={activityDuration} onChange={(e) => setActivityDuration(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Təlim və inkişaf ehtiyacının yaranma səbəbi</label>
          <textarea rows={2} value={needReason} onChange={(e) => setNeedReason(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label>Öyrənmə Məqsədi</label>
          <textarea rows={2} value={learningGoal} onChange={(e) => setLearningGoal(e.target.value)} />
        </div>
        {error && <div className="notice notice-error" style={{ marginBottom: 10 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Ləğv et</button>
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
            <ListPlus size={14} strokeWidth={2.2} /> {saving ? 'Əlavə olunur...' : 'Plana Əlavə Et'}
          </button>
        </div>
      </div>
    </div>
  );
}
