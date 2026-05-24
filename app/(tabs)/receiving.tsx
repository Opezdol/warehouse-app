import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, TextInput, Modal, Portal, List, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { getCategories, getItemsByCategory, getLocations, addBatchTransaction } from '../../src/database';
import { Category, StoreItem, Location } from '../../src/types';

const ReceivingScreen = () => {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [batches, setBatches] = useState<Array<{id: number; expiryDate: string; quantity: number}>>([{id: 1, expiryDate: '', quantity: 1}]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<StoreItem[]>([]);
  
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Initialize data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const allLocations = getLocations();
        setLocations(allLocations);
        
        // Set default location to first one (Склад)
        if (allLocations.length > 0) {
          setSelectedLocation(allLocations[0]);
        }
        
        const allCategories = getCategories();
        setCategories(allCategories);
      } catch (error) {
        console.error('Error loading initial data:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить данные');
      }
    };

    loadInitialData();
  }, []);

  // Load items when category changes
  useEffect(() => {
    if (selectedCategory) {
      try {
        const categoryItems = getItemsByCategory(selectedCategory.id);
        setItems(categoryItems);
      } catch (error) {
        console.error('Error loading items:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить товары');
      }
      // При смене категории сбрасываем выбранный товар
      setSelectedItem(null);
    } else {
      setItems([]);
      setSelectedItem(null);
    }
  }, [selectedCategory]);

  const handleAddBatch = () => {
    const newId = Math.max(...batches.map(b => b.id)) + 1;
    setBatches([...batches, {id: newId, expiryDate: '', quantity: 1}]);
  };

  const handleRemoveBatch = (id: number) => {
    if (batches.length <= 1) return;
    setBatches(batches.filter(batch => batch.id !== id));
  };

  const handleBatchChange = (id: number, field: string, value: string | number) => {
    setBatches(batches.map(batch => 
      batch.id === id ? {...batch, [field]: value} : batch
    ));
  };

  const formatDate = (dateString: string): string => {
    // Handle flexible formats: 6.7.26, 06.07.2026, 6.07.26, 06.7.2026, etc.
    const parts = dateString.split(/[./-]/);
    if (parts.length === 3) {
      let [day, month, year] = parts.map(p => p.trim());
      if (day.length === 1) day = '0' + day;
      if (month.length === 1) month = '0' + month;
      if (year.length === 2) year = '20' + year;
      if (year.length === 1) year = '200' + year;
      return `${year}-${month}-${day}`;
    }
    // Also accept ISO format directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    return dateString;
  };

  const handleSave = () => {
    if (!selectedLocation || !selectedCategory || !selectedItem) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните все поля');
      return;
    }

    // Validate batches
    const batchData: { itemId: number; locationId: number; expiryDate: string; quantity: number }[] = [];
    for (const batch of batches) {
      if (!batch.expiryDate || !batch.quantity) {
        Alert.alert('Ошибка', 'Заполните все поля партий');
        return;
      }
      
      // Конвертируем дату (2.5.25 → 2025-05-02)
      const convertedDate = formatDate(batch.expiryDate);
      
      // Валидируем ISO-формат после конвертации
      if (!/^\d{4}-\d{2}-\d{2}$/.test(convertedDate)) {
        Alert.alert('Ошибка', 'Дата должна быть в формате ДД.ММ.ГГГГ (например 2.5.25 или 02.05.2025)');
        return;
      }

      batchData.push({
        itemId: selectedItem.id,
        locationId: selectedLocation.id,
        expiryDate: convertedDate,
        quantity: batch.quantity,
      });
    }

    try {
      addBatchTransaction(batchData);
      Alert.alert('Успех', `Добавлено ${batchData.length} партий`);
      // Сброс: категория и локация остаются, товар и партии сбрасываются
      resetAfterSave();
    } catch (error) {
      console.error('Error saving batches:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить партии');
    }
  };

  const resetAfterSave = () => {
    // После сохранения: категория и локация остаются, сбрасываем только товар и партии
    setSelectedItem(null);
    setBatches([{id: 1, expiryDate: '', quantity: 1}]);
  };

  const resetAll = () => {
    // Полный сброс (кнопка Отмена)
    setSelectedLocation(locations.length > 0 ? locations[0] : null);
    setSelectedCategory(null);
    setSelectedItem(null);
    setItems([]);
    setBatches([{id: 1, expiryDate: '', quantity: 1}]);
  };

  const handleCancel = () => {
    resetAll();
  };

  const renderBatchInput = (batch: {id: number; expiryDate: string; quantity: number}) => (
    <View key={batch.id} style={styles.batchRow}>
      <View style={styles.dateInputContainer}>
        <TextInput
          label="Дата окончания срока годности (ДД.ММ.ГГГГ)"
          value={batch.expiryDate}
          onChangeText={(value) => handleBatchChange(batch.id, 'expiryDate', value)}
          style={styles.dateInput}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.quantityInputContainer}>
        <TextInput
          label="Количество"
          value={batch.quantity.toString()}
          onChangeText={(value) => handleBatchChange(batch.id, 'quantity', parseInt(value) || 0)}
          style={styles.quantityInput}
          keyboardType="numeric"
        />
      </View>
      <Button 
        mode="outlined" 
        onPress={() => handleRemoveBatch(batch.id)}
        style={styles.removeButton}
      >
        Удалить
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Location Picker */}
          <Button 
            mode="outlined" 
            onPress={() => setLocationModalVisible(true)}
            style={styles.pickerButton}
          >
            {selectedLocation ? selectedLocation.name : 'Выбрать локацию'}
          </Button>
          
          {/* Category Picker */}
          <Button 
            mode="outlined" 
            onPress={() => setCategoryModalVisible(true)}
            style={styles.pickerButton}
            disabled={!selectedLocation}
          >
            {selectedCategory ? selectedCategory.name : 'Выбрать категорию'}
          </Button>
          
          {/* Item Picker */}
          <Button 
            mode="outlined" 
            onPress={() => setItemModalVisible(true)}
            style={styles.pickerButton}
            disabled={!selectedCategory}
          >
            {selectedItem ? selectedItem.name : 'Выбрать товар'}
          </Button>

          {/* Batches Section */}
          <Text style={styles.sectionTitle}>Партии</Text>
          {batches.map(renderBatchInput)}
          
          <Button 
            mode="outlined" 
            onPress={handleAddBatch}
            style={styles.addBatchButton}
            disabled={!selectedItem}
          >
            + Добавить партию
          </Button>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button 
              mode="contained" 
              onPress={handleSave}
              style={styles.saveButton}
            >
              Сохранить
            </Button>
            <Button 
              mode="outlined" 
              onPress={handleCancel}
              style={styles.cancelButton}
            >
              Отмена
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* Location Modal */}
      <Portal>
        <Modal
          visible={locationModalVisible}
          onDismiss={() => setLocationModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Выберите локацию</Text>
          <Divider />
          {locations.map(location => (
            <List.Item
              key={location.id}
              title={location.name}
              onPress={() => {
                setSelectedLocation(location);
                setLocationModalVisible(false);
              }}
              style={selectedLocation?.id === location.id ? styles.selectedItem : {}}
            />
          ))}
        </Modal>
      </Portal>

      {/* Category Modal */}
      <Portal>
        <Modal
          visible={categoryModalVisible}
          onDismiss={() => setCategoryModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Выберите категорию</Text>
          <Divider />
          {categories.map(category => (
            <List.Item
              key={category.id}
              title={category.name}
              onPress={() => {
                setSelectedCategory(category);
                setCategoryModalVisible(false);
              }}
              style={selectedCategory?.id === category.id ? styles.selectedItem : {}}
            />
          ))}
        </Modal>
      </Portal>

      {/* Item Modal */}
      <Portal>
        <Modal
          visible={itemModalVisible}
          onDismiss={() => { setItemModalVisible(false); setItemSearchQuery(''); }}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Выберите товар</Text>
          <Divider />
          <TextInput
            placeholder="Поиск товара..."
            value={itemSearchQuery}
            onChangeText={setItemSearchQuery}
            style={styles.searchInput}
          />
          <ScrollView style={styles.itemList} keyboardShouldPersistTaps="handled">
            {items
              .filter(item => item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
              .map(item => (
              <List.Item
                key={item.id}
                title={item.name}
                onPress={() => {
                  setSelectedItem(item);
                  setItemModalVisible(false);
                  setItemSearchQuery('');
                }}
                style={selectedItem?.id === item.id ? styles.selectedItem : {}}
              />
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  pickerButton: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 16,
  },
  batchRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  dateInputContainer: {
    flex: 2,
    marginRight: 8,
  },
  dateInput: {
    backgroundColor: 'white',
  },
  quantityInputContainer: {
    flex: 1,
    marginRight: 8,
  },
  quantityInput: {
    backgroundColor: 'white',
  },
  removeButton: {
    flex: 1,
  },
  addBatchButton: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  saveButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    flex: 1,
    marginLeft: 8,
  },
modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  itemList: {
    maxHeight: 400,
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
  },
});

export default ReceivingScreen;