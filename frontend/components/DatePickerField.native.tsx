import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = {
  mode: 'date' | 'time';
  value: Date;
  onChange: (date: Date) => void;
  style?: object;
};

export function DatePickerField({ mode, value, onChange, style }: Props) {
  const [show, setShow] = useState(false);

  const label =
    mode === 'date'
      ? value.toLocaleDateString('pt-BR')
      : value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <TouchableOpacity style={[styles.button, style]} onPress={() => setShow(true)}>
        <Text style={styles.text}>{label}</Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          onChange={(_, selected) => {
            setShow(false);
            if (selected) onChange(selected);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
});
