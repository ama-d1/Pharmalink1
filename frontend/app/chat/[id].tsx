import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
// SDK 54's default `expo-file-system` export is the new File/Directory-class
// API (no readAsStringAsync) — the familiar readAsStringAsync/EncodingType
// API used below still exists, just moved under this legacy subpath.
import * as FileSystem from 'expo-file-system/legacy';
import {
  useAudioRecorder, useAudioRecorderState, useAudioPlayer, useAudioPlayerStatus,
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync,
} from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import {
  ChatMessage, connectToConversation, disconnect, getMessages, sendMessage, sendMediaMessage,
} from '@/services/ChatClient';

// REWRITTEN 2026-07-24 — voice notes and video clips were both permanently
// disabled ("coming soon" alerts) before this. Real live calling (WebRTC) was
// explicitly ruled out for now — it needs a native module Expo Go can't run,
// so this instead implements the simpler, still-real alternative: record a
// short voice note or video clip, upload it as a base64 data URI (same
// pattern already used for pharmacy stock photos — see PharmacyStock.
// imageBase64 javadoc), and it appears as a normal playable message. The
// Message model already had messageType AUDIO/VIDEO + mediaUrl fields ready
// for exactly this; media_url just needed widening from VARCHAR(255) to TEXT
// (see chat-service's V3__widen_media_url.sql) since a data URI is much
// bigger than a plain link.
//
// Also repositions the whole input bar: previously only the GlassCard around
// the input was wrapped in KeyboardAvoidingView, leaving the FlatList a
// separate sibling that didn't resize with it — on a real device the
// keyboard could end up overlapping the last message or leaving an awkward
// gap. Wrapping the FlatList + input bar together in ONE KeyboardAvoidingView
// is what actually keeps the input visible above the keyboard while typing.
const MAX_VIDEO_SECONDS = 20;

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// One bubble's audio player — each AUDIO message gets its own tiny player
// instance so multiple voice notes in the same thread don't fight over one
// shared player's source.
function AudioBubble({ uri, isMe }: { uri: string; isMe: boolean }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || status.currentTime >= (status.duration || 0)) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  return (
    <TouchableOpacity onPress={toggle} style={styles.mediaRow}>
      <View style={[styles.playBtn, isMe ? styles.playBtnMe : styles.playBtnThem]}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={16} color={isMe ? '#fff' : GlassTheme.colors.primary} />
      </View>
      <View style={styles.waveTrack}>
        <View
          style={[
            styles.waveFill,
            { width: `${status.duration ? Math.min(100, (status.currentTime / status.duration) * 100) : 0}%` },
            isMe ? styles.waveFillMe : styles.waveFillThem,
          ]}
        />
      </View>
      <Text style={[styles.mediaDuration, isMe && styles.myText]}>
        {formatDuration((status.duration || 0) * 1000)}
      </Text>
    </TouchableOpacity>
  );
}

function VideoBubble({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  return (
    <VideoView
      player={player}
      style={styles.videoBubble}
      allowsFullscreen
      allowsPictureInPicture={false}
      nativeControls
    />
  );
}

export default function IndividualChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState<'AUDIO' | 'VIDEO' | null>(null);
  const listRef = useRef<FlatList>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  useEffect(() => {
    if (!id) return;
    getMessages(id).then(setMessages).catch(() => {});
    connectToConversation(id, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return () => disconnect();
  }, [id]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!user?.userId || !id) return;
    const content = input.trim();
    setInput('');
    try {
      const msg = await sendMessage(id, user.userId, content);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } catch {
      setInput(content);
      Alert.alert('Message not sent', 'Check your connection and try again.');
    }
  };

  const fileToDataUri = async (uri: string, mime: string) => {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return `data:${mime};base64,${base64}`;
  };

  const handleStartRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Microphone access needed', 'Enable microphone access in Settings to record a voice note.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err: any) {
      Alert.alert('Could not start recording', err?.message || 'Please try again.');
    }
  };

  const handleStopRecordingAndSend = async () => {
    if (!user?.userId || !id) return;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        Alert.alert('Recording failed', 'No audio was captured. Please try again.');
        return;
      }
      setUploadingMedia('AUDIO');
      const dataUri = await fileToDataUri(uri, 'audio/m4a');
      const msg = await sendMediaMessage(id, user.userId, 'Voice note', 'AUDIO', dataUri);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } catch (err: any) {
      Alert.alert('Could not send voice note', err?.message || 'Please try again.');
    } finally {
      setUploadingMedia(null);
    }
  };

  const handleCancelRecording = async () => {
    try { await recorder.stop(); } catch {}
  };

  const handleRecordVideo = async () => {
    if (!user?.userId || !id) return;
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('Camera access needed', 'Enable camera access in Settings to record a video clip.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'videos',
        videoMaxDuration: MAX_VIDEO_SECONDS,
        quality: 0.5,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploadingMedia('VIDEO');
      const dataUri = await fileToDataUri(result.assets[0].uri, 'video/mp4');
      const msg = await sendMediaMessage(id, user.userId, 'Video clip', 'VIDEO', dataUri);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } catch (err: any) {
      Alert.alert('Could not send video clip', err?.message || 'A clip that long may be too large — try a shorter one.');
    } finally {
      setUploadingMedia(null);
    }
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
            <Text style={styles.headerStatus}>Online</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd()}
            renderItem={({ item }) => {
              const isMe = item.senderId === user?.userId;
              return (
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                  {item.messageType === 'AUDIO' && item.mediaUrl ? (
                    <AudioBubble uri={item.mediaUrl} isMe={isMe} />
                  ) : item.messageType === 'VIDEO' && item.mediaUrl ? (
                    <VideoBubble uri={item.mediaUrl} />
                  ) : (
                    <Text style={[styles.bubbleText, isMe && styles.myText]}>{item.content}</Text>
                  )}
                </View>
              );
            }}
          />

          {recorderState.isRecording ? (
            <View style={styles.recordingBar}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording… {formatDuration(recorderState.durationMillis)}</Text>
              <TouchableOpacity onPress={handleCancelRecording} style={styles.recordingCancelBtn}>
                <Ionicons name="trash-outline" size={18} color={GlassTheme.colors.danger} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleStopRecordingAndSend} style={styles.recordingSendBtn}>
                <Ionicons name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputBar}>
              <TouchableOpacity
                onPress={handleRecordVideo}
                style={styles.iconBtn}
                disabled={uploadingMedia !== null}
              >
                {uploadingMedia === 'VIDEO'
                  ? <ActivityIndicator size="small" color={GlassTheme.colors.primary} />
                  : <Ionicons name="videocam-outline" size={22} color={GlassTheme.colors.primary} />}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor={GlassTheme.colors.textDim}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                multiline
              />

              {input.trim().length > 0 ? (
                <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleStartRecording}
                  style={styles.sendBtn}
                  disabled={uploadingMedia !== null}
                >
                  {uploadingMedia === 'AUDIO'
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="mic-outline" size={20} color="#fff" />}
                </TouchableOpacity>
              )}
            </View>
          )}
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

  bubble: { maxWidth: '80%', padding: 10, borderRadius: 18, flexDirection: 'row', gap: 6, alignItems: 'center' },
  myBubble: { backgroundColor: GlassTheme.colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#FFFFFF', alignSelf: 'flex-start', borderWidth: 1, borderColor: GlassTheme.colors.divider, borderBottomLeftRadius: 4, ...GlassTheme.shadow.sm },
  bubbleText: { color: GlassTheme.colors.text, fontSize: 14, paddingHorizontal: 4, paddingVertical: 2 },
  myText: { color: '#fff' },

  mediaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 160, paddingVertical: 2 },
  playBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  playBtnMe: { backgroundColor: 'rgba(255,255,255,0.25)' },
  playBtnThem: { backgroundColor: GlassTheme.colors.primaryLight },
  waveTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
  waveFill: { height: '100%', borderRadius: 2 },
  waveFillMe: { backgroundColor: 'rgba(255,255,255,0.8)' },
  waveFillThem: { backgroundColor: GlassTheme.colors.primary },
  mediaDuration: { fontSize: 11, color: GlassTheme.colors.textMuted, fontWeight: '600', minWidth: 32 },

  videoBubble: { width: 220, height: 160, borderRadius: 14, backgroundColor: '#000' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, margin: 12, padding: 6,
    borderRadius: GlassTheme.radius.pill, backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: GlassTheme.colors.divider,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, color: GlassTheme.colors.text, fontSize: 15, paddingVertical: 10, paddingHorizontal: 6, maxHeight: 100 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: GlassTheme.colors.primary, alignItems: 'center', justifyContent: 'center' },

  recordingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: GlassTheme.radius.pill, backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: GlassTheme.colors.dangerLight,
  },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GlassTheme.colors.danger },
  recordingText: { flex: 1, color: GlassTheme.colors.text, fontSize: 13, fontWeight: '600' },
  recordingCancelBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: GlassTheme.colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  recordingSendBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: GlassTheme.colors.primary, alignItems: 'center', justifyContent: 'center' },
});
