import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput, Image,
  Alert, ActivityIndicator, Pressable, Switch,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { cmsApi, uploadApi, categoriesApi, brandsApi } from '../../api/api';
import { useCmsStore } from '../../store/cmsStore';
import AppText from '../../components/ui/AppText';
import { theme } from '../../theme/theme';

const ACCENT_MAP: Record<string, string> = {
  grocery: '#10B981', mart: '#10B981',
  restaurant: '#F59E0B', food: '#F59E0B',
  pharmacy: '#6366F1', pharma: '#6366F1',
};

const VERTICAL_LABELS: Record<string, string> = {
  grocery: 'Product', mart: 'Product',
  restaurant: 'Dish', food: 'Dish',
  pharmacy: 'Medicine', pharma: 'Medicine',
};

export default function AddNewItemFormScreen({ navigation, route }: any) {
  const vertical: string = route?.params?.vertical ?? 'grocery';
  const prefillName: string = route?.params?.prefillName ?? '';
  const { activeTenantId } = useCmsStore();
  const tenantId: string = route?.params?.tenantId ?? activeTenantId ?? '';

  const accent = ACCENT_MAP[vertical] ?? '#10B981';
  const label  = VERTICAL_LABELS[vertical] ?? 'Item';

  const [name, setName]               = useState(prefillName);
  const [description, setDescription] = useState('');
  const [price, setPrice]             = useState('');
  const [imageUri, setImageUri]       = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);

  const [categoryId, setCategoryId]   = useState('');
  const [brandId, setBrandId]         = useState('');
  const [unit, setUnit]               = useState('');
  const [weight, setWeight]           = useState('');
  const [stockQty, setStockQty]       = useState('');
  const [categories, setCategories]   = useState<any[]>([]);
  const [brands, setBrands]           = useState<any[]>([]);

  const [genericName, setGenericName] = useState('');
  const [brand, setBrand]             = useState('');
  const [dosageForm, setDosageForm]   = useState('');
  const [strength, setStrength]       = useState('');
  const [packSize, setPackSize]       = useState('');
  const [requiresRx, setRequiresRx]   = useState(false);

  const [category, setCategory]       = useState('');
  const [prepTime, setPrepTime]       = useState('');

  useEffect(() => {
    if (vertical === 'grocery' || vertical === 'mart') {
      categoriesApi.getAll('mart').then(r => setCategories(r.data ?? [])).catch(() => {});
      brandsApi.getAll('mart').then(r => setBrands(r.data ?? [])).catch(() => {});
    }
  }, [vertical]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Denied', 'Gallery access is needed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Denied', 'Camera access is needed.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setImageUri(result.assets[0].uri);
  };

  const validate = (): boolean => {
    if (!name.trim()) { Alert.alert('Required', `Please enter ${label.toLowerCase()} name.`); return false; }
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) { Alert.alert('Required', 'Enter a valid price.'); return false; }
    if ((vertical === 'grocery' || vertical === 'mart' || vertical === 'pharmacy' || vertical === 'pharma') && !stockQty.trim()) {
      Alert.alert('Required', 'Enter stock quantity.'); return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (imageUri) { const res = await uploadApi.uploadFile(imageUri); imageUrl = res.data?.url; }

      if (vertical === 'grocery' || vertical === 'mart') {
        await cmsApi.requestBrandNewProduct(tenantId, {
          name: name.trim(), description: description.trim() || undefined, price: Number(price),
          categoryId: categoryId || undefined, brandId: brandId || undefined, imageUrl,
          unit: unit.trim() || undefined, weight: weight.trim() || undefined, stockQty: Number(stockQty) || 0,
        });
      } else if (vertical === 'pharmacy' || vertical === 'pharma') {
        await cmsApi.requestBrandNewMedicine(tenantId, {
          name: name.trim(), genericName: genericName.trim() || undefined, brand: brand.trim() || undefined,
          mrp: Number(price), dosageForm: dosageForm.trim() || undefined, strength: strength.trim() || undefined,
          packSize: packSize.trim() || undefined, imageUrl, requiresPrescription: requiresRx,
          stockQuantity: Number(stockQty) || 0,
        });
      } else {
        await cmsApi.requestNewMenuItem(tenantId, {
          name: name.trim(), description: description.trim() || undefined, price: Number(price),
          category: category.trim() || undefined, imageUrl, prepTimeMinutes: prepTime ? Number(prepTime) : undefined,
        });
      }
      Alert.alert('Request Submitted ✓', `Your ${label.toLowerCase()} request has been submitted for review.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || `Failed to submit ${label.toLowerCase()} request.`);
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[accent + '22', 'transparent']} style={styles.headerGradient}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <AppText variant="title">Add New {label}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>Submit for admin approval</AppText>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.infoBanner, { borderColor: accent + '40', backgroundColor: accent + '10' }]}>
            <Ionicons name="information-circle" size={22} color={accent} />
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ flex: 1, marginLeft: 10 }}>
              This {label.toLowerCase()} will be reviewed by an admin before appearing in the catalog.
            </AppText>
          </View>

          <AppText variant="bodyStrong" style={styles.sectionTitle}>{label} Image</AppText>
          <View style={styles.imageRow}>
            {imageUri ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: imageUri }} style={styles.previewImg} resizeMode="cover" />
                <Pressable style={styles.removeImgBtn} onPress={() => setImageUri(null)}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </Pressable>
              </View>
            ) : (
              <>
                <Pressable style={[styles.imgBtn, { borderColor: accent + '60' }]} onPress={pickImage}>
                  <Ionicons name="images-outline" size={28} color={accent} />
                  <AppText variant="caption" color={accent} style={{ marginTop: 4 }}>Gallery</AppText>
                </Pressable>
                <Pressable style={[styles.imgBtn, { borderColor: accent + '60' }]} onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={28} color={accent} />
                  <AppText variant="caption" color={accent} style={{ marginTop: 4 }}>Camera</AppText>
                </Pressable>
              </>
            )}
          </View>

          <AppText variant="bodyStrong" style={styles.sectionTitle}>Basic Details</AppText>
          <FL label={`${label} Name *`} />
          <TextInput style={styles.input} placeholder={`Enter ${label.toLowerCase()} name`} placeholderTextColor={theme.colors.textMuted} value={name} onChangeText={setName} />
          <FL label="Description" />
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Brief description…" placeholderTextColor={theme.colors.textMuted} value={description} onChangeText={setDescription} multiline />
          <FL label={vertical === 'pharmacy' || vertical === 'pharma' ? 'MRP (₨) *' : 'Price (₨) *'} />
          <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={theme.colors.textMuted} value={price} onChangeText={setPrice} keyboardType="numeric" />

          {(vertical === 'grocery' || vertical === 'mart') && (
            <>
              <AppText variant="bodyStrong" style={styles.sectionTitle}>Product Details</AppText>
              <FL label="Category" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {categories.map((c: any) => (
                  <Pressable key={c.id} style={[styles.chip, categoryId === c.id && { backgroundColor: accent, borderColor: accent }]} onPress={() => setCategoryId(categoryId === c.id ? '' : c.id)}>
                    <AppText variant="caption" color={categoryId === c.id ? '#fff' : theme.colors.textPrimary}>{c.name}</AppText>
                  </Pressable>
                ))}
              </ScrollView>
              <FL label="Brand" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {brands.slice(0, 20).map((b: any) => (
                  <Pressable key={b.id} style={[styles.chip, brandId === b.id && { backgroundColor: accent, borderColor: accent }]} onPress={() => setBrandId(brandId === b.id ? '' : b.id)}>
                    <AppText variant="caption" color={brandId === b.id ? '#fff' : theme.colors.textPrimary}>{b.name}</AppText>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FL label="Unit" />
                  <TextInput style={styles.input} placeholder="kg, g, pcs" placeholderTextColor={theme.colors.textMuted} value={unit} onChangeText={setUnit} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <FL label="Weight / Size" />
                  <TextInput style={styles.input} placeholder="500g, 1L" placeholderTextColor={theme.colors.textMuted} value={weight} onChangeText={setWeight} />
                </View>
              </View>
              <FL label="Stock Quantity *" />
              <TextInput style={styles.input} placeholder="0" placeholderTextColor={theme.colors.textMuted} value={stockQty} onChangeText={setStockQty} keyboardType="numeric" />
            </>
          )}

          {(vertical === 'pharmacy' || vertical === 'pharma') && (
            <>
              <AppText variant="bodyStrong" style={styles.sectionTitle}>Medicine Details</AppText>
              <FL label="Generic Name" />
              <TextInput style={styles.input} placeholder="e.g. Paracetamol" placeholderTextColor={theme.colors.textMuted} value={genericName} onChangeText={setGenericName} />
              <FL label="Brand / Manufacturer" />
              <TextInput style={styles.input} placeholder="e.g. GSK, Sanofi" placeholderTextColor={theme.colors.textMuted} value={brand} onChangeText={setBrand} />
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FL label="Dosage Form" />
                  <TextInput style={styles.input} placeholder="Tablet, Syrup" placeholderTextColor={theme.colors.textMuted} value={dosageForm} onChangeText={setDosageForm} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <FL label="Strength" />
                  <TextInput style={styles.input} placeholder="500mg" placeholderTextColor={theme.colors.textMuted} value={strength} onChangeText={setStrength} />
                </View>
              </View>
              <FL label="Pack Size" />
              <TextInput style={styles.input} placeholder="e.g. 10 tablets" placeholderTextColor={theme.colors.textMuted} value={packSize} onChangeText={setPackSize} />
              <FL label="Stock Quantity *" />
              <TextInput style={styles.input} placeholder="0" placeholderTextColor={theme.colors.textMuted} value={stockQty} onChangeText={setStockQty} keyboardType="numeric" />
              <View style={[styles.switchRow, { borderColor: accent + '30' }]}>
                <View style={{ flex: 1 }}>
                  <AppText variant="body">Requires Prescription</AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary}>Enable if this medicine needs a valid prescription</AppText>
                </View>
                <Switch value={requiresRx} onValueChange={setRequiresRx} trackColor={{ false: theme.colors.border, true: accent + '80' }} thumbColor={requiresRx ? accent : '#ccc'} />
              </View>
            </>
          )}

          {(vertical === 'restaurant' || vertical === 'food') && (
            <>
              <AppText variant="bodyStrong" style={styles.sectionTitle}>Dish Details</AppText>
              <FL label="Category" />
              <TextInput style={styles.input} placeholder="e.g. Biryani, BBQ" placeholderTextColor={theme.colors.textMuted} value={category} onChangeText={setCategory} />
              <FL label="Preparation Time (minutes)" />
              <TextInput style={styles.input} placeholder="e.g. 30" placeholderTextColor={theme.colors.textMuted} value={prepTime} onChangeText={setPrepTime} keyboardType="numeric" />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <Pressable style={[styles.submitBtn, { backgroundColor: accent }, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="send-outline" size={20} color="#fff" />
              <AppText variant="bodyStrong" color="#fff" style={{ marginLeft: 8 }}>Submit {label} Request</AppText>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function FL({ label }: { label: string }) {
  return <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginBottom: 6 }}>{label}</AppText>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  headerGradient: { paddingBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: theme.radius.lg, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { marginTop: 20, marginBottom: 10 },
  imageRow: { flexDirection: 'row', gap: 12 },
  imgBtn: { width: 100, height: 100, borderRadius: theme.radius.md, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surfaceMuted },
  imagePreview: { width: 120, height: 120, borderRadius: theme.radius.md, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  previewImg: { width: '100%', height: '100%' },
  removeImgBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 12 },
  input: { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 },
  row: { flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8, backgroundColor: theme.colors.surface },
  switchRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: theme.radius.lg, borderWidth: 1, backgroundColor: theme.colors.surface, marginTop: 12 },
  bottomBar: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  submitBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: theme.radius.lg, ...theme.shadows.md },
});
