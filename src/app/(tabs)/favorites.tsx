import { useEffect } from 'react';
import { Redirect } from 'expo-router';

import { useMapOverlay } from '@/context/MapOverlayContext';

export default function FavoritesDeepLink() {
  const { openOverlay } = useMapOverlay();

  useEffect(() => {
    openOverlay('favorites');
  }, [openOverlay]);

  return <Redirect href="/map" />;
}
