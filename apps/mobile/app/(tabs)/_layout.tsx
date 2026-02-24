import { useEffect } from "react";
import { Tabs } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { colors, fonts } from "@/lib/theme";
import { API_URL } from "@/lib/api";

let userEnsured = false;

export default function TabLayout() {
  const { getToken } = useAuth();

  // Ensure user record exists in D1 once per app session
  useEffect(() => {
    if (userEnsured) return;
    userEnsured = true;
    (async () => {
      try {
        const token = await getToken();
        await fetch(`${API_URL}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        userEnsured = false;
      }
    })();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.dark,
          borderTopWidth: 2,
          borderTopColor: colors.dark,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarLabelStyle: {
          fontFamily: fonts.heading,
          fontSize: 12,
          letterSpacing: 1,
        },
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 2,
          borderBottomColor: colors.dark,
        },
        headerTitleStyle: {
          fontFamily: fonts.heading,
          fontSize: 24,
          color: colors.dark,
          letterSpacing: 2,
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: "MAP",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "FEED",
          headerTitle: "STASH",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "PROFILE",
          headerTitle: "STASH",
        }}
      />
    </Tabs>
  );
}
