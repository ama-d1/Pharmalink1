import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import {
  ChatMessage, connectToConversation, disconnect, getMessages, sendMediaMessage, sendMessage,
} from '@/services/ChatClient';

export default function IndividualChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    getMessages(id).then(setMessages).catch(() => {});
    connectToConversation(id, (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => disconnect();
  }, [id]);

  const handleSend = async (type: 'TEXT' | 'AUDIO' | 'VIDEO' = 'TEXT', mediaUrl?: string) => {
    if (!input.trim() && type === 'TEXT') return;
    if (!user?.userId || !id) return;
    const content = input.trim() || (type === 'AUDIO' ? 'Voice message' : 'Video message');
    const msg = type === 'TEXT'
      ? await sendMessage(id, user.userId, content)
      : await sendMediaMessage(id, user.userId, content, type, mediaUrl);
    setMessages((prev) => [...prev, msg]);
    setInput('');
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerName}>Pharmacist</Text>
            <Text style={styles.headerStatus}>Online · Text, audio & video</Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd()}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.userId;
            return (
              <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                {item.messageType === 'AUDIO' && <Ionicons name="mic" size={14} color={isMe ? '#fff' : GlassTheme.colors.accent} />}
                {item.messageType === 'VIDEO' && <Ionicons name="videocam" size={14} color={isMe ? '#fff' : GlassTheme.colors.accent} />}
                <Text style={[styles.bubbleText, isMe && styles.myText]}>{item.content}</Text>
              </View>
            );
          }}
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <GlassCard style={styles.inputBar}>
            <TouchableOpacity onPress={() => handleSend('AUDIO', 'audio://recording')}>
              <Ionicons name="mic-outline" size={22} color={GlassTheme.colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSend('VIDEO', 'video://recording')}>
              <Ionicons name="videocam-outline" size={22} color={GlassTheme.colors.violet} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={GlassTheme.colors.textDim}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity onPress={() => handleSend()} style={styles.sendBtn}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </GlassCard>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: GlassTheme.colors.divider,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GlassTheme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerName: { color: GlassTheme.colors.text, fontSize: 18, fontWeight: '700' },
  headerStatus: { color: GlassTheme.colors.success, fontSize: 12 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 18, flexDirection: 'row', gap: 6, alignItems: 'center' },
  myBubble: { backgroundColor: GlassTheme.colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#FFFFFF', alignSelf: 'flex-start', borderWidth: 1, borderColor: GlassTheme.colors.divider, borderBottomLeftRadius: 4, ...GlassTheme.shadow.sm },
  bubbleText: { color: GlassTheme.colors.text, fontSize: 14 },
  myText: { color: '#fff' },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, borderRadius: GlassTheme.radius.pill, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: GlassTheme.colors.divider, paddingHorizontal: 14 },
  input: { flex: 1, color: GlassTheme.colors.text, fontSize: 15, paddingVertical: 12 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: GlassTheme.colors.primary, alignItems: 'center', justifyContent: 'center' },
});
