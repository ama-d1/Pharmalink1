import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassTheme } from '@/constants/glassTheme';
import { commentOnPost, getPostComments, PostCommentItem } from '@/services/communityService';

type Props = {
  visible: boolean;
  postId: string | null;
  userId?: string;
  onClose: () => void;
  onCommentAdded?: () => void;
};

// Replaces the old Alert.prompt-based "add a comment" flow, which only ever
// worked on iOS (Alert.prompt isn't implemented on Android) and never showed
// existing comments. This lists real comments once the backend GET endpoint
// exists (see BACKEND_TODO.md) — until then it shows an honest empty state
// rather than silently failing.
export function CommentsModal({ visible, postId, userId, onClose, onCommentAdded }: Props) {
  const [comments, setComments] = useState<PostCommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    const data = await getPostComments(postId);
    setComments(data);
    setLoading(false);
  }, [postId]);

  const handleShow = () => {
    load();
  };

  const handleSend = async () => {
    if (!postId || !userId || !input.trim()) return;
    setPosting(true);
    try {
      await commentOnPost(postId, userId, input.trim());
      setInput('');
      onCommentAdded?.();
      await load();
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onShow={handleShow}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={styles.header}>
          <Text style={styles.title}>Comments</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={GlassTheme.colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={GlassTheme.colors.primary} />
        ) : (
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={comments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubble-ellipses-outline" size={28} color={GlassTheme.colors.textDim} />
                <Text style={styles.emptyText}>
                  No comments yet. Be the first to reply — comment history will show up here once
                  it&apos;s synced from the server.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.authorName?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.author}>{item.authorName ?? 'Community member'}</Text>
                  <Text style={styles.content}>{item.content}</Text>
                </View>
              </View>
            )}
          />
        )}
        <KeyboardAvoidingView behavior="padding">

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Write a comment..."
              placeholderTextColor={GlassTheme.colors.textDim}
              value={input}
              onChangeText={setInput}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || posting) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: GlassTheme.colors.divider,
  },
  title: { fontSize: 17, fontWeight: '700', color: GlassTheme.colors.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  list: { padding: 16, gap: 14, flexGrow: 1 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 40, paddingHorizontal: 20 },
  emptyText: { textAlign: 'center', color: GlassTheme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  commentRow: { flexDirection: 'row', gap: 10 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.primary },
  author: { fontSize: 13, fontWeight: '700', color: GlassTheme.colors.text },
  content: { fontSize: 13, color: GlassTheme.colors.textMuted, marginTop: 2, lineHeight: 18 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, borderTopWidth: 1, borderTopColor: GlassTheme.colors.divider,
  },
  input: {
    flex: 1, fontSize: 14, color: GlassTheme.colors.text,
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: GlassTheme.radius.lg,
    borderWidth: 1.5, borderColor: GlassTheme.colors.divider,
    paddingHorizontal: 14, paddingVertical: 10,
    maxHeight: 90,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: GlassTheme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});