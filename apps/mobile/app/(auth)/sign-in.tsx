import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { colors, spacing, fonts } from "@/lib/theme";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!isLoaded) return;

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)/map");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Sign in failed";
      setError(message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>STASH</Text>
        <Text style={styles.subtitle}>your spots.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.mutedText}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.mutedText}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleSignIn}
        >
          <Text style={styles.buttonText}>SIGN IN</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/(auth)/sign-up")}>
          <Text style={styles.link}>Don't have an account? Sign up</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 64,
    color: colors.dark,
    textAlign: "center",
    letterSpacing: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.mutedText,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  error: {
    fontFamily: fonts.body,
    color: colors.primary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  input: {
    fontFamily: fonts.body,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.dark,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.dark,
    padding: spacing.md,
    alignItems: "center",
    shadowColor: colors.dark,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    marginBottom: spacing.md,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    shadowOffset: { width: 1, height: 1 },
    backgroundColor: "#C93D14",
  },
  buttonText: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.white,
    letterSpacing: 2,
  },
  link: {
    fontFamily: fonts.body,
    color: colors.secondary,
    textAlign: "center",
    fontSize: 14,
  },
});
