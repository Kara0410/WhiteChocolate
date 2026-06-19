import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface RadiusSliderProps {
  value: number;
  onChange: (value: number) => void;
  hasLocation: boolean;
}

const RADIUS_STEPS = [0.5, 1, 2, 5, 10, 20, 50];

export default function RadiusSlider({ value, onChange, hasLocation }: RadiusSliderProps) {
  const formatRadius = (km: number) => {
    if (km < 1) return `${(km * 1000).toFixed(0)}m`;
    return `${km.toFixed(1)}km`;
  };

  return (
    <View className="px-4 py-3 bg-surface border-b border-gray-700/20">
      <View className="flex-row items-center gap-2 mb-2">
        <Ionicons name="radio-button-off" size={16} color="#6b7280" />
        <Text className="text-gray-400 text-xs font-semibold">Radius Filter</Text>
        <Text className="text-gold text-xs font-bold ml-auto">{formatRadius(value)}</Text>
      </View>

      <View className="flex-row items-center gap-2">
        {RADIUS_STEPS.map((step) => (
          <Pressable
            key={step}
            onPress={() => onChange(step)}
            className={`flex-1 py-1.5 rounded-lg text-center transition-colors ${
              value === step
                ? 'bg-gold/20 border border-gold'
                : 'bg-sunken border border-gray-700'
            }`}
          >
            <Text
              className={`text-[11px] font-semibold text-center ${
                value === step ? 'text-gold' : 'text-gray-400'
              }`}
            >
              {formatRadius(step)}
            </Text>
          </Pressable>
        ))}
      </View>

      {!hasLocation && (
        <Text className="text-gray-500 text-[10px] mt-2">
          Enable location or search a location to use radius filter
        </Text>
      )}
    </View>
  );
}
