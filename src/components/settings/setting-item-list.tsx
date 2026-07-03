import { memo, useCallback } from 'react';
import { type Href, useRouter } from 'expo-router';

import { SettingRow } from '@/components/settings/setting-row';
import type {
  SettingAction,
  SettingItem,
} from '@/types/settings';

type SettingItemListProps = {
  items: SettingItem[];
  onAction?: (action: SettingAction) => void;
};

const SettingItemRow = memo(function SettingItemRow({
  item,
  onAction,
  showDivider,
}: {
  item: SettingItem;
  onAction?: (action: SettingAction) => void;
  showDivider: boolean;
}) {
  const router = useRouter();

  const handlePress = useCallback(() => {
    if (item.navigationTarget) {
      router.push(item.navigationTarget as Href);
      return;
    }

    if (item.action) {
      onAction?.(item.action);
    }
  }, [item.action, item.navigationTarget, onAction, router]);

  const isInteractive =
    item.type === 'action' || item.type === 'navigation';

  return (
    <SettingRow
      accessibilityHint={item.accessibilityHint}
      accessibilityLabel={item.accessibilityLabel}
      badge={item.badge}
      danger={item.danger}
      disabled={item.disabled}
      icon={item.icon}
      onPress={isInteractive ? handlePress : undefined}
      rightText={item.rightText}
      showChevron={item.type === 'navigation'}
      showDivider={showDivider}
      subtitle={item.subtitle}
      title={item.title}
    />
  );
});

export const SettingItemList = memo(function SettingItemList({
  items,
  onAction,
}: SettingItemListProps) {
  return items.map((item, index) => (
    <SettingItemRow
      item={item}
      key={item.id}
      onAction={onAction}
      showDivider={index < items.length - 1}
    />
  ));
});
