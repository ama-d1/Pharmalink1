import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { registerUser } from "../services/authService";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !phone || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      const data = await registerUser(fullName, email, password, phone);
      if (data.token) {
        Alert.alert("Success", "Account created successfully!");
        router.push("/(tabs)");
      } else {
        Alert.alert("Error", data.message || "Registration failed");
      }
    } catch (error) {
      Alert.alert("Error", "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0B2545",
        paddingTop: 80,
        alignItems: "center",
      }}
    >
      <Text style={{ color: "#ffffff", fontSize: 28, fontWeight: "bold" }}>
        Create Account
      </Text>
      <Text style={{ color: "#5DC8A4", fontSize: 13, marginTop: 6 }}>
        Join Pharmalink and experience smarter pharmacy management.
      </Text>

      <View
        style={{
          backgroundColor: "#ffffff",
          marginHorizontal: 20,
          borderRadius: 24,
          marginTop: 40,
          padding: 24,
          width: "90%",
        }}
      >
        <Text style={{ fontSize: 20, color: "#0B2545", fontWeight: "bold" }}>
          Let's Get Started!
        </Text>
        <Text style={{ fontSize: 13, color: "#888888", marginTop: 4 }}>
          Fill in your details below
        </Text>

        <Text
          style={{
            fontSize: 10,
            color: "#555555",
            fontWeight: "bold",
            marginTop: 20,
            marginBottom: 6,
          }}
        >
          FULL NAME
        </Text>
        <TextInput
          placeholder="John Doe"
          placeholderTextColor="#aaaaaa"
          value={fullName}
          onChangeText={setFullName}
          style={{
            backgroundColor: "#F4F6FA",
            borderRadius: 10,
            padding: 13,
            fontSize: 14,
            borderWidth: 1,
            borderColor: "#E8ECF4",
          }}
        />

        <Text
          style={{
            fontSize: 10,
            color: "#555555",
            fontWeight: "bold",
            marginTop: 14,
            marginBottom: 6,
          }}
        >
          PHONE NUMBER
        </Text>
        <TextInput
          placeholder="+233-XX-XXX-XXXX"
          placeholderTextColor="#aaaaaa"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          style={{
            backgroundColor: "#F4F6FA",
            borderRadius: 10,
            padding: 13,
            fontSize: 14,
            borderWidth: 1,
            borderColor: "#E8ECF4",
          }}
        />

        <Text
          style={{
            fontSize: 10,
            color: "#555555",
            fontWeight: "bold",
            marginTop: 14,
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
          placeholder="Create a strong password"
          placeholderTextColor="#aaaaaa"
          secureTextEntry={true}
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

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={{
            backgroundColor: loading ? "#888888" : "#1A6EBD",
            padding: 15,
            borderRadius: 12,
            marginTop: 24,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text
              style={{ color: "#ffffff", fontWeight: "bold", fontSize: 14 }}
            >
              CREATE ACCOUNT
            </Text>
          )}
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 20,
          }}
        >
          <Text style={{ color: "#888888", fontSize: 13 }}>
            Already have an account? {""}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text
              style={{ color: "#1A6EBD", fontSize: 13, fontWeight: "bold" }}
            >
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}