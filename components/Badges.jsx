import { Clock, Search, CheckCircle2, XCircle, RefreshCw, PauseCircle, CalendarClock, AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { statusMeta, priorityMeta, reqStatusMeta } from '../lib/helpers';

const TRAINING_STATUS_ICONS = {
  'Scheduled to Commence on Planned Date': CalendarClock,
  'In Progress': RefreshCw,
  'Postponed': PauseCircle,
  'Completed': CheckCircle2,
  'Canceled': XCircle,
};

const REQ_STATUS_ICONS = {
  'Pending Manager Review': Clock,
  'Pending': Clock,
  'In Review': Search,
  'Approved': CheckCircle2,
  'Rejected': XCircle,
};

const PRIORITY_ICONS = { Critical: AlertTriangle, High: ArrowUp, Medium: Minus, Low: ArrowDown };

function BadgeBase({ Icon, color, label }) {
  return (
    <span className="badge" style={{ background: color }}>
      {Icon && <Icon size={12} strokeWidth={2.5} className="badge-icon" />}
      {label}
    </span>
  );
}

export function TrainingStatusBadge({ status }) {
  const m = statusMeta(status);
  return <BadgeBase Icon={TRAINING_STATUS_ICONS[status]} color={m.color} label={m.label} />;
}

export function ReqStatusBadge({ status }) {
  const m = reqStatusMeta(status);
  return <BadgeBase Icon={REQ_STATUS_ICONS[status]} color={m.color} label={m.label} />;
}

export function PriorityBadge({ priority }) {
  const m = priorityMeta(priority);
  return <BadgeBase Icon={PRIORITY_ICONS[priority]} color={m.color} label={m.label} />;
}

export function BudgetStatusBadge({ status }) {
  const ok = status === 'Büdcələnmiş';
  return <BadgeBase Icon={ok ? CheckCircle2 : AlertTriangle} color={ok ? 'var(--green)' : 'var(--red)'} label={status} />;
}
