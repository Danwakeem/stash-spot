import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-expo";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";

interface Spot {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  visibility: "private" | "group" | "public";
  created_by: string;
  tags: string[];
  created_at: number;
}

export function useSpots(tagFilter?: string) {
  const { getToken } = useAuth();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const url = new URL(`${API_URL}/api/v1/spots`);
      if (tagFilter) url.searchParams.set("tag", tagFilter);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSpots(data.spots ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch spots");
    } finally {
      setLoading(false);
    }
  }, [getToken, tagFilter]);

  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  return { spots, loading, error, refetch: fetchSpots };
}
