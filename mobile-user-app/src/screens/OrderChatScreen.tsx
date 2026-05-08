import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, FlatList, TextInput,
  Pressable, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Modal, Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { connectSocket, ordersApi, socket } from '../api/api';
import { ENV } from '../config/env';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { AppText, AppButton, AppIconButton, EmptyState } from '../components/ui';
import { theme } from '../theme/theme';

export default function OrderChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userData } = useAuth();
  const { settings } = useSettings();
  const { orderId, riderName } = route.params as any;

  const chatEnabledReplies = settings?.chat_enable_replies !== false;
  const chatEnabledImages = settings?.chat_enable_images !== false;

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    loadHistory();
    connectSocket();

    const onConnect = () => { socket.emit('joinOrder', orderId); };
    const onReceiveMessage = (msg: any) => {
      setMessages(prev => {
        const filtered = prev.filter(m => !m.sending || m.message !== msg.message || m.type !== msg.type);
        if (filtered.some(m => m.id === msg.id)) return filtered;
        return [...filtered, msg];
      });
      if (msg.senderType === 'rider') Vibration.vibrate(100);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    if (socket.connected) onConnect();
    socket.on('connect', onConnect);
    socket.on('receiveMessage', onReceiveMessage);

    return () => {
      socket.emit('leaveOrder', orderId);
      socket.off('connect', onConnect);
      socket.off('receiveMessage', onReceiveMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const loadHistory = async () => {
    try {
      const res = await ordersApi.getChatHistory(orderId);
      setMessages(res.data);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      orderId,
      senderId: userData?.id,
      senderType: 'user',
      message: inputText.trim(),
      type: 'text',
      replyToId: replyingTo?.id,
      replyTo: replyingTo,
      createdAt: new Date().toISOString(),
      sending: true,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    socket.emit('sendMessage', {
      orderId,
      senderId: userData?.id,
      senderType: 'user',
      message: inputText.trim(),
      type: 'text',
      replyToId: replyingTo?.id,
    });

    if (replyingTo && !chatEnabledReplies) {
      Alert.alert('Replies disabled', 'Message replies are currently disabled by admin.');
      setReplyingTo(null);
      return;
    }

    setInputText('');
    setReplyingTo(null);
  };

  const handleDecision = (msgId: string, decision: 'approved' | 'rejected') => {
    socket.emit('sendMessage', {
      orderId,
      senderId: userData?.id,
      senderType: 'user',
      message: `I have ${decision} the replacement suggestion.`,
      type: 'text',
      metadata: { decision, originalMsgId: msgId },
    });
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, decisionMade: decision } : m));
  };

  const getFullImageUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${ENV.SOCKET_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const scrollToMessage = (msgId: string) => {
    if (!msgId) return;
    const index = messages.findIndex(m => m.id === msgId);
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    } else {
      Alert.alert('Message not found', 'The original message is no longer in view.');
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isMe = item.senderType === 'user';
    const isReplacement = item.type === 'replacement_suggestion';
    const fullImageUrl = getFullImageUrl(item.imageUrl);
    const replyToMsg = item.replyTo;

    const prev = messages[index - 1];
    const sameSenderAsPrev = prev && prev.senderType === item.senderType;
    const showSenderTag = !isMe && !sameSenderAsPrev;
    const senderLabel = item.senderType === 'rider'
      ? (riderName || 'Rider')
      : item.senderType === 'admin' ? 'Support' : 'You';

    return (
      <View style={[styles.msgWrapper, isMe ? styles.myMsgWrapper : styles.theirMsgWrapper]}>
        <View style={{ maxWidth: '82%' }}>
          {showSenderTag ? (
            <AppText variant="overline" color={theme.colors.textSecondary} style={{ marginLeft: theme.spacing.sm, marginBottom: 4 }}>
              {senderLabel}
            </AppText>
          ) : null}
          <Pressable
            onLongPress={() => { if (chatEnabledReplies) setReplyingTo(item); }}
            style={[
              styles.bubble,
              isMe ? styles.myBubble : styles.theirBubble,
            ]}
          >
            {replyToMsg ? (
              <Pressable
                onPress={() => scrollToMessage(replyToMsg.id)}
                style={[styles.replyQuote, isMe ? styles.myReplyQuote : styles.theirReplyQuote]}
              >
                <AppText variant="badge" color={isMe ? '#fff' : theme.colors.primary}>
                  {replyToMsg.senderType === 'user' ? 'You' : (riderName || 'Rider')}
                </AppText>
                <AppText
                  variant="caption"
                  color={isMe ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary}
                  numberOfLines={2}
                >
                  {replyToMsg.message || (replyToMsg.imageUrl ? 'Photo' : '')}
                </AppText>
              </Pressable>
            ) : null}

            {fullImageUrl ? (
              <Pressable onPress={() => setSelectedImage(fullImageUrl)}>
                <Image source={{ uri: fullImageUrl }} style={styles.msgImage} contentFit="cover" />
              </Pressable>
            ) : null}

            {item.message ? (
              <AppText
                variant="body"
                color={isMe ? '#fff' : theme.colors.textPrimary}
              >
                {item.message}
              </AppText>
            ) : null}

            {isReplacement && !isMe && !item.decisionMade ? (
              <View style={styles.actionRow}>
                <AppButton
                  label="Approve"
                  variant="primary"
                  tint={theme.colors.success}
                  size="sm"
                  fullWidth
                  onPress={() => handleDecision(item.id, 'approved')}
                  style={{ flex: 1 }}
                />
                <AppButton
                  label="Reject"
                  variant="primary"
                  tint={theme.colors.danger}
                  size="sm"
                  fullWidth
                  onPress={() => handleDecision(item.id, 'rejected')}
                  style={{ flex: 1 }}
                />
              </View>
            ) : null}

            <View style={styles.timeRow}>
              <AppText
                variant="badge"
                color={isMe ? 'rgba(255,255,255,0.7)' : theme.colors.textMuted}
              >
                {formatTime(item.createdAt)}
              </AppText>
              {item.sending ? (
                <Ionicons name="time-outline" size={11} color={isMe ? 'rgba(255,255,255,0.7)' : theme.colors.textMuted} />
              ) : isMe ? (
                <Ionicons name="checkmark-done" size={11} color="rgba(255,255,255,0.85)" />
              ) : null}
            </View>
          </Pressable>
        </View>
      </View>
    );
  };

  if (settings?.feature_chat_enabled === false) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
          </AppIconButton>
          <AppText variant="h2">Chat</AppText>
        </View>
        <EmptyState
          icon="chatbubbles-outline"
          title="Chat unavailable"
          subtitle="Order chat has been disabled by the admin."
          actionLabel="Back to order"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
          <AppText variant="bodyStrong" color={theme.colors.primary}>
            {(riderName || 'R')[0].toUpperCase()}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="h3">{riderName || 'Order chat'}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={styles.onlineDot} />
            <AppText variant="caption">Order #{String(orderId).slice(0, 6).toUpperCase()}</AppText>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 25}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : messages.length === 0 ? (
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title="No messages yet"
            subtitle="Send a message to your rider for delivery instructions."
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id || Math.random().toString()}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
          />
        )}

        {replyingTo ? (
          <View style={styles.replyPreviewBar}>
            <View style={styles.replyAccent} />
            <View style={{ flex: 1 }}>
              <AppText variant="captionStrong" color={theme.colors.primary}>
                Replying to {replyingTo.senderType === 'user' ? 'yourself' : (riderName || 'Rider')}
              </AppText>
              <AppText variant="caption" numberOfLines={1}>
                {replyingTo.message || (replyingTo.imageUrl ? 'Photo' : '')}
              </AppText>
            </View>
            <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.inputArea}>
          {chatEnabledImages ? (
            <AppIconButton
              size={40}
              bg={theme.colors.surfaceMuted}
              onPress={() => Alert.alert('Pick image', 'Image picker to be implemented')}
            >
              <Ionicons name="image-outline" size={20} color={theme.colors.textSecondary} />
            </AppIconButton>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor={theme.colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <AppIconButton
            size={44}
            bg={inputText.trim() ? theme.colors.primary : theme.colors.surfaceMuted}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() ? '#fff' : theme.colors.textMuted}
              style={{ marginLeft: -2 }}
            />
          </AppIconButton>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.imageOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedImage(null)} />
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.fullImage} contentFit="contain" />
          ) : null}
          <AppIconButton
            size={44}
            bg="rgba(255,255,255,0.18)"
            style={styles.imageCloseBtn}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </AppIconButton>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: theme.colors.success,
  },

  listContent: { padding: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: 4 },
  msgWrapper: { flexDirection: 'row', marginBottom: theme.spacing.sm },
  myMsgWrapper: { justifyContent: 'flex-end' },
  theirMsgWrapper: { justifyContent: 'flex-start' },

  bubble: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    ...theme.shadows.sm,
  },
  myBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 6,
  },
  theirBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 6,
  },
  msgImage: { width: 220, height: 160, borderRadius: theme.radius.md, marginBottom: theme.spacing.sm },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-end' },

  replyQuote: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.sm,
    borderLeftWidth: 3,
  },
  myReplyQuote: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderLeftColor: '#fff',
  },
  theirReplyQuote: {
    backgroundColor: theme.colors.primaryLight,
    borderLeftColor: theme.colors.primary,
  },

  actionRow: {
    flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
  },

  inputArea: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontSize: 14,
    maxHeight: 96,
  },

  replyPreviewBar: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
  },
  replyAccent: { width: 3, height: 32, borderRadius: 2, backgroundColor: theme.colors.primary },

  imageOverlay: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  fullImage: { width: '100%', height: '85%' },
  imageCloseBtn: { position: 'absolute', top: 50, right: 20 },
});
