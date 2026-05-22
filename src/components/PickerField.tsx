import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Button, Modal, Portal, Text as PaperText, TouchableRipple } from 'react-native-paper';

interface Option {
  label: string;
  value: any;
}

interface Props {
  label: string;
  value: string;
  options: Option[];
  onSelect: (value: any) => void;
}

export default function PickerField({ label, value, options, onSelect }: Props) {
  const [visible, setVisible] = useState(false);

  const open = () => setVisible(true);
  const close = () => setVisible(false);

  const handleSelect = (opt: Option) => {
    onSelect(opt.value);
    close();
  };

  return (
    <View style={styles.container}>
      <PaperText style={styles.label}>{label}</PaperText>
      <Button
        mode="outlined"
        onPress={open}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        {value || 'Выберите...'}
      </Button>

      <Portal>
        <Modal visible={visible} onDismiss={close} contentContainerStyle={styles.modal}>
          <PaperText style={styles.modalTitle}>{label}</PaperText>
          <FlatList
            data={options}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <TouchableRipple onPress={() => handleSelect(item)} style={styles.option}>
                <Text style={[styles.optionText, item.label === value && styles.optionSelected]}>
                  {item.label}
                </Text>
              </TouchableRipple>
            )}
          />
          <Button onPress={close} style={styles.closeBtn}>Закрыть</Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  button: {
    borderColor: '#1565C0',
  },
  buttonContent: {
    flexDirection: 'row-reverse',
  },
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  optionText: {
    fontSize: 16,
  },
  optionSelected: {
    color: '#1565C0',
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: 8,
  },
});