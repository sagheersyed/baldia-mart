import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Image, ActivityIndicator, Alert, Modal, Pressable, Vibration
} from 'react-native';
import { ENV } from '../config/env';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { socket, ordersApi, ridersApi } from '../api/api';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function OrderChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { orderId, customerName } = route.params as any;

  const chatEnabledReplies = settings?.chat_enable_replies !== false;
  const chatEnabledImages = settings?.chat_enable_images !== false;

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const flatListRef = useRef<FlatList>(null);

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

  useEffect(() => {
    navigation.setOptions({ headerTitle: customerName || 'Chat with Customer' });
    loadHistory();

    socket.connect();
    const onConnect = () => {
      socket.emit('joinOrder', orderId);
    };
    socket.on('connect', onConnect);
    
    socket.on('receiveMessage', (msg: any) => {
      setMessages(prev => {
        const filtered = prev.filter(m => !m.sending || m.message !== msg.message || m.type !== msg.type);
        if (filtered.some(m => m.id === msg.id)) return filtered;
        return [...filtered, msg];
      });
      
      // Haptic feedback for incoming messages from Customer
      if (msg.senderType === 'user') {
        Vibration.vibrate(100);
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    if (socket.connected) onConnect();

    return () => {
      socket.emit('leaveOrder', orderId);
      socket.off('connect', onConnect);
      socket.off('receiveMessage');
    };
  }, [orderId]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      orderId,
      senderId: user?.id,
      senderType: 'rider',
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
      senderId: user?.id,
      senderType: 'rider',
      message: inputText.trim(),
      type: 'text',
      replyToId: replyingTo?.id
    });
    
    setInputText('');
    setReplyingTo(null);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: `chat_${orderId}_${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      const res = await ridersApi.uploadFile(formData);
      socket.emit('sendMessage', {
        orderId,
        senderId: user?.id,
        senderType: 'rider',
        imageUrl: res.data.url,
        type: 'text',
        message: 'Shared a photo',
        replyToId: replyingTo?.id
      });
      setReplyingTo(null);
    } catch (err) {
      Alert.alert('Upload Failed', 'Could not send image.');
    } finally {
      setSending(false);
    }
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
    const isMe = item.senderType === 'rider';
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
              <Text style={styles.replyQuoteTitle}>{replyToMsg.senderType === 'rider' ? 'You' : customerName || 'Customer'}</Text>
              <Text style={styles.replyQuoteText} numberOfLines={2}>{replyToMsg.message || (replyToMsg.imageUrl ? 'Photo' : '')}</Text>
            </TouchableOpacity>
          )}

          {fullImageUrl && (
            <TouchableOpacity onPress={() => setSelectedImage(fullImageUrl)}>
              <Image source={{ uri: fullImageUrl }} style={styles.msgImage} resizeMode="cover" />
            </TouchableOpacity>
          )}
          {item.message && (
            <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.theirMsgText]}>
              {item.message}
            </Text>
          )}
          {item.sending && (
            <Text style={styles.sendingText}>Sending...</Text>
          )}
          <Text style={styles.msgTime}>
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
          style={{ marginTop: 20, backgroundColor: '#FF4500', padding: 12, borderRadius: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Back to Order</Text>
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
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 100}
    >
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
            <Text style={styles.replyPreviewTitle}>Replying to {replyingTo.senderType === 'rider' ? 'yourself' : customerName || 'Customer'}</Text>
            <Text style={styles.replyPreviewText} numberOfLines={1}>{replyingTo.message || (replyingTo.imageUrl ? 'Photo' : '')}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Ionicons name="close-circle" size={24} color="#888" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputArea}>
        {chatEnabledImages && (
          <TouchableOpacity style={styles.imageAction} onPress={pickImage} disabled={sending}>
            {sending ? <ActivityIndicator size="small" color="#FF4500" /> : <Ionicons name="camera-outline" size={24} color="#888" />}
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
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.modalBg}>
          <Pressable style={styles.modalCloseArea} onPress={() => setSelectedImage(null)} />
          <Image source={{ uri: selectedImage || '' }} style={styles.fullImage} resizeMode="contain" />
          <TouchableOpacity style={styles.fullCloseBtn} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  listContent: { padding: 16, paddingBottom: 24 },
  msgWrapper: { marginBottom: 12, flexDirection: 'row', width: '100%' },
  myMsgWrapper: { justifyContent: 'flex-end' },
  theirMsgWrapper: { justifyContent: 'flex-start' },
  msgBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  myMsgBubble: {
    backgroundColor: '#FF4500',
    borderBottomRightRadius: 4,
  },
  theirMsgBubble: {
    backgroundColor: '#1E1E1E',
    borderBottomLeftRadius: 4,
  },
  msgText: { fontSize: 15, lineHeight: 20 },
  myMsgText: { color: '#fff' },
  theirMsgText: { color: '#E0E0E0' },
  msgImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 8 },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'right' },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingBottom: Platform.OS === 'ios' ? 0 : 4, // Minor gap for Android visibility
  },
  imageAction: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF4500',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  replyPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  replyPreviewBar: { width: 4, height: '100%', backgroundColor: '#FF4500', borderRadius: 2, marginRight: 10 },
  replyPreviewContent: { flex: 1 },
  replyPreviewTitle: { color: '#FF4500', fontSize: 12, fontWeight: 'bold' },
  replyPreviewText: { color: '#888', fontSize: 13 },
  replyQuote: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF4500',
  },
  myReplyQuote: { borderLeftColor: '#fff' },
  theirReplyQuote: { borderLeftColor: '#FF4500' },
  replyQuoteTitle: { fontSize: 12, fontWeight: 'bold', color: '#FF4500' },
  replyQuoteText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  sendingText: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', marginTop: 2, textAlign: 'right' },
  modalBg: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  modalCloseArea: { ...StyleSheet.absoluteFillObject },
  fullImage: { width: '100%', height: '80%' },
  fullCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
});
