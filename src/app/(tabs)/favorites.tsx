import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import TopBar from '@/components/TopBar';
import { C, R } from '@/constants/theme';

export default function FavoritesScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 112, gap: 14 }}
        >
          <TopBar title="Favorite spots" subtitle="Saved parking" />

          <View
            style={{
              minHeight: 220,
              borderRadius: R.xl,
              borderWidth: 1,
              borderColor: 'rgba(217,207,192,0.85)',
              backgroundColor: C.surfaceWarm,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 22,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: 'rgba(32,56,66,0.10)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Ionicons name="heart-outline" size={25} color={C.deep} />
            </View>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 6 }}>
              No favorites yet
            </Text>
            <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
              Saved parking spots will appear here once favorites are available.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
