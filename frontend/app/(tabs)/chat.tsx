import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatScreen() {
  const router = useRouter();

  const [conversations] = useState([
    {
      id: "1",
      name: "Pharm. Kwame Mensah",
      lastMessage: "Your prescription has been verified ✅",
      time: "10:45 AM",
      unread: 2,
    },
    {
      id: "2",
      name: "Pharm. Abena Osei",
      lastMessage: "How are you feeling after taking the medication?",
      time: "Yesterday",
      unread: 0,
    },
    {
      id: "3",
      name: "Pharm. Daniel Addo",
      lastMessage: "Your order is ready for pickup",
      time: "2d ago",
      unread: 1,
    },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>
          Connect with pharmacists
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search pharmacists or chats..."
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Chat List */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => router.push(`/chat/${item.id}` as any)}
          >
            <View style={styles.avatar}>
              <Text style={{ fontSize: 28 }}>💊</Text>
            </View>

            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>

              <Text
                style={styles.lastMessage}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
            </View>

            {item.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unread}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    backgroundColor: "#2563EB",
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
  },

  headerSubtitle: {
    color: "#E0F2FE",
    marginTop: 4,
    fontSize: 13,
  },

  searchContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
  },

  searchInput: {
    backgroundColor: "#F4F6FA",
    borderRadius: 999,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E8ECF4",
  },

  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  avatar: {
    width: 56,
    height: 56,
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  chatInfo: {
    flex: 1,
    marginLeft: 16,
  },

  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  name: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },

  time: {
    color: "#6B7280",
    fontSize: 13,
  },

  lastMessage: {
    color: "#475569",
    marginTop: 4,
  },

  unreadBadge: {
    backgroundColor: "#2563EB",
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  unreadText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});