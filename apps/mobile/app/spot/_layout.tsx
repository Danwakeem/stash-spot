import { Stack } from "expo-router";
import { colors, fonts } from "@/lib/theme";

export default function SpotLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTitleStyle: {
          fontFamily: fonts.heading,
          fontSize: 20,
          color: colors.dark,
        },
        headerTintColor: colors.dark,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: "SPOT" }} />
    </Stack>
  );
}
