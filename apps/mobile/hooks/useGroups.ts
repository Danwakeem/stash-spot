import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-expo";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";

interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: number;
}

export function useGroups() {
  const { getToken } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGroups(data.groups ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch groups");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, loading, error, refetch: fetchGroups };
}
