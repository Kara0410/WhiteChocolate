import { useEffect } from 'react';
import { Redirect } from 'expo-router';

import { useMapOverlay } from '@/context/MapOverlayContext';

export default function AccountDeepLink() {
  const { openOverlay } = useMapOverlay();

  useEffect(() => {
    openOverlay('you');
  }, [openOverlay]);

  return <Redirect href="/map" />;
}
