import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { ClipboardList, CirclePlus as PlusCircle, SquareCheck as CheckSquare, Settings, ScanLine, Bug } from 'lucide-react-native';
import LogoHeader from '@/components/LogoHeader';
import NetworkStatusBar from '@/components/NetworkStatusBar';
import { View } from 'react-native';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <NetworkStatusBar />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: '#9E9E9E',
          tabBarStyle: {
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
          },
          headerShown: true,
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitle: () => <LogoHeader />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inventory',
            tabBarLabel: 'Inventory',
            tabBarIcon: ({ color, size }) => (
              <ClipboardList size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add New',
            tabBarLabel: 'Add New',
            tabBarIcon: ({ color, size }) => (
              <PlusCircle size={size} color={color} />
            ),
            headerTitle: 'Add New Ticket Pack',
          }}
        />
        <Tabs.Screen
          name="review"
          options={{
            title: 'Review',
            tabBarLabel: 'Review',
            tabBarIcon: ({ color, size }) => (
              <CheckSquare size={size} color={color} />
            ),
            headerTitle: 'Review & Submit',
          }}
        />
        <Tabs.Screen
          name="scanner-test"
          options={{
            title: 'Test Scanner',
            tabBarLabel: 'Test',
            tabBarIcon: ({ color, size }) => (
              <ScanLine size={size} color={color} />
            ),
            headerTitle: 'Scanner Test',
          }}
        />
        <Tabs.Screen
          name="scanner-debug"
          options={{
            title: 'Debug Scanner',
            tabBarLabel: 'Debug',
            tabBarIcon: ({ color, size }) => (
              <Bug size={size} color={color} />
            ),
            headerTitle: 'Scanner Diagnostics',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Settings size={size} color={color} />
            ),
            headerTitle: 'Scanner Settings',
          }}
        />
      </Tabs>
    </View>
  );
}