import { useEffect } from 'react';
import { Redirect } from 'expo-router';

import { useMapOverlay } from '@/context/MapOverlayContext';

export default function ParkingListDeepLink() {
  const { openOverlay } = useMapOverlay();

  useEffect(() => {
    openOverlay('parking');
  }, [openOverlay]);

  return <Redirect href="/map" />;
}
