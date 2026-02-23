import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useAuth } from "@clerk/clerk-expo";
import { colors, fonts, spacing, visibilityColors } from "@/lib/theme";

interface SpotPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  visibility: "private" | "group" | "public";
}

export default function MapScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [spots, setSpots] = useState<SpotPin[]>([]);
  const [region, setRegion] = useState({
    latitude: 37.7878,
    longitude: -122.4,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion((prev) => ({
          ...prev,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const API_URL =
          process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";
        const res = await fetch(`${API_URL}/api/v1/spots`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSpots(data.spots ?? []);
      } catch {
        // Silently fail — will retry on next focus
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={region}>
        {spots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.lat, longitude: spot.lng }}
            title={spot.name}
            pinColor={visibilityColors[spot.visibility]}
            onCalloutPress={() => router.push(`/spot/${spot.id}`)}
          />
        ))}
      </MapView>

      <Pressable
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.addButtonPressed,
        ]}
        onPress={() => router.push("/add-spot")}
      >
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  addButton: {
    position: "absolute",
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.dark,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.dark,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  addButtonPressed: {
    transform: [{ scale: 0.97 }],
    shadowOffset: { width: 1, height: 1 },
    backgroundColor: "#C93D14",
  },
  addButtonText: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.white,
    lineHeight: 30,
  },
});
