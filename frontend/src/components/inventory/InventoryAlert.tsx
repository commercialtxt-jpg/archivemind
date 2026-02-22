import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { ApiResponse, InventoryItem } from '../../types';

interface AlertData {
  items: InventoryItem[];
  count: number;
}

export default function InventoryAlert() {
  const { data: alert } = useQuery({
    queryKey: ['inventory', 'alerts'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AlertData>>('/inventory/alerts');
      return data.data;
    },
  });

  if (!alert || alert.count === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-coral/8 border border-coral/20 rounded-xl text-[12px]">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-coral text-white text-[10px] font-bold flex-shrink-0">
        {alert.count}
      </span>
      <span className="text-coral-dark font-medium">
        {alert.count === 1 ? '1 item needs attention' : `${alert.count} items need attention`}
      </span>
      <div className="flex gap-1 ml-auto">
        {alert.items.slice(0, 3).map((item) => (
          <span key={item.id} className="text-sm" title={item.name}>
            {item.icon}
          </span>
        ))}
        {alert.count > 3 && (
          <span className="text-ink-muted text-[10px]">+{alert.count - 3}</span>
        )}
      </div>
    </div>
  );
}
