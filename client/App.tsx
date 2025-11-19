import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme as RNDarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, LogBox, Platform } from 'react-native';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import WhatsAppLayout from './src/components/WhatsAppLayout';
import { getTheme } from './src/theme';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  LogBox.ignoreLogs(['props.pointerEvents is deprecated']);
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);

  const navigationTheme = scheme === 'dark' 
    ? {
        ...RNDarkTheme,
        colors: {
          ...RNDarkTheme.colors,
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.backgroundCard,
          text: theme.colors.textPrimary,
          border: theme.colors.border,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.backgroundCard,
          text: theme.colors.textPrimary,
          border: theme.colors.border,
        },
      };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.header,
          },
          headerTintColor: theme.colors.textPrimary,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Main"
          component={WhatsAppLayout}
          options={{ 
            headerShown: false,
            title: 'Gossipify'
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
