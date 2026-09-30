import { useEffect, useState, useId } from 'react';
import { sb } from './supabase';

// ---------------------------------------------------------------------------
// Bütün formalarda EYNİ seçim siyahıları — İllik TNA, sorğu, Plana Əlavə Et,
// İzləmə Cədvəli redaktəsi. Bir yerdə saxlanılır ki, fərqli yazılış yaranmasın.
// ---------------------------------------------------------------------------
export const LEARNING_METHOD_OPTIONS = [
  '1 – Təlim', '3 – İş Yerində Öyrənmə', '6 – E-learning', '8 – Qarışıq Model', '9 – Seminar/Workshop',
];
export const ACTIVITY_DURATION_OPTIONS = [
  '1 – Qısa (1–3 gün)', '2 – Orta (1–4 həftə)', '3 – Uzun (1–3 ay)', '4 – İrəli (3–6 ay)', '5 – Strateji (6+ ay)',
];
export const NEED_REASON_OPTIONS = [
  '1 – Yeni rol', '2 – Performans boşluğu', '3 – Yeni texnologiya', '4 – Hüquqi tələblər',
  '5 – Strateji bacarıq', '6 – Karyera/varislik', '7 – Rəy/sorğu əsasında', '8 – Layihə/dəyişiklik',
];
export const TRANSFORMATION_AREA_OPTIONS = ['Yes', 'No'];
export const COMP_CAT_OPTIONS = ['Hard Skills', 'Soft Skills'];

// Mətnləri müqayisə üçün normallaşdırır (böyük/kiçik hərf, boşluq, İ/I/ı).
export function normKey(s) {
  return String(s ?? '')
    .replace(/İ/g, 'i').replace(/I/g, 'ı')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Avtomatik təkliflər: ad, departament, şöbə, vəzifə, vendor, təlim adı.
// Bir dəfə yüklənir (get_value_options / get_people_options RPC-ləri),
// bütün formalar paylaşır. RPC hələ yoxdursa, boş siyahı ilə işləyir.
// ---------------------------------------------------------------------------
let cache = null;
let inflight = null;
const listeners = new Set();

async function loadOptions() {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const out = { dept: [], sube: [], position: [], vendor: [], skill: [], people: [] };
    const [vals, people] = await Promise.all([
      sb.rpc('get_value_options'),
      sb.rpc('get_people_options'),
    ]);
    if (!vals.error && Array.isArray(vals.data)) {
      vals.data.forEach((r) => { if (out[r.kind] && r.value) out[r.kind].push(r.value); });
    }
    if (!people.error && Array.isArray(people.data)) out.people = people.data;
    Object.keys(out).forEach((k) => {
      if (k !== 'people') out[k] = [...new Set(out[k])].sort((a, b) => a.localeCompare(b, 'az'));
    });
    cache = out;
    inflight = null;
    listeners.forEach((fn) => fn(out));
    return out;
  })();
  return inflight;
}

// Yeni sətir / dəyişiklikdən sonra siyahıları yeniləmək üçün
export function refreshValueOptions() {
  cache = null;
  return loadOptions();
}

export function useValueOptions() {
  const [opts, setOpts] = useState(cache || { dept: [], sube: [], position: [], vendor: [], skill: [], people: [] });
  useEffect(() => {
    listeners.add(setOpts);
    loadOptions().then(setOpts).catch(() => {});
    return () => listeners.delete(setOpts);
  }, []);
  return opts;
}

// Siyahıda eyni yazılışı tapır (məs. "hüquq şöbəsi" → "Hüquq şöbəsi").
export function canonicalFrom(list, value) {
  const k = normKey(value);
  if (!k) return value;
  return list.find((o) => normKey(o) === k) ?? value;
}

// Mətn sahəsi + təklif siyahısı. Bir neçə hərf yazanda uyğun variantlar çıxır;
// sahədən çıxanda böyük/kiçik hərf fərqi olan yazılış avtomatik olaraq
// sistemdəki düzgün variantla əvəz olunur. Siyahıda olmayan yeni dəyər də
// yazmaq olar (məcburi deyil).
export function SuggestInput({ value, onChange, options = [], placeholder, style, className, onPick, disabled, ...rest }) {
  const id = useId().replace(/:/g, '');
  return (
    <>
      <input
        type="text"
        value={value ?? ''}
        list={`sg-${id}`}
        autoComplete="off"
        placeholder={placeholder}
        style={style}
        className={className}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          const exact = options.find((o) => o === e.target.value);
          if (exact && onPick) onPick(exact);
        }}
        onBlur={(e) => {
          const canon = canonicalFrom(options, e.target.value);
          if (canon !== e.target.value) {
            onChange(canon);
            if (onPick) onPick(canon);
          }
        }}
        {...rest}
      />
      <datalist id={`sg-${id}`}>
        {options.slice(0, 400).map((o) => <option key={o} value={o} />)}
      </datalist>
    </>
  );
}

// Sabit siyahılı seçim: mövcud dəyər siyahıda yoxdursa (köhnə data), itməsin
// deyə o da seçim kimi göstərilir.
export function OptionSelect({ value, onChange, options, placeholder = '— Seçin —', style, disabled }) {
  const extra = value && !options.includes(value) ? [value] : [];
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} style={style} disabled={disabled}>
      <option value="">{placeholder}</option>
      {[...extra, ...options].map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
