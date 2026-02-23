import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { colors, fonts, spacing, visibilityColors } from "@/lib/theme";
import type { TagValue } from "@stash/api-client";

interface SpotDetail {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  visibility: "private" | "group" | "public";
  created_by: string;
  tags: TagValue[];
  created_at: number;
}

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const API_URL =
          process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";
        const res = await fetch(`${API_URL}/api/v1/spots/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setSpot(await res.json());
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    })();
  }, [id, getToken]);

  const handleDelete = async () => {
    Alert.alert("Delete Spot", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const token = await getToken();
          const API_URL =
            process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";
          await fetch(`${API_URL}/api/v1/spots/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  if (!spot) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Spot not found</Text>
      </View>
    );
  }

  const isOwner = spot.created_by === userId;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{spot.name}</Text>
        <View
          style={[
            styles.visibilityBadge,
            { backgroundColor: visibilityColors[spot.visibility] },
          ]}
        >
          <Text style={styles.visibilityText}>
            {spot.visibility.toUpperCase()}
          </Text>
        </View>
      </View>

      {spot.description ? (
        <Text style={styles.description}>{spot.description}</Text>
      ) : null}

      <View style={styles.coordsRow}>
        <Text style={styles.coords}>
          {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
        </Text>
      </View>

      {spot.tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {spot.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.date}>
        Added {new Date(spot.created_at * 1000).toLocaleDateString()}
      </Text>

      {isOwner ? (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
            ]}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>DELETE SPOT</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  loading: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.mutedText,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: colors.dark,
    letterSpacing: 2,
    flex: 1,
  },
  visibilityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.dark,
  },
  visibilityText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.white,
    letterSpacing: 1,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  coordsRow: {
    marginBottom: spacing.md,
  },
  coords: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedText,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.dark,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedText,
    marginBottom: spacing.xl,
  },
  actions: {
    marginTop: spacing.md,
  },
  deleteButton: {
    backgroundColor: colors.dark,
    borderWidth: 3,
    borderColor: colors.primary,
    padding: spacing.md,
    alignItems: "center",
    shadowColor: colors.dark,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  deleteButtonPressed: {
    transform: [{ scale: 0.97 }],
    shadowOffset: { width: 1, height: 1 },
  },
  deleteButtonText: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.primary,
    letterSpacing: 2,
  },
});
