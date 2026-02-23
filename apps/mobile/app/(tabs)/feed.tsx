import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { colors, fonts, spacing, visibilityColors } from "@/lib/theme";
import type { TagValue } from "@stash/api-client";

interface FeedSpot {
  id: string;
  name: string;
  description: string | null;
  visibility: "private" | "group" | "public";
  tags: TagValue[];
  created_at: number;
}

export default function FeedScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [spots, setSpots] = useState<FeedSpot[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSpots = useCallback(async () => {
    try {
      const token = await getToken();
      const API_URL =
        process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";
      const res = await fetch(`${API_URL}/api/v1/spots`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSpots(data.spots ?? []);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSpots();
    setRefreshing(false);
  }, [fetchSpots]);

  const renderSpot = ({ item }: { item: FeedSpot }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={() => router.push(`/spot/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.spotName}>{item.name}</Text>
        <View
          style={[
            styles.visibilityBadge,
            { backgroundColor: visibilityColors[item.visibility] },
          ]}
        >
          <Text style={styles.visibilityText}>
            {item.visibility.toUpperCase()}
          </Text>
        </View>
      </View>
      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      {item.tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {item.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={spots}
        keyExtractor={(item) => item.id}
        renderItem={renderSpot}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No spots yet. Go find some!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 2,
    borderColor: colors.dark,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.dark,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    shadowOffset: { width: 1, height: 1 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  spotName: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark,
    letterSpacing: 1,
    flex: 1,
  },
  visibilityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.dark,
  },
  visibilityText: {
    fontFamily: fonts.heading,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 1,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.dark,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.mutedText,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
