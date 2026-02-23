import { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
  ViewToken,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { colors, fonts, spacing, borderRadius } from "@/lib/theme";

const { width } = Dimensions.get("window");

const ONBOARDING_KEY = "stash_onboarding_complete";

interface Slide {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  body: string;
}

const slides: Slide[] = [
  {
    id: "1",
    emoji: "🛹",
    title: "WELCOME TO\nSTASH",
    subtitle: "your secret spot finder.",
    body: "You know that perfect ledge behind the grocery store? The buttery smooth banks nobody else knows about?\n\nYeah. This is where you keep those.",
  },
  {
    id: "2",
    emoji: "📍",
    title: "PIN YOUR\nSPOTS",
    subtitle: "drop pins, not boards.",
    body: "Found a sick spot? Drop a pin on the map with a name, description, and tags so you never forget it.\n\nKeep it private or share it — your call.",
  },
  {
    id: "3",
    emoji: "👥",
    title: "BUILD YOUR\nCREW",
    subtitle: "skate together, stash together.",
    body: "Create a crew and invite your homies with a secret code. Keep spots off the public feed so they don't get blown up and busted.\n\nLoose lips get spots fenced off.",
  },
  {
    id: "4",
    emoji: "🤙",
    title: "LET'S\nROLL",
    subtitle: "the streets are calling.",
    body: "That's basically it. Pin spots. Build crews. Share the goods.\n\nDon't overthink it — go skate.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
    router.replace("/(auth)/sign-in");
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={slideStyles.container}>
      <Text style={slideStyles.emoji}>{item.emoji}</Text>
      <Text style={slideStyles.title}>{item.title}</Text>
      <Text style={slideStyles.subtitle}>{item.subtitle}</Text>
      <Text style={slideStyles.body}>{item.body}</Text>
    </View>
  );

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={styles.root}>
      <View style={styles.skipRow}>
        {!isLastSlide ? (
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>SKIP</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Bottom button */}
      <View style={styles.bottomRow}>
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextButton,
            pressed && styles.nextButtonPressed,
          ]}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? "LET'S GO" : "NEXT"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  container: {
    width,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 48,
    color: colors.dark,
    textAlign: "center",
    letterSpacing: 2,
    lineHeight: 52,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedText,
    textAlign: "center",
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: 22,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedText,
    letterSpacing: 2,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.dark,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotInactive: {
    backgroundColor: "transparent",
  },
  bottomRow: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 3,
    borderColor: colors.dark,
    borderRadius: borderRadius.sm,
    // Drop shadow matching existing app style
    shadowColor: colors.dark,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  nextButtonPressed: {
    transform: [{ scale: 0.97 }],
    shadowOffset: { width: 1, height: 1 },
  },
  nextButtonText: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.white,
    letterSpacing: 3,
  },
});
