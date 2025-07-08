import { MD3LightTheme } from 'react-native-paper';
import { DefaultTheme } from '@react-navigation/native';

export const colors = {
  primary: '#2196F3',
  secondary: '#03DAC6',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  error: '#B00020',
  text: '#000000',
  onBackground: '#000000',
  onSurface: '#000000',
  disabled: '#9E9E9E',
  placeholder: '#9E9E9E',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#FF4081',
  success: '#4CAF50',
  warning: '#FFC107',
  info: '#2196F3',
};

export const theme = {
  ...DefaultTheme,
  ...MD3LightTheme,
  colors: {
    ...DefaultTheme.colors,
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
    text: colors.text,
    onBackground: colors.onBackground,
    onSurface: colors.onSurface,
    disabled: colors.disabled,
    placeholder: colors.placeholder,
    backdrop: colors.backdrop,
    notification: colors.notification,
  },
};