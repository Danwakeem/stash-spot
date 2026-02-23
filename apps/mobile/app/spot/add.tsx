import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useAuth } from "@clerk/clerk-expo";
import { colors, fonts, spacing } from "@/lib/theme";
import { VALID_TAGS, type TagValue } from "@stash/api-client";

const VISIBILITY_OPTIONS = ["private", "group", "public"] as const;

export default function AddSpotScreen() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [visibility, setVisibility] =
    useState<(typeof VISIBILITY_OPTIONS)[number]>("private");
  const [selectedTags, setSelectedTags] = useState<TagValue[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Pre-populate GPS
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setLat(loc.coords.latitude);
        setLng(loc.coords.longitude);
      }
    })();
  }, []);

  const toggleTag = (tag: TagValue) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Spot name is required");
      return;
    }
    if (lat == null || lng == null) {
      Alert.alert("Error", "Location not available");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const API_URL =
        process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";
      const res = await fetch(`${API_URL}/api/v1/spots`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          lat,
          lng,
          visibility,
          tags: selectedTags,
        }),
      });

      if (res.ok) {
        router.back();
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error ?? "Failed to save spot");
      }
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>ADD SPOT</Text>

      <Text style={styles.label}>CURRENT LOCATION</Text>
      <Text style={styles.coords} testID="spot-location">
        {lat != null && lng != null
          ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          : "Getting location..."}
      </Text>

      <Text style={styles.label}>NAME</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Hubba Hideout"
        placeholderTextColor={colors.mutedText}
        testID="spot-name-input"
      />

      <Text style={styles.label}>DESCRIPTION</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Optional notes..."
        placeholderTextColor={colors.mutedText}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>VISIBILITY</Text>
      <View style={styles.optionRow}>
        {VISIBILITY_OPTIONS.map((opt) => (
          <Pressable
            key={opt}
            style={[
              styles.optionButton,
              visibility === opt && styles.optionSelected,
            ]}
            onPress={() => setVisibility(opt)}
          >
            <Text
              style={[
                styles.optionText,
                visibility === opt && styles.optionTextSelected,
              ]}
            >
              {opt.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>TAGS</Text>
      <View style={styles.tagsGrid}>
        {VALID_TAGS.map((tag) => (
          <Pressable
            key={tag}
            style={[
              styles.tagButton,
              selectedTags.includes(tag) && styles.tagSelected,
            ]}
            onPress={() => toggleTag(tag)}
          >
            <Text
              style={[
                styles.tagButtonText,
                selectedTags.includes(tag) && styles.tagButtonTextSelected,
              ]}
            >
              {tag === "other" ? "other" : tag.replace("_", " ")}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          pressed && styles.saveButtonPressed,
          submitting && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={submitting}
      >
        <Text style={styles.saveButtonText}>
          {submitting ? "SAVING..." : "SAVE SPOT"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 36,
    color: colors.dark,
    letterSpacing: 3,
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.mutedText,
    letterSpacing: 2,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  coords: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.secondary,
  },
  input: {
    fontFamily: fonts.body,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.dark,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  optionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  optionButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.dark,
    padding: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.cardBg,
  },
  optionSelected: {
    backgroundColor: colors.dark,
  },
  optionText: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.dark,
    letterSpacing: 1,
  },
  optionTextSelected: {
    color: colors.accent,
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tagButton: {
    borderWidth: 2,
    borderColor: colors.dark,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.cardBg,
  },
  tagSelected: {
    backgroundColor: colors.accent,
  },
  tagButtonText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark,
  },
  tagButtonTextSelected: {
    color: colors.dark,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.dark,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    shadowColor: colors.dark,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  saveButtonPressed: {
    transform: [{ scale: 0.97 }],
    shadowOffset: { width: 1, height: 1 },
    backgroundColor: "#C93D14",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.white,
    letterSpacing: 2,
  },
});
