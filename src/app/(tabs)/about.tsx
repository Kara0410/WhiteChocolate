/**
 * About screen — information about the app and its data source.
 */

import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

type InfoBlockProps = {
  icon: string;
  title: string;
  body: string;
};

function InfoBlock({ icon, title, body }: InfoBlockProps) {
  return (
    <View className="flex-row gap-3.5">
      <View className="w-10 h-10 rounded-xl bg-sunken items-center justify-center shrink-0">
        <Ionicons name={icon as any} size={22} color="#ffd33d" />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-white mb-1">{title}</Text>
        <Text className="text-[13px] text-gray-400 leading-5">{body}</Text>
      </View>
    </View>
  );
}

export default function AboutScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerClassName="p-5 pb-10">

        <Text className="text-[26px] font-bold text-white tracking-[0.3px]">
          Munich Parking
        </Text>
        <Text className="text-sm text-gray-500 mt-1 mb-6">Open data explorer</Text>

        <View className="bg-elevated rounded-2xl p-5 gap-4">
          <InfoBlock
            icon="map-outline"
            title="Data source"
            body="All parking data comes from the Munich Open Data Portal — a public dataset of parking-regulation segments across the city, updated by the Landeshauptstadt München."
          />
          <View className="h-px bg-gray-700" />
          <InfoBlock
            icon="git-branch-outline"
            title="Coordinates"
            body="Raw coordinates are stored in ETRS89 / UTM Zone 32N. The app converts them to WGS84 (standard GPS lat/lon) using an inverse transverse-Mercator formula so they can be plotted on a map."
          />
          <View className="h-px bg-gray-700" />
          <InfoBlock
            icon="funnel-outline"
            title="Filtering"
            body="Use the chips on the home screen to narrow by parking type. Combine with the search bar to find a specific street or district. Tap the compass icon to sort by distance from your location."
          />
          <View className="h-px bg-gray-700" />
          <InfoBlock
            icon="car-outline"
            title="Coverage"
            body="The dataset covers 1 735 unique streets with parking rules including resident-only zones, short-term bays, mixed-use zones, EV-charging bays, and disabled spaces."
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
