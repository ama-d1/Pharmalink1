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
import { loginUser } from "../services/authService";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser(email, password);

      if (data.token) {
        Alert.alert("Success", `Welcome back ${data.fullName}!`);
        router.push("/(tabs)");
      } else {
        Alert.alert("Error", data.message || "Login failed");
      }
    } catch (error) {
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* Logo Section */}
      <View style={{ alignItems: "center", paddingTop: 80 }}>
        <Text style={{ fontSize: 40 }}>💊</Text>

        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: "#2563EB",
          }}
        >
          PharmaLink
        </Text>

        <Text
          style={{
            fontSize: 13,
            color: "#6B7280",
            marginTop: 4,
          }}
        >
          Manage your medications with ease 
        </Text>
      </View>

      {/* Login Card */}
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
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: "#2563EB",
          }}
        >
          Welcome Back
        </Text>

        <Text
          style={{
            fontSize: 13,
            color: "#888888",
            marginTop: 4,
          }}
        >
          Sign in to your account
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

        {/* Password */}
        <Text
          style={{
            fontSize: 10,
            color: "#555555",
            fontWeight: "bold",
            marginTop: 14,
            marginBottom: 6,
          }}
        >
          PASSWORD
        </Text>

        <TextInput
          placeholder="Enter your password"
          secureTextEntry
          placeholderTextColor="#aaaaaa"
          value={password}
          onChangeText={setPassword}
          style={{
            backgroundColor: "#F4F6FA",
            borderRadius: 10,
            padding: 13,
            fontSize: 14,
            borderWidth: 1,
            borderColor: "#E8ECF4",
          }}
        />

        {/* Login Button */}
        <TouchableOpacity
          onPress={handleLogin}
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
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "bold",
                fontSize: 14,
              }}
            >
              SIGN IN
            </Text>
          )}
        </TouchableOpacity>

        {/* Forgot Password */}
        <TouchableOpacity
         onPress={() => router.push("/forgot-password" as any)}
         style={{
         alignItems: "flex-end",
         marginTop: 12,
         }}
          >
        
          <Text
            style={{
              color: "#2563EB",
              fontSize: 12,
              fontWeight: "bold",
            }}
          >
            Forgot Password?
          </Text>
        </TouchableOpacity>

        {/* Register Link */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 24,
          }}
        >
          <Text
            style={{
              color: "#888888",
              fontSize: 13,
            }}
          >
            Don't have an account?{" "}
          </Text>

          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text
              style={{
                color: "#2563EB",
                fontSize: 13,
                fontWeight: "bold",
              }}
            >
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}