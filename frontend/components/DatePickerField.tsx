import React from 'react';
import { View } from 'react-native';

type Props = {
  mode: 'date' | 'time';
  value: Date;
  onChange: (date: Date) => void;
  style?: object;
};

// Web: usa <input type="date|time"> nativo do browser via React Native Web
export function DatePickerField({ mode, value, onChange, style }: Props) {
  const inputValue =
    mode === 'date'
      ? [
          value.getFullYear(),
          String(value.getMonth() + 1).padStart(2, '0'),
          String(value.getDate()).padStart(2, '0'),
        ].join('-')
      : [
          String(value.getHours()).padStart(2, '0'),
          String(value.getMinutes()).padStart(2, '0'),
        ].join(':');

  const handleChange = (e: { target: { value: string } }) => {
    const val = e.target.value;
    if (!val) return;
    const d = new Date(value);
    if (mode === 'date') {
      const [y, m, day] = val.split('-').map(Number);
      d.setFullYear(y, m - 1, day);
    } else {
      const [h, min] = val.split(':').map(Number);
      d.setHours(h, min, 0, 0);
    }
    onChange(d);
  };

  return (
    <View
      style={[
        {
          backgroundColor: '#FFF',
          borderWidth: 1,
          borderColor: '#E5E5E5',
          borderRadius: 8,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* @ts-ignore — elemento HTML puro, só renderiza no browser */}
      <input
        type={mode === 'date' ? 'date' : 'time'}
        value={inputValue}
        onChange={handleChange}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: '16px',
          color: '#333',
          border: 'none',
          backgroundColor: 'transparent',
          outline: 'none',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          cursor: 'pointer',
        }}
      />
    </View>
  );
}
