import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { HomeScreen } from '../HomeScreen';
import { ProfileScreen } from '../ProfileScreen';
import { LoginScreen } from '../LoginScreen';
import { PropertyDetailScreen } from '../PropertyDetailScreen';
import { AddReviewScreen } from '../AddReviewScreen';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  PropertyDetail: { id: string };
  AddReview: { place_id?: string; address?: string; property_id?: string };
};

export type TabParamList = {
  Home: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Profile: '👤',
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[label] || '•'}
    </Text>
  );
}

function MainTabs({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#4f46e5',
        headerShown: false,
        tabBarStyle: { borderTopColor: '#e2e8f0' },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile">
        {() => <ProfileScreen onSignOut={onSignOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

type AppNavigatorProps = {
  isAuthenticated: boolean;
  onLogin: () => void;
  onSignOut: () => void;
};

export function AppNavigator({
  isAuthenticated,
  onLogin,
  onSignOut,
}: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="MainTabs">
              {() => <MainTabs onSignOut={onSignOut} />}
            </Stack.Screen>
            <Stack.Screen
              name="PropertyDetail"
              component={PropertyDetailScreen}
            />
            <Stack.Screen name="AddReview" component={AddReviewScreen} />
          </>
        ) : (
          <Stack.Screen name="Login">
            {() => <LoginScreen onLogin={onLogin} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}