import { Tabs } from "expo-router";
import { colors, fonts } from "@/lib/theme";

export default function TabLayout() {
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
          headerTitle: "STASH",
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
