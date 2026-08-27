import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Share, PlusSquare, X } from "lucide-react-native";
import { Colors } from "../constants/theme";
import { useColorScheme } from "../hooks/use-color-scheme";

const STORAGE_KEY = "cp_ios_pwa_prompt_dismissed";

export default function IosPwaInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme === "dark" ? "dark" : "light"];

  useEffect(() => {
    if (Platform.OS !== "web") return;

    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = (window.navigator as any).standalone === true || window.matchMedia("(display-mode: standalone)").matches;

      if (isIos && !isStandalone) {
        AsyncStorage.getItem(STORAGE_KEY).then((dismissed) => {
          if (!dismissed) {
            setIsVisible(true);
          }
        });
      }
    }
  }, []);

  const handleDismiss = async () => {
    setIsVisible(false);
    await AsyncStorage.setItem(STORAGE_KEY, "true");
  };

  if (!isVisible) return null;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>Install Christ Pavilion on iPhone</Text>
        <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={18} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.description, { color: themeColors.textSecondary }]}>
        Install this app on your iPhone Home Screen to receive instant push notifications and fast offline access:
      </Text>
      <View style={styles.steps}>
        <View style={styles.stepRow}>
          <Share size={16} color={themeColors.primary} />
          <Text style={[styles.stepText, { color: themeColors.text }]}>
            1. Tap the <Text style={styles.bold}>Share</Text> button in Safari bottom toolbar.
          </Text>
        </View>
        <View style={styles.stepRow}>
          <PlusSquare size={16} color={themeColors.primary} />
          <Text style={[styles.stepText, { color: themeColors.text }]}>
            2. Scroll down and select <Text style={styles.bold}>Add to Home Screen</Text>.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 99999,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  steps: {
    gap: 8,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepText: {
    fontSize: 13,
    flex: 1,
  },
  bold: {
    fontWeight: "600",
  },
});

