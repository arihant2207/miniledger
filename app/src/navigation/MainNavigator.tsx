/**
 * Module: Main Navigator
 * Responsibility: Manages authenticated screens (Home and AddLoan modal).
 */

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { AddLoanScreen } from '../screens/AddLoanScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="AddLoan"
        component={AddLoanScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
