import type { BottomSheetBackgroundProps } from '@gorhom/bottom-sheet';

import { GlassSurface } from '@/components/ui/glass-surface';

/** Gorhom background adapter; all rendering stays in the shared GlassSurface primitive. */
export function GlassSheetBackground({ style }: BottomSheetBackgroundProps) {
  return <GlassSurface pointerEvents="none" style={style} variant="sheet" />;
}
