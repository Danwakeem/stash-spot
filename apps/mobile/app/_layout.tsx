import { Slot } from "expo-router";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@/lib/clerk";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import { colors } from "@/lib/theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Slot />
      </View>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
