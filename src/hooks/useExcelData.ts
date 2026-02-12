import { useState, useEffect } from 'react';
import { loadExcelData, type DashboardData } from '@/data/excelData';

export function useExcelData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExcelData()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  return { data, loading, error };
}
