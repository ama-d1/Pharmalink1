import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      // TODO: connect to your backend reset endpoint
      // e.g. await fetch(`${BASE_URL}/forgot-password`, { method: "POST", body: JSON.stringify({ email }) })
      Alert.alert("Success", "If that email exists, a reset link has been sent.");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* Header */}
      <View style={{ alignItems: "center", paddingTop: 80 }}>
        <Text style={{ fontSize: 40 }}>🔐</Text>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: "#2563EB" }}>
          Forgot Password
        </Text>
        <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          We'll send you a reset link
        </Text>
      </View>

      {/* Card */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          marginHorizontal: 20,
          borderRadius: 24,
          marginTop: 40,
          padding: 24,
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "bold", color: "#2563EB" }}>
          Reset Password
        </Text>
        <Text style={{ fontSize: 13, color: "#888888", marginTop: 4 }}>
          Enter the email linked to your account
        </Text>

        {/* Email */}
        <Text
          style={{
            fontSize: 10,
            color: "#555555",
            fontWeight: "bold",
            marginTop: 20,
            marginBottom: 6,
          }}
        >
          EMAIL ADDRESS
        </Text>
        <TextInput
          placeholder="you@example.com"
          placeholderTextColor="#aaaaaa"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={{
            backgroundColor: "#F4F6FA",
            borderRadius: 10,
            padding: 13,
            fontSize: 14,
            borderWidth: 1,
            borderColor: "#E8ECF4",
          }}
        />

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleReset}
          disabled={loading}
          style={{
            backgroundColor: loading ? "#888888" : "#2563EB",
            padding: 15,
            borderRadius: 12,
            marginTop: 24,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 14 }}>
              SEND RESET LINK
            </Text>
          )}
        </TouchableOpacity>

        {/* Back to Login */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignItems: "center", marginTop: 20 }}
        >
          <Text style={{ color: "#2563EB", fontSize: 13, fontWeight: "bold" }}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}