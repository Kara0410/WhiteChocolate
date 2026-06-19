import { Stack } from 'expo-router';
import { View } from 'react-native';
import FloatingNavBar from '@/components/FloatingNavBar';

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="map"      />
        <Stack.Screen name="search"   />
        <Stack.Screen name="track"    />
        <Stack.Screen name="profile"  />
        <Stack.Screen name="settings" />
        <Stack.Screen name="list"     />
        <Stack.Screen name="about"    />
      </Stack>
      <FloatingNavBar />
    </View>
  );
}
