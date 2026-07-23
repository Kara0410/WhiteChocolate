type ParkingCameraReadinessInput = {
  platform: string;
  mapWidth: number;
  mapHeight: number;
  nativeMapReady: boolean;
  googleMapRefReady: boolean;
  appleMapRefReady: boolean;
};

export function canFocusParkingCamera({
  platform,
  mapWidth,
  mapHeight,
  nativeMapReady,
  googleMapRefReady,
  appleMapRefReady,
}: ParkingCameraReadinessInput) {
  if (mapWidth <= 0 || mapHeight <= 0 || !nativeMapReady) {
    return false;
  }

  if (platform === 'android') {
    return googleMapRefReady;
  }
  if (platform === 'ios') {
    return appleMapRefReady;
  }
  return false;
}

export function shouldDeferParkingCameraCommand(input: {
  isMapMoving: boolean;
  isProgrammaticCameraMove: boolean;
}) {
  return input.isMapMoving && !input.isProgrammaticCameraMove;
}
