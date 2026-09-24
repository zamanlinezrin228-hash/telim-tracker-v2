import { Check, X, Clock } from 'lucide-react';
import { deriveApprovalStage } from '../lib/helpers';

// Visual multi-step indicator for a single request's approval chain
// (Göndərildi → Rəhbər təsdiqi → L&D baxışı → Nəticə), used wherever a
// req-card shows a request's full detail — this app has no separate
// single-request detail page, so the req-card itself is that detail view.
export default function ApprovalStepper({ request, profile, team }) {
  const { steps } = deriveApprovalStage(request, { profile, team });

  return (
    <div className="approval-stepper">
      {steps.map((s, i) => (
        <div className="approval-step" key={s.key}>
          <div className="approval-step-row">
            <div className={'approval-step-dot approval-step-dot-' + s.state}>
              {s.state === 'done' && <Check size={11} strokeWidth={3} />}
              {s.state === 'rejected' && <X size={11} strokeWidth={3} />}
              {s.state === 'current' && <Clock size={10} strokeWidth={3} />}
            </div>
            {i < steps.length - 1 && (
              <div className={'approval-step-line approval-step-line-' + (steps[i].state === 'done' ? 'done' : (steps[i].state === 'rejected' || steps[i + 1].state === 'rejected') ? 'rejected' : 'pending')} />
            )}
          </div>
          <div className={'approval-step-label approval-step-label-' + s.state}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
