import { useState } from 'react';
import {
  SuggestInput, OptionSelect, useValueOptions, refreshValueOptions,
  LEARNING_METHOD_OPTIONS, ACTIVITY_DURATION_OPTIONS, NEED_REASON_OPTIONS, TRANSFORMATION_AREA_OPTIONS,
} from '../lib/options';
import { ListPlus } from 'lucide-react';
import { sb } from '../lib/supabase';
import { computeBudgetStatus, computeGapMetrics } from '../lib/helpers';
import { showToast } from '../lib/toast';

const COMP_CAT_OPTIONS = ['Hard Skills', 'Soft Skills'];

export default function AddToPlanModal({ request, planYear, onClose, onSubmitted }) {
  // A manager filling out the Annual TNA row now captures most of this detail
  // upfront (see AnnualTnaForm.jsx) — pre-fill from it wherever present so
  // L&D doesn't have to retype it, while still leaving every field editable.
  const [vendor, setVendor] = useState(request.vendor || '');
  const [manHours, setManHours] = useState(request.man_hours ?? 0);
  const [budget, setBudget] = useState(request.budget ?? 0);
  // Boş = hələ xərclənməyib. 0 yazılsa, təlim "tam qənaət" kimi sayılardı.
  const [usedBudget, setUsedBudget] = useState('');
  const valueOpts = useValueOptions();
  const [category, setCategory] = useState('');
  const [compCat, setCompCat] = useState(request.comp_cat || '');
  const [transformationArea, setTransformationArea] = useState(request.transformation_area || '');
  const [learningMethod, setLearningMethod] = useState(request.learning_method || '');
  const [activityDuration, setActivityDuration] = useState(request.activity_duration || '');
  const [needReason, setNeedReason] = useState(request.reason || '');
  const [learningGoal, setLearningGoal] = useState(request.learning_goal || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const budgetStatus = computeBudgetStatus();

  async function handleSubmit() {
    setSaving(true);
    setError('');
    // training_requests has no weighted_gap/cgi/cgi_priority_full columns
    // (see lib/helpers.js's computeGapMetrics) — this is the first point
    // those derived fields ever get computed and stored, from whichever
    // of the three source levels the request carries. priority here is
    // the CGI-derived one (matches what the rest of İzləmə Cədvəli means
    // by "priority"), not request.priority — that field is the requester's
    // own manually-set urgency at submission time, a different concept.
    const gap = computeGapMetrics(request.current_skill_level, request.required_skill_level, request.importance_level);
    const trainingPayload = {
      employee_id: request.employee_id || null,
      dept: request.dept || request.sube, sube: request.sube || null, employee_name: request.employee_name,
      position: request.position || null, skill: request.training_title,
      competency: request.competency || null,
      comp_cat: compCat || null, vendor: vendor.trim() || null,
      man_hours: Number(manHours) || 0, budget: Number(budget) || 0, used_budget: usedBudget === '' || usedBudget === null ? null : Number(usedBudget),
      status: 'Scheduled to Commence on Planned Date',
      plan_year: planYear || new Date().getFullYear(),
      start_date: request.preferred_start || null, end_date: request.preferred_end || null,
      importance_level: request.importance_level || null,
      current_skill_level: request.current_skill_level || null,
      required_skill_level: request.required_skill_level || null,
      weighted_gap: gap.weighted_gap, cgi: gap.cgi, cgi_priority_full: gap.cgi_priority_full,
      priority: gap.priority ?? request.priority,
      category: category || null, budget_status: budgetStatus,
      transformation_area: transformationArea.trim() || null,
      learning_method: learningMethod.trim() || null,
      activity_duration: activityDuration.trim() || null,
      need_reason: needReason.trim() || null,
      learning_goal: learningGoal.trim() || null,
    };
    const { data, error: err } = await sb.from('trainings').insert(trainingPayload).select().single();
    if (err) { setError('Xəta: ' + err.message); setSaving(false); return; }
    const { error: linkErr } = await sb.from('training_requests').update({ linked_training_id: data.id }).eq('id', request.id);
    setSaving(false);
    // The training row already exists at this point — say so rather than
    // letting the request look un-added and invite a duplicate insert.
    if (linkErr) showToast(`Təlim plana əlavə edildi (#${data.id}), amma sorğu ilə əlaqələndirilmədi: ${linkErr.message}`, 'error');
    refreshValueOptions();
    onSubmitted();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: 540, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-title" style={{ marginBottom: 6 }}>İllik Plana (TNA) Əlavə Et</div>
        <div className="section-sub" style={{ marginBottom: 16 }}>
          {request.employee_name} — {request.dept}{request.sube ? ' / ' + request.sube : ''} — <b>{request.training_title}</b>
        </div>

        <div className="notice note-red" style={{ marginBottom: 14 }}>
          {budgetStatus === 'Büdcədən kənar' ? (
            <>Bu təlim illik büdcə planlaşdırma dövründən (Oktyabr–Yanvar) kənarda təsdiqlənir, ona görə <b>&quot;Büdcədən kənar&quot;</b> kateqoriyasında qeyd olunacaq. Əvvəlcədən planlaşdırılmış büdcəyə daxil olmadığı üçün <b>təsdiq ehtimalı aşağıdır</b> və əlavə təsdiq tələb oluna bilər.</>
          ) : (
            <>İllik büdcə planlaşdırma dövründə əlavə olunur — <b>&quot;Büdcələnmiş&quot;</b> kateqoriyasında qeyd olunacaq.</>
          )}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Vendor</label>
          <SuggestInput value={vendor} onChange={setVendor} options={valueOpts.vendor} />
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
            <input type="number" value={usedBudget} placeholder="Təlim keçiriləndə" onChange={(e) => setUsedBudget(e.target.value)} />
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
          <OptionSelect value={transformationArea} onChange={setTransformationArea} options={TRANSFORMATION_AREA_OPTIONS} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Öyrənmə metodu</label>
            <OptionSelect value={learningMethod} onChange={setLearningMethod} options={LEARNING_METHOD_OPTIONS} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Təlim/İnkişaf Aktivliyinin Müddəti</label>
            <OptionSelect value={activityDuration} onChange={setActivityDuration} options={ACTIVITY_DURATION_OPTIONS} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Təlim və inkişaf ehtiyacının yaranma səbəbi</label>
          <OptionSelect value={needReason} onChange={setNeedReason} options={NEED_REASON_OPTIONS} />
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
