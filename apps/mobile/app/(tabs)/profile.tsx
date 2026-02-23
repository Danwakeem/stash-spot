import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { colors, fonts, spacing } from "@/lib/theme";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.username?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <Text style={styles.username}>
          {user?.username ?? "Unknown"}
        </Text>
      </View>

      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            pressed && styles.menuItemPressed,
          ]}
        >
          <Text style={styles.menuText}>MY SPOTS</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            pressed && styles.menuItemPressed,
          ]}
        >
          <Text style={styles.menuText}>MY CREWS</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.signOutButton,
          pressed && styles.signOutButtonPressed,
        ]}
        onPress={handleSignOut}
      >
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
    marginTop: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: colors.dark,
    borderWidth: 3,
    borderColor: colors.dark,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatarText: {
    fontFamily: fonts.heading,
    fontSize: 36,
    color: colors.accent,
  },
  username: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.dark,
    letterSpacing: 2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  menuItem: {
    backgroundColor: colors.cardBg,
    borderWidth: 2,
    borderColor: colors.dark,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.dark,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  menuItemPressed: {
    transform: [{ scale: 0.97 }],
    shadowOffset: { width: 1, height: 1 },
  },
  menuText: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.dark,
    letterSpacing: 1,
  },
  signOutButton: {
    backgroundColor: colors.dark,
    borderWidth: 3,
    borderColor: colors.dark,
    padding: spacing.md,
    alignItems: "center",
    shadowColor: colors.dark,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  signOutButtonPressed: {
    transform: [{ scale: 0.97 }],
    shadowOffset: { width: 1, height: 1 },
  },
  signOutText: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.primary,
    letterSpacing: 2,
  },
});
