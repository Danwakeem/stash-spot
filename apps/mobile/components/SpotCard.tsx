import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts, spacing, visibilityColors } from "@/lib/theme";

interface SpotCardProps {
  id: string;
  name: string;
  description: string | null;
  visibility: "private" | "group" | "public";
  tags: string[];
}

export function SpotCard({ id, name, description, visibility, tags }: SpotCardProps) {
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/spot/${id}`)}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: visibilityColors[visibility] },
          ]}
        >
          <Text style={styles.badgeText}>{visibility.toUpperCase()}</Text>
        </View>
      </View>

      {description ? (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      ) : null}

      {tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark,
    letterSpacing: 1,
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.dark,
  },
  badgeText: {
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
});
