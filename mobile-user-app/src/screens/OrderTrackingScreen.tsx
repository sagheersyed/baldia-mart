import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, TextInput, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { isBusinessOpen } from '../utils/helpers';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { useSettings } from '../context/SettingsContext';
import { generateReceiptPDF, printReceipt } from '../utils/receiptGenerator';

export default function OrderTrackingScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const { settings } = useSettings();

  const {
    order, status, loading, rider, riderLocation, localItems, timeline,
    showRating, ratingStep, businessesToRate, currentBusinessIndex,
    rating, setRating, comment, setComment,
    businessRating, setBusinessRating, businessComment, setBusinessComment,
    submittingReview,
    showAddProduct, setShowAddProduct, filteredProducts, searchQuery, setSearchQuery, addingProductId,
    steps, currentStepIndex,
    fetchOrderDetails, hasChanges,
    handleReorder: _handleReorder, handleUpdateQuantityLocal, handleConfirmBatchUpdates, handleRemoveItem,
    handleAddNewProductToOrder, handleDismissRating, handleSubmitReview, handleApproveQuotation,
    handleCancelRashanRequest,
  } = useOrderTracking(orderId, navigation);

  const handleReorder = () => {
    Alert.alert(
      'Reorder',
      'Would you like to place the same order again?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Reorder', onPress: _handleReorder },
      ]
    );
  };

  const handleRemoveItemWithConfirm = (itemId: string, itemName: string) => {
    Alert.alert(
      'Remove Item',
      `Are you sure you want to remove ${itemName} from your order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => handleRemoveItem(itemId) },
      ]
    );
  };

  const handleConfirmUpdatesWithAlert = async () => {
    try {
      await handleConfirmBatchUpdates();
      Alert.alert('Success', 'Order updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update order.');
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Order</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF4500" />
          <Text style={{ marginTop: 12, color: '#999', fontSize: 14 }}>Loading order status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {status === 'cancelled' ? (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledIcon}>🛑</Text>
            <Text style={styles.cancelledTitle}>Order Cancelled</Text>
            <Text style={styles.cancelledSubtitle}>
              {order?.notes || 'This order was cancelled. Please try reordering or contact support.'}
            </Text>
            {!order?.notes?.includes('missing') && (
              <TouchableOpacity style={styles.reorderBtn} onPress={handleReorder}>
                <Text style={styles.reorderBtnText}>🔄 Reorder Now</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.premiumStatusCard}>
            <View style={styles.topRow}>
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeLabel}>ORDER ID</Text>
                <Text style={styles.idBadgeValue}>#{orderId.slice(0, 8).toUpperCase()}</Text>
              </View>
              <View style={styles.typeTag}>
                <Text style={styles.typeTagText}>
                  {order?.orderType === 'food' ? '🍽️ FOOD' : order?.orderType === 'rashan' ? '📦 RASHAN BULK' : '🛒 MART'}
                </Text>
              </View>
            </View>
            <View style={styles.mainStatusContent}>
              <Text style={styles.statusHighlight}>
                {steps[currentStepIndex]?.label || 'Processing...'}
              </Text>
              <Text style={styles.statusSubtext}>
                {steps[currentStepIndex]?.description}
              </Text>
              {status === 'delivered' && (
                <View style={styles.receiptActionRow}>
                  <TouchableOpacity 
                    style={[styles.receiptDownloadBtn, { flex: 1, marginRight: 8, backgroundColor: '#FF450015' }]} 
                    onPress={() => generateReceiptPDF(order)}
                  >
                    <Text style={[styles.receiptDownloadText, { color: '#FF4500' }]}>📤 Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.receiptDownloadBtn, { flex: 1, backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' }]} 
                    onPress={() => printReceipt(order)}
                  >
                    <Text style={[styles.receiptDownloadText, { color: '#fff' }]}>🖨️ View / Print</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.max(5, ((currentStepIndex + 1) / steps.length) * 100)}%` }]} />
            </View>

            {order?.orderType === 'rashan' && order.rashanStatus === 'quoted' && (
              <View style={styles.quotationBlock}>
                <Text style={styles.quoteTitle}>Quotation Received</Text>
                <View style={styles.quoteBreakdown}>
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Products (Wholesale):</Text>
                    <Text style={styles.quoteAmount}>Rs. {Number(order.subtotal || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Sourcing & Logistics:</Text>
                    <Text style={styles.quoteAmount}>Rs. {Number(order.deliveryFee || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.quoteTotalRow}>
                    <Text style={styles.quoteTotalLabel}>Final Quotation:</Text>
                    <Text style={styles.quoteTotalAmount}>Rs. {Number(order.total).toLocaleString()}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.approveBtn} onPress={handleApproveQuotation}>
                  <Text style={styles.approveBtnText}>✅ Approve & Start Sourcing</Text>
                </TouchableOpacity>
              </View>
            )}

            {order?.orderType === 'rashan' && ['pending_review', 'quoted', 'approved'].includes(order.rashanStatus) && (
              <TouchableOpacity 
                style={styles.cancelOrderBtn} 
                onPress={handleCancelRashanRequest}
              >
                <Text style={styles.cancelOrderBtnText}>🛑 Cancel Request</Text>
              </TouchableOpacity>
            )}

            {order?.orderType === 'rashan' && order.rashanStatus === 'rejected' && (
              <View style={[styles.quotationBlock, { backgroundColor: '#FFF5F5', borderColor: '#FED7D7' }]}>
                <Text style={[styles.quoteTitle, { color: '#C53030' }]}>Request Rejected</Text>
                <Text style={styles.quoteReason}>{order.adminRejectionReason || 'No reason provided.'}</Text>
              </View>
            )}
          </View>
        )}

        {order?.subOrders && order.subOrders.length > 1 && order.orderType === 'food' && (
          <View style={styles.subOrderCard}>
            <View style={styles.subOrderHeader}>
              <Text style={styles.subOrderTitle}>
                {order.orderType === 'food' ? 'Batch Order' : 'Multi-Vendor Route'}
              </Text>
              <Text style={styles.subOrderCount}>
                {order.subOrders.length} {order.orderType === 'food' ? 'Restaurants' : 'Shops'}
              </Text>
            </View>
            <View style={styles.subOrderList}>
              {order.subOrders.map((sub: any, idx: number) => {
                const isMart = order.orderType === 'mart';
                const statusColors: any = {
                  pending: { bg: '#F7FAFC', text: '#718096' },
                  confirmed: { bg: '#EBF8FF', text: '#3182CE' },
                  preparing: { bg: '#FFF5F5', text: '#E53E3E' },
                  ready: { bg: '#F0FFF4', text: '#38A169' },
                  picked_up: { bg: '#FAF5FF', text: '#805AD5' },
                  delivered: { bg: '#C6F6D5', text: '#22543D' },
                };
                const colors = statusColors[sub.status] || statusColors.pending;

                return (
                  <View key={sub.id || idx} style={styles.subOrderItem}>
                    <View style={[styles.subOrderBadge, { backgroundColor: isMart ? '#FF450015' : '#3182CE15' }]}>
                      <Text style={{ fontSize: 16 }}>{isMart ? '🛍️' : '👨‍🍳'}</Text>
                    </View>
                    <View style={styles.subOrderInfo}>
                      <View style={styles.subOrderNameRow}>
                        <Text style={styles.subOrderName} numberOfLines={1}>
                          {sub.restaurant?.name || sub.vendor?.name || (isMart ? 'Shop' : 'Restaurant')}
                        </Text>
                        <View style={[styles.statusTag, { backgroundColor: colors.bg }]}>
                          <Text style={[styles.statusTagText, { color: colors.text }]}>
                            {sub.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.subOrderLoc} numberOfLines={1}>
                        {sub.restaurant?.location || sub.vendor?.location || sub.vendor?.address || 'Baldia Town Center'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {rider && (
          <View style={styles.riderCard}>
            <View style={styles.riderInfo}>
              <View style={styles.riderAvatar}>
                <Text style={styles.riderAvatarText}>{rider.name?.[0] || 'R'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.riderName}>{rider.name || 'Your Rider'}</Text>
                <Text style={styles.riderStatus}>Assign to your delivery</Text>
              </View>
              {settings?.feature_chat_enabled === true && (
                <TouchableOpacity
                  style={[styles.callBtn, { marginRight: 10, backgroundColor: '#FF450015' }]}
                  onPress={() => navigation.navigate('OrderChat', { orderId, riderName: rider.name })}
                >
                  <Text style={{ fontSize: 18 }}>💬</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => {
                  const { Linking } = require('react-native');
                  Linking.openURL(`tel:${rider.phoneNumber}`);
                }}
              >
                <Text style={styles.callIcon}>📞</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {order && order.orderType === 'rashan' && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Bulk Rashan Details</Text>
            
            {order.bulkListPhotoUrl && (
              <View style={{ marginBottom: 15 }}>
                <Text style={styles.detailLabel}>Grocery List Photo:</Text>
                <Image 
                  source={{ uri: order.bulkListPhotoUrl }} 
                  style={{ width: '100%', height: 200, borderRadius: 12, marginTop: 8 }} 
                  contentFit="cover"
                />
              </View>
            )}

            {order.bulkListText && (
              <View style={{ marginBottom: 15 }}>
                <Text style={styles.detailLabel}>Grocery List Item(s):</Text>
                <View style={styles.textListPanel}>
                  <Text style={styles.textListContent}>{order.bulkListText}</Text>
                </View>
              </View>
            )}

            <View style={styles.logisticsGrid}>
              <View style={styles.logisticsItem}>
                <Text style={styles.logisticsLabel}>Weight</Text>
                <Text style={styles.logisticsValue}>{order.bulkWeightTier?.toUpperCase()}</Text>
              </View>
              <View style={styles.logisticsItem}>
                <Text style={styles.logisticsLabel}>Floor</Text>
                <Text style={styles.logisticsValue}>{order.bulkFloor}</Text>
              </View>
              <View style={styles.logisticsItem}>
                <Text style={styles.logisticsLabel}>Placement</Text>
                <Text style={styles.logisticsValue}>{order.bulkPlacement?.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />
            <Text style={styles.detailLabel}>Delivery Address:</Text>
            <Text style={styles.addressLine}>{order.bulkStreetAddress}, {order.bulkCity}</Text>
            {order.bulkLandmark && <Text style={styles.landmarkLine}>Near {order.bulkLandmark}</Text>}
            <Text style={styles.phoneLine}>📞 {order.bulkMobileNumber}</Text>
            
            {order.total > 0 && (
              <>
                <View style={styles.summaryDivider} />
                <View style={styles.rashanFinancials}>
                   <View style={styles.rashanPriceRow}>
                      <Text style={styles.rashanPriceLabel}>Market Products Total:</Text>
                      <Text style={styles.rashanPriceValue}>Rs. {Number(order.subtotal || 0).toLocaleString()}</Text>
                   </View>
                   <View style={styles.rashanPriceRow}>
                      <Text style={styles.rashanPriceLabel}>Sourcing & Delivery Fee:</Text>
                      <Text style={styles.rashanPriceValue}>Rs. {Number(order.deliveryFee || 0).toLocaleString()}</Text>
                   </View>
                   <View style={[styles.rashanPriceRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' }]}>
                      <Text style={[styles.rashanPriceLabel, { fontWeight: '800', color: '#1A1A1A' }]}>Grand Total:</Text>
                      <Text style={[styles.rashanPriceValue, { fontSize: 18, color: '#FF4500' }]}>Rs. {Number(order.total).toLocaleString()}</Text>
                   </View>
                </View>
              </>
            )}
          </View>
        )}

        {order && order.items && order.items.length > 0 && order.orderType !== 'rashan' && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            
            {localItems.filter((i: any) => i.status !== 'missing').map((itemValue: any) => (
              <View key={itemValue.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {itemValue.menuItem?.name || itemValue.product?.name || 'Item'}
                  </Text>
                  <Text style={styles.itemPrice}>Rs. {itemValue.priceAtTime} x {itemValue.quantity}</Text>
                </View>
                {(status === 'pending' || status === 'confirmed') && order.orderType === 'mart' ? (
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => handleUpdateQuantityLocal(itemValue.id, itemValue.quantity - 1)}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{itemValue.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => handleUpdateQuantityLocal(itemValue.id, itemValue.quantity + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.itemName}>{itemValue.quantity}x</Text>
                )}
              </View>
            ))}

            {order.items.filter((i: any) => i.status === 'missing').length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={[styles.summaryTitle, { color: '#E53E3E', fontSize: 13 }]}>⚠️ Missing Items (Not Charged)</Text>
                {order.items.filter((i: any) => i.status === 'missing').map((itemValue: any) => (
                  <View key={itemValue.id} style={[styles.itemRow, { opacity: 0.6 }]}>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { textDecorationLine: 'line-through' }]}>
                        {itemValue.menuItem?.name || itemValue.product?.name || 'Item'}
                      </Text>
                      <Text style={styles.itemPrice}>Marked as missing by rider</Text>
                    </View>
                    <Text style={[styles.itemName, { color: '#E53E3E', fontWeight: 'bold' }]}>MISSING</Text>
                  </View>
                ))}
              </View>
            )}

            {(status === 'pending' || status === 'confirmed') && order?.orderType !== 'food' && (
              <View style={styles.summaryActionsRow}>
                {hasChanges() && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.confirmBtn]}
                    onPress={handleConfirmBatchUpdates}
                  >
                    <Text style={styles.confirmBtnText}>Confirm Changes</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.addBtn, !hasChanges() && { flex: 1 }]}
                  onPress={() => setShowAddProduct(true)}
                >
                  <Text style={styles.addBtnText}>
                    + Add {order?.orderType === 'food' ? 'Dish' : 'Product'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.summaryDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalText}>Rs. {Number(order.total).toFixed(0)}</Text>
            </View>
          </View>
        )}

        <View style={styles.timelineContainer}>
          {steps.map((step, index) => {
            const historyItem = timeline.find(h => h.status === step.key);
            const isCompleted = !!historyItem;
            const isCurrent = index === currentStepIndex;
            const isLast = index === steps.length - 1;
            const isPassed = isCompleted || isCurrent;

            return (
              <View key={step.key} style={styles.timelineItem}>
                <View style={styles.leftColumn}>
                  <View style={[
                    styles.indicator,
                    isPassed && styles.passedIndicator,
                    isCurrent && styles.currentIndicator
                  ]}>
                    <Text style={styles.stepIcon}>{step.icon}</Text>
                  </View>
                  {!isLast && <View style={[styles.connector, isCompleted && styles.passedConnector]} />}
                </View>
                <View style={styles.rightColumn}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[
                      styles.stepLabel,
                      isPassed && styles.passedStepLabel,
                      isCurrent && styles.currentStepLabel
                    ]}>
                      {step.label}
                    </Text>
                    {historyItem && (
                      <Text style={styles.timeLabel}>
                        {new Date(historyItem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Modal visible={showRating} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.ratingBox}>
              {ratingStep === 1 ? (
                <>
                  <Text style={styles.ratingTitle}>Rate your Rider</Text>
                  <Text style={styles.ratingSubtitle}>How was your delivery experience with {rider?.name || 'your rider'}?</Text>

                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <TouchableOpacity key={s} onPress={() => setRating(s)}>
                        <Text style={[styles.star, rating >= s && styles.activeStar]}>★</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={styles.commentInput}
                    placeholder="Share your delivery experience..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                    value={comment}
                    onChangeText={setComment}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.ratingTitle}>
                    Rate {businessesToRate[currentBusinessIndex]?.name || (order?.orderType === 'food' ? 'Restaurant' : 'Products')}
                  </Text>
                  <Text style={styles.ratingSubtitle}>
                    Step {currentBusinessIndex + 1} of {businessesToRate.length}: How was the quality of your {order?.orderType === 'food' ? 'meal' : 'items'}?
                  </Text>

                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <TouchableOpacity key={s} onPress={() => setBusinessRating(s)}>
                        <Text style={[styles.star, businessRating >= s && styles.activeStar]}>★</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={styles.commentInput}
                    placeholder={`Tell us about the ${order?.orderType === 'food' ? 'food' : 'products'}...`}
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                    value={businessComment}
                    onChangeText={setBusinessComment}
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.submitRatingBtn, submittingReview && { opacity: 0.7 }]}
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitRatingText}>
                    {ratingStep === 1
                      ? (businessesToRate.length > 0 ? 'Next: Rate Business' : 'Finish')
                      : (currentBusinessIndex < businessesToRate.length - 1 ? 'Next Business' : 'Submit Feedback')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeRatingBtn} onPress={handleDismissRating}>
                <Text style={styles.closeRatingText}>Maybe later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Add Product Modal */}
        <Modal visible={showAddProduct} transparent animationType="slide">
          <View style={styles.addProductOverlay}>
            <SafeAreaView style={styles.addProductCardWrapper}>
              <View style={styles.addProductCard}>
                <View style={styles.addProductHeader}>
                  <Text style={styles.addProductTitle}>Add {order?.orderType === 'food' ? 'Dishes' : 'Items'} to Order</Text>
                  <TouchableOpacity style={styles.addProductCloseBtn} onPress={() => setShowAddProduct(false)}>
                    <Text style={styles.addProductCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.searchBox}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder={order?.orderType === 'food' ? "Search dishes..." : "Search fresh products..."}
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <FlatList
                  data={filteredProducts}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ListEmptyComponent={() => (
                    <Text style={{ textAlign: 'center', marginTop: 30, color: '#999' }}>No products found!</Text>
                  )}
                  renderItem={({ item }) => {
                    const price = Number(item.price) - Number(item.discount || 0);
                    return (
                      <View style={styles.addProductRow}>
                        <View style={styles.addProdPic}>
                          {item.imageUrl ? (
                            <Image source={{ uri: item.imageUrl }} style={styles.addProdImg} />
                          ) : (
                            <Text>📦</Text>
                          )}
                        </View>
                        <View style={styles.addProdInfo}>
                          <Text style={styles.addProdName}>{item.name}</Text>
                          <Text style={styles.addProdPrice}>Rs. {price.toFixed(0)}</Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.addBtnSmall,
                            (item.stockQuantity < 1 || !isBusinessOpen(item.openingTime, item.closingTime)) && { opacity: 0.5, backgroundColor: '#999' }
                          ]}
                          disabled={item.stockQuantity < 1 || addingProductId === item.id || !isBusinessOpen(item.openingTime, item.closingTime)}
                          onPress={() => handleAddNewProductToOrder(item.id)}
                        >
                          {addingProductId === item.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.addBtnSmallText}>
                              {item.stockQuantity < 1 ? 'Out' : (!isBusinessOpen(item.openingTime, item.closingTime) ? 'Closed' : '+ Add')}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                />
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </ScrollView>

      <TouchableOpacity
        style={styles.homeBtn}
        onPress={() => navigation.navigate('Main')}
      >
        <Text style={styles.homeBtnText}>Back to Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 20, color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginLeft: 15 },
  scrollContent: { padding: 20 },

  cancelledBanner: {
    backgroundColor: '#FFF5F5', borderRadius: 20, padding: 30,
    alignItems: 'center', borderWidth: 1, borderColor: '#FED7D7', marginBottom: 20,
  },
  cancelledIcon: { fontSize: 40, marginBottom: 10 },
  cancelledTitle: { fontSize: 20, fontWeight: '800', color: '#C53030' },
  cancelledSubtitle: { fontSize: 14, color: '#9B2C2C', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  reorderBtn: {
    marginTop: 20, backgroundColor: '#FF4500', paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 14, elevation: 3, shadowColor: '#FF4500', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  reorderBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  statusCard: {
    backgroundColor: '#FF4500', borderRadius: 24, padding: 25,
    marginBottom: 20, elevation: 8, shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  premiumStatusCard: {
    backgroundColor: '#fff', borderRadius: 28, padding: 25,
    marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 15, elevation: 3, borderWidth: 1, borderColor: '#F0F0F0',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  idBadge: { backgroundColor: '#F7FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#EDF2F7' },
  idBadgeLabel: { fontSize: 10, fontWeight: '800', color: '#718096', letterSpacing: 1 },
  idBadgeValue: { fontSize: 14, fontWeight: '800', color: '#1A202C', marginTop: 2 },
  typeTag: { backgroundColor: '#FF450015', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeTagText: { fontSize: 10, fontWeight: '800', color: '#FF4500' },
  mainStatusContent: { marginBottom: 20 },
  statusHighlight: { fontSize: 28, fontWeight: '900', color: '#1A202C', letterSpacing: -0.5 },
  statusSubtext: { fontSize: 14, color: '#718096', marginTop: 6, lineHeight: 20 },
  progressBarBg: { height: 6, backgroundColor: '#EDF2F7', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FF4500', borderRadius: 3 },

  orderIdLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  orderIdValue: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  mainStatusContainer: { marginTop: 25 },
  mainStatusText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  mainStatusDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4 },

  timelineContainer: { paddingHorizontal: 10 },
  timelineItem: { flexDirection: 'row', marginBottom: 5 },
  leftColumn: { alignItems: 'center', width: 50 },
  indicator: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
    zIndex: 2,
  },
  passedIndicator: { borderColor: '#FF4500' },
  currentIndicator: { backgroundColor: '#FF4500', borderColor: '#FF4500', elevation: 4 },
  stepIcon: { fontSize: 20 },
  connector: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: -10, zIndex: 1 },
  passedConnector: { backgroundColor: '#FF4500' },

  rightColumn: { flex: 1, paddingLeft: 15, paddingBottom: 35, paddingTop: 6 },
  stepLabel: { fontSize: 16, fontWeight: '600', color: '#A0AEC0' },
  passedStepLabel: { color: '#2D3748' },
  currentStepLabel: { color: '#FF4500', fontWeight: '800' },
  stepDescription: { fontSize: 13, color: '#718096', marginTop: 4 },

  homeBtn: {
    margin: 20, backgroundColor: '#1A1A1A', height: 55, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  homeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  riderCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  riderInfo: { flexDirection: 'row', alignItems: 'center' },
  riderAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FF450015', justifyContent: 'center', alignItems: 'center' },
  riderAvatarText: { color: '#FF4500', fontSize: 20, fontWeight: '800' },
  riderName: { fontSize: 16, fontWeight: '700', color: '#2D3748' },
  riderStatus: { fontSize: 13, color: '#A0AEC0', marginTop: 2 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDF2F7', justifyContent: 'center', alignItems: 'center' },
  callIcon: { fontSize: 18 },

  summaryCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#2D3748', marginBottom: 15 },
  groupHeader: {
    fontSize: 14, fontWeight: 'bold', color: '#B45309',
    backgroundColor: '#FFFBEB', padding: 8, borderRadius: 8,
    marginBottom: 10, marginTop: 5, borderLeftWidth: 3, borderLeftColor: '#F59E0B'
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, color: '#2D3748', fontWeight: '500' },
  itemPrice: { fontSize: 12, color: '#718096', marginTop: 2 },
  removeItemBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  removeIcon: { color: '#E53E3E', fontSize: 10, fontWeight: 'bold' },
  summaryDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#718096' },
  totalText: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },

  subOrderCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20,
    marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 12, elevation: 2,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  subOrderHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F7FAFC',
    paddingBottom: 10,
  },
  subOrderTitle: { fontSize: 15, fontWeight: '800', color: '#2D3748' },
  subOrderCount: { fontSize: 12, fontWeight: '700', color: '#A0AEC0' },
  subOrderList: { gap: 12 },
  subOrderItem: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  subOrderBadge: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  subOrderInfo: { flex: 1 },
  subOrderNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subOrderName: { fontSize: 14, fontWeight: '700', color: '#1A202C', maxWidth: '65%' },
  subOrderLoc: { fontSize: 12, color: '#718096', marginTop: 2 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusTagText: { fontSize: 10, fontWeight: '800' },

  quantityControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 10, padding: 4 },
  qtyBtn: { width: 32, height: 32, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
  qtyBtnText: { fontSize: 18, fontWeight: 'bold', color: '#FF4500' },
  qtyText: { marginHorizontal: 12, fontSize: 15, fontWeight: '700', color: '#2D3748' },

  timeLabel: { fontSize: 11, color: '#A0AEC0', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  ratingBox: { backgroundColor: '#fff', borderRadius: 28, padding: 30, alignItems: 'center' },
  ratingTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  ratingSubtitle: { fontSize: 14, color: '#718096', textAlign: 'center', marginTop: 8, marginBottom: 25 },
  starsRow: { flexDirection: 'row', marginBottom: 25 },
  star: { fontSize: 40, color: '#E2E8F0', marginHorizontal: 6 },
  activeStar: { color: '#FFD700' },
  commentInput: { width: '100%', backgroundColor: '#F7FAFC', borderRadius: 16, padding: 15, color: '#2D3748', fontSize: 15, height: 100, textAlignVertical: 'top', marginBottom: 25 },
  submitRatingBtn: { width: '100%', height: 55, backgroundColor: '#FF4500', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  submitRatingText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  closeRatingBtn: { marginTop: 15, padding: 10 },
  closeRatingText: { color: '#718096', fontWeight: '600', fontSize: 14 },
  confirmUpdatesBtn: {
    marginTop: 15,
    backgroundColor: '#FF450015',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF450030',
  },
  confirmUpdatesBtnText: { color: '#FF4500', fontWeight: '700', fontSize: 14 },

  summaryActionsRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmBtn: { backgroundColor: '#FF450015', borderWidth: 1, borderColor: '#FF450030' },
  addBtn: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  confirmBtnText: { color: '#FF4500', fontWeight: '700', fontSize: 13 },
  addBtnText: { color: '#16A34A', fontWeight: '700', fontSize: 13 },

  addProductOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  addProductCardWrapper: { flex: 1, justifyContent: 'flex-end' },
  addProductCard: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%', padding: 20 },
  addProductHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  addProductTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  addProductCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  addProductCloseText: { fontSize: 16, color: '#666', fontWeight: 'bold' },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6FA', borderRadius: 16, paddingHorizontal: 15, marginBottom: 20 },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, height: 50, fontSize: 16, color: '#1A1A1A', fontWeight: '500' },

  addProductRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  addProdPic: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  addProdImg: { width: '100%', height: '100%' },
  addProdInfo: { flex: 1, marginLeft: 15 },
  addProdName: { fontSize: 16, fontWeight: '600', color: '#2D3748', marginBottom: 4 },
  addProdPrice: { fontSize: 14, fontWeight: '800', color: '#FF4500' },
  addBtnSmall: { backgroundColor: '#FF4500', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, minWidth: 70, alignItems: 'center' },
  addBtnSmallText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Map Styles
  mapContainer: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 20,
    overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  mapTitle: {
    fontSize: 16, fontWeight: '800', color: '#1A202C',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10,
  },
  map: { width: '100%', height: 220 },
  receiptDownloadBtn: {
    backgroundColor: '#FF450015',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginTop: 15,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FF450030',
  },
  receiptDownloadText: {
    fontWeight: '700',
    fontSize: 13,
  },
  receiptActionRow: { flexDirection: 'row', marginTop: 10, width: '100%', paddingHorizontal: 0 },
  
  // Rashan Styles
  quotationBlock: {
    marginTop: 20,
    padding: 18,
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  quoteTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 4,
  },
  quoteBreakdown: {
    marginVertical: 12,
    gap: 8,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteLabel: {
    fontSize: 13,
    color: '#075985',
    fontWeight: '600',
  },
  quoteAmount: {
    fontSize: 14,
    color: '#075985',
    fontWeight: '700',
  },
  quoteTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#BAE6FD',
  },
  quoteTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0369A1',
  },
  quoteTotalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A1A1A',
  },
  quoteReason: {
    fontSize: 14,
    color: '#C53030',
    lineHeight: 20,
  },
  approveBtn: {
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textListPanel: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textListContent: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
  logisticsGrid: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  logisticsItem: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  logisticsLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 2,
  },
  logisticsValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  addressLine: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 4,
  },
  landmarkLine: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  phoneLine: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF4500',
    marginTop: 8,
  },
  rashanFinancials: {
    gap: 6,
  },
  rashanPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rashanPriceLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  rashanPriceValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '700',
  },
  cancelOrderBtn: {
    marginTop: 15,
    backgroundColor: '#FFF5F5',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  cancelOrderBtnText: {
    color: '#C53030',
    fontWeight: '700',
    fontSize: 14,
  },
});
