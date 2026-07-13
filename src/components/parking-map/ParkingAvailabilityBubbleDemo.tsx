import { ScrollView, Text, View } from 'react-native';

import ParkingAvailabilityBubble from './ParkingAvailabilityBubble';

function DemoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-4">
      <Text className="text-base font-extrabold uppercase tracking-wide text-pm-text">
        {title}
      </Text>
      <View className="flex-row flex-wrap items-center gap-6">{children}</View>
    </View>
  );
}

export default function ParkingAvailabilityBubbleDemo() {
  return (
    <ScrollView
      className="flex-1 bg-[#F3F5F8]"
      contentContainerClassName="gap-10 p-6 pb-16"
      contentInsetAdjustmentBehavior="automatic"
    >
      <DemoSection title="Cluster bubbles">
        <ParkingAvailabilityBubble
          percentage={72}
          size="large"
          type="cluster"
          zoneCount={4}
        />
        <ParkingAvailabilityBubble
          percentage={46}
          size="large"
          type="cluster"
          zoneCount={3}
        />
        <ParkingAvailabilityBubble
          percentage={28}
          size="large"
          type="cluster"
          zoneCount={2}
        />
      </DemoSection>

      <DemoSection title="Individual segments">
        <ParkingAvailabilityBubble percentage={72} size="large" type="spot" />
        <ParkingAvailabilityBubble percentage={46} size="large" type="spot" />
        <ParkingAvailabilityBubble percentage={28} size="large" type="spot" />
      </DemoSection>

      <DemoSection title="Cluster sizes">
        <ParkingAvailabilityBubble
          percentage={72}
          size="large"
          type="cluster"
          zoneCount={4}
        />
        <ParkingAvailabilityBubble
          percentage={72}
          size="medium"
          type="cluster"
          zoneCount={4}
        />
        <ParkingAvailabilityBubble
          percentage={72}
          size="small"
          type="cluster"
          zoneCount={4}
        />
      </DemoSection>

      <DemoSection title="Spot sizes">
        <ParkingAvailabilityBubble percentage={72} size="large" type="spot" />
        <ParkingAvailabilityBubble percentage={72} size="medium" type="spot" />
        <ParkingAvailabilityBubble percentage={72} size="small" type="spot" />
      </DemoSection>

      <DemoSection title="Interaction states">
        <ParkingAvailabilityBubble
          percentage={72}
          state="default"
          type="cluster"
          zoneCount={4}
        />
        <ParkingAvailabilityBubble
          percentage={72}
          state="pressed"
          type="cluster"
          zoneCount={4}
        />
        <ParkingAvailabilityBubble
          percentage={72}
          state="selected"
          type="cluster"
          zoneCount={4}
        />
        <ParkingAvailabilityBubble
          percentage={72}
          state="default"
          type="spot"
        />
        <ParkingAvailabilityBubble
          percentage={72}
          state="pressed"
          type="spot"
        />
        <ParkingAvailabilityBubble
          percentage={72}
          state="selected"
          type="spot"
        />
      </DemoSection>
    </ScrollView>
  );
}
