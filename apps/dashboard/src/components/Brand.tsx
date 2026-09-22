import { Activity } from 'lucide-react';

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-icon">
        <Activity size={20} />
      </span>
      DevPulse<span className="brand-dot">.</span>
    </span>
  );
}
