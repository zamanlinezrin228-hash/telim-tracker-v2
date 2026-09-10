import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, children }) {
  return (
    <div className="empty-state">
      <Icon size={22} strokeWidth={1.5} className="empty-state-icon" />
      <div>{children}</div>
    </div>
  );
}
