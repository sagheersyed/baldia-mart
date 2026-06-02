import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { paymentsApi } from '../api/api';

/**
 * PaymentWebViewScreen
 *
 * Opens the JazzCash / EasyPaisa hosted checkout inside a WebView.
 * Listens for postMessage from the callback HTML to detect payment result.
 *
 * Route params:
 *   orderId    - the order being paid for
 *   provider   - 'jazzcash' | 'easypaisa'
 *   amount     - total amount in PKR
 */
export default function PaymentWebViewScreen({ navigation, route }: any) {
  const { orderId, provider, amount } = route.params;
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    initiatePayment();
  }, []);

  const initiatePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await paymentsApi.initiate({
        orderId,
        provider,
        amount,
      });

      const { formUrl, formFields } = res.data;

      if (!formUrl || !formFields) {
        throw new Error('Invalid payment response from server');
      }

      // Build an auto-submitting HTML form that POSTs to the provider
      const hiddenInputs = Object.entries(formFields)
        .map(([key, value]) => `<input type="hidden" name="${key}" value="${String(value).replace(/"/g, '&quot;')}" />`)
        .join('\n');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Redirecting to ${provider === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'}...</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: ${provider === 'jazzcash' ? '#E31837' : '#4CAF50'};
              color: #fff;
            }
            .loader {
              text-align: center;
            }
            .spinner {
              width: 40px; height: 40px;
              border: 4px solid rgba(255,255,255,0.3);
              border-top: 4px solid #fff;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            h2 { font-size: 18px; font-weight: 600; }
            p { font-size: 14px; opacity: 0.8; }
          </style>
        </head>
        <body>
          <div class="loader">
            <div class="spinner"></div>
            <h2>Redirecting to ${provider === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'}</h2>
            <p>Please wait...</p>
          </div>
          <form id="paymentForm" method="POST" action="${formUrl}">
            ${hiddenInputs}
          </form>
          <script>
            document.getElementById('paymentForm').submit();
          </script>
        </body>
        </html>
      `;

      setHtmlContent(html);
    } catch (e: any) {
      console.error('Payment initiation failed:', e);
      setError(e.response?.data?.message || e.message || 'Failed to start payment');
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PAYMENT_RESULT') {
        if (data.status === 'paid') {
          Alert.alert(
            '✅ Payment Successful',
            'Your payment has been processed successfully!',
            [{ text: 'Track Order', onPress: () => navigation.replace('OrderTracking', { orderId: data.orderId }) }]
          );
        } else {
          Alert.alert(
            '❌ Payment Failed',
            'Your payment could not be processed. You can retry or choose Cash on Delivery.',
            [
              { text: 'Go Back', onPress: () => navigation.goBack() },
              { text: 'Retry', onPress: () => initiatePayment() },
            ]
          );
        }
      }
    } catch (e) {
      // Not a JSON message, ignore
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF4500" />
          <Text style={styles.loadingText}>Preparing payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Payment Error</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={initiatePayment}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          Alert.alert(
            'Cancel Payment?',
            'Are you sure you want to cancel this payment?',
            [
              { text: 'No', style: 'cancel' },
              { text: 'Yes, Cancel', style: 'destructive', onPress: () => navigation.goBack() },
            ]
          );
        }} style={styles.headerBackBtn}>
          <Text style={styles.headerBackText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {provider === 'jazzcash' ? '💳 JazzCash' : '💚 EasyPaisa'} Payment
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* WebView */}
      {htmlContent && (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webviewLoader}>
              <ActivityIndicator size="large" color="#FF4500" />
            </View>
          )}
          style={{ flex: 1 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  errorMsg: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  retryBtn: { backgroundColor: '#FF4500', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginBottom: 12 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  backBtn: { paddingHorizontal: 32, paddingVertical: 14 },
  backBtnText: { color: '#666', fontWeight: '600', fontSize: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    elevation: 2,
  },
  headerBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  headerBackText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  webviewLoader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});
