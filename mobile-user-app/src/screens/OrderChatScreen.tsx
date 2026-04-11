import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Modal, Pressable, Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '../api/api';
import { ENV } from '../config/env';
import io from 'socket.io-client';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

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
  const [socket, setSocket] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({ headerTitle: riderName || 'Chat with Rider' });
    loadHistory();

    const newSocket = io(ENV.SOCKET_URL, { transports: ['websocket'], forceNew: true });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('joinOrder', orderId);
    });

    newSocket.on('receiveMessage', (msg: any) => {
      setMessages(prev => {
        const filtered = prev.filter(m => !m.sending || m.message !== msg.message || m.type !== msg.type);
        if (filtered.some(m => m.id === msg.id)) return filtered;
        return [...filtered, msg];
      });

      // Haptic feedback for incoming messages from Rider
      if (msg.senderType === 'rider') {
        Vibration.vibrate(100);
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => {
      newSocket.emit('leaveOrder', orderId);
      newSocket.disconnect();
    };
  }, [orderId]);

  const loadHistory = async () => {
    try {
      const res = await ordersApi.getChatHistory(orderId);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load chat history', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || !socket) return;

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
      sending: true
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    socket.emit('sendMessage', {
      orderId,
      senderId: userData?.id,
      senderType: 'user',
      message: inputText.trim(),
      type: 'text',
      replyToId: replyingTo?.id
    });
    
    if (replyingTo && !chatEnabledReplies) {
       Alert.alert('Replies Disabled', 'Message replies are currently disabled by admin.');
       setReplyingTo(null);
       return;
    }
    
    setInputText('');
    setReplyingTo(null);
  };

  const handleDecision = (msgId: string, decision: 'approved' | 'rejected') => {
    if (!socket) return;
    socket.emit('sendMessage', {
      orderId,
      senderId: userData?.id,
      senderType: 'user',
      message: `I have ${decision} the replacement suggestion.`,
      type: 'text',
      metadata: { decision, originalMsgId: msgId }
    });
    
    // Optimistically update the UI if we want to hide buttons
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

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderType === 'user';
    const isReplacement = item.type === 'replacement_suggestion';
    const fullImageUrl = getFullImageUrl(item.imageUrl);
    const replyToMsg = item.replyTo;

    return (
      <View style={[styles.msgWrapper, isMe ? styles.myMsgWrapper : styles.theirMsgWrapper]}>
        <TouchableOpacity 
          activeOpacity={0.9}
          onLongPress={() => {
            if (chatEnabledReplies) setReplyingTo(item);
          }}
          style={[styles.msgBubble, isMe ? styles.myMsgBubble : styles.theirMsgBubble]}
        >
          {replyToMsg && (
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => scrollToMessage(replyToMsg.id)}
              style={[styles.replyQuote, isMe ? styles.myReplyQuote : styles.theirReplyQuote]}
            >
              <Text style={styles.replyQuoteTitle}>{replyToMsg.senderType === 'user' ? 'You' : riderName || 'Rider'}</Text>
              <Text style={styles.replyQuoteText} numberOfLines={2}>{replyToMsg.message || (replyToMsg.imageUrl ? 'Photo' : '')}</Text>
            </TouchableOpacity>
          )}

          {fullImageUrl && (
            <TouchableOpacity onPress={() => setSelectedImage(fullImageUrl)}>
              <Image source={{ uri: fullImageUrl }} style={styles.msgImage} contentFit="cover" />
            </TouchableOpacity>
          )}
          {item.message && (
            <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.theirMsgText]}>
              {item.message}
            </Text>
          )}

          {isReplacement && !isMe && !item.decisionMade && (
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.approveBtn]} 
                onPress={() => handleDecision(item.id, 'approved')}
              >
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.rejectBtn]} 
                onPress={() => handleDecision(item.id, 'rejected')}
              >
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
          {item.sending && (
            <Text style={styles.sendingText}>Sending...</Text>
          )}

          <Text style={[styles.msgTime, isMe && styles.myMsgTime]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (settings?.feature_chat_enabled === false) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#888', fontSize: 16 }}>Order Chat has been disabled by Admin.</Text>
        <TouchableOpacity 
          style={{ marginTop: 20, backgroundColor: '#FF4500', padding: 12, borderRadius: 10 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#fff' }}>Back to Order</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FF4500" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#121212' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {replyingTo && (
          <View style={styles.replyPreviewHeader}>
            <View style={styles.replyPreviewBar} />
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewTitle}>Replying to {replyingTo.senderType === 'user' ? 'yourself' : riderName || 'Rider'}</Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>{replyingTo.message || (replyingTo.imageUrl ? 'Photo' : '')}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close-circle" size={24} color="#888" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputArea}>
          {chatEnabledImages && (
            <TouchableOpacity style={styles.attachBtn} onPress={() => Alert.alert('Pick Image', 'Image picker to be implemented')}>
               <Ionicons name="image-outline" size={24} color="#666" />
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.modalBg}>
          <Pressable style={styles.modalCloseArea} onPress={() => setSelectedImage(null)} />
          <Image source={selectedImage || ''} style={styles.fullImage} contentFit="contain" />
          <TouchableOpacity style={styles.fullCloseBtn} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 24 },
  msgWrapper: { marginBottom: 12, flexDirection: 'row', width: '100%' },
  myMsgWrapper: { justifyContent: 'flex-end' },
  theirMsgWrapper: { justifyContent: 'flex-start' },
  msgBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  myMsgBubble: {
    backgroundColor: '#FF4500',
    borderBottomRightRadius: 4,
  },
  theirMsgBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  msgText: { fontSize: 15, lineHeight: 20 },
  myMsgText: { color: '#fff' },
  theirMsgText: { color: '#1A1A1A' },
  msgImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 8 },
  msgTime: { fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 4, textAlign: 'right' },
  myMsgTime: { color: 'rgba(255,255,255,0.6)' },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    color: '#1A1A1A',
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF4500',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sendBtnDisabled: { backgroundColor: '#FFD1C1' },
  replyPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  replyPreviewBar: { width: 4, height: '100%', backgroundColor: '#FF4500', borderRadius: 2, marginRight: 10 },
  replyPreviewContent: { flex: 1 },
  replyPreviewTitle: { color: '#FF4500', fontSize: 12, fontWeight: 'bold' },
  replyPreviewText: { color: '#666', fontSize: 13 },
  replyQuote: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF4500',
  },
  myReplyQuote: { borderLeftColor: '#fff', backgroundColor: 'rgba(255,255,255,0.2)' },
  theirReplyQuote: { borderLeftColor: '#FF4500' },
  replyQuoteTitle: { fontSize: 12, fontWeight: 'bold', color: '#FF4500' },
  replyQuoteText: { fontSize: 13, color: '#666' },
  modalBg: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  modalCloseArea: { ...StyleSheet.absoluteFillObject },
  fullImage: { width: '100%', height: '80%' },
  fullCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  approveBtn: { backgroundColor: '#22C55E' },
  rejectBtn: { backgroundColor: '#EF4444' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  decisionBadge: { marginTop: 8, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: '#F0F0F0' },
  decisionText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  sendingText: { fontSize: 10, color: 'rgba(0,0,0,0.4)', fontStyle: 'italic', marginTop: 2, textAlign: 'right', marginRight: 4 },
});
