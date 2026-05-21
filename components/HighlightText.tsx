import React from 'react';
import { Text, TextProps } from 'react-native';
import { Theme } from '../constants/theme';

interface HighlightTextProps extends TextProps {
  children: React.ReactNode;
  color?: string;
  size?: 'small' | 'normal' | 'large';
  weight?: '700' | '800' | '900';
}

export function HighlightText({
  children,
  color = Theme.primary,
  size = 'normal',
  weight = '900',
  style,
  ...props
}: HighlightTextProps) {
  const sizeMap = {
    small: 12,
    normal: 16,
    large: 20,
  };

  return (
    <Text
      {...props}
      style={[
        {
          color,
          fontSize: sizeMap[size],
          fontWeight: weight,
          letterSpacing: 0.3,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
