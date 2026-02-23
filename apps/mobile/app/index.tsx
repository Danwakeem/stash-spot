import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";

const ONBOARDING_KEY = "stash_onboarding_complete";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDING_KEY).then((value) => {
      setOnboardingDone(value === "true");
    });
  }, []);

  if (!isLoaded || onboardingDone === null) return null;

  if (!onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)/map" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
