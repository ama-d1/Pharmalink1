import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function IndividualChat() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "Hello! How can I help you today?",
      isMe: false,
      time: "10:30 AM",
    },
    {
      id: "2",
      text: "I have a question about my prescription",
      isMe: true,
      time: "10:32 AM",
    },
  ]);

  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;

    const newMsg = {
      id: Date.now().toString(),
      text: input,
      isMe: true,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 15 }}
        >
          <Text style={{ color: "white", fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerName}>Pharm. Kwame Mensah</Text>
          <Text style={styles.headerStatus}>Online</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        style={styles.messagesList}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.isMe ? styles.myMessage : styles.theirMessage,
            ]}
          >
            <Text style={item.isMe ? styles.myText : styles.theirText}>
              {item.text}
            </Text>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
        )}
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#2563eb",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  headerName: { color: "white", fontSize: 18, fontWeight: "bold" },
  headerStatus: { color: "#bae6fd", fontSize: 14 },
  messagesList: { flex: 1, padding: 16 },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 18,
    marginVertical: 4,
  },
  myMessage: { backgroundColor: "#2563eb", alignSelf: "flex-end" },
  theirMessage: { backgroundColor: "#e2e8f0", alignSelf: "flex-start" },
  myText: { color: "white" },
  theirText: { color: "black" },
  timeText: { fontSize: 11, marginTop: 4, opacity: 0.7, alignSelf: "flex-end" },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  input: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    borderRadius: 999,
    justifyContent: "center",
  },
  sendText: { color: "white", fontWeight: "bold" },
});
