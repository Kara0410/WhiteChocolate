import { memo, useId, useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

export type ParkingTrendChartProps = {
  data?: number[];
};

const DEFAULT_DATA = [54, 58, 52, 63, 68, 66, 74, 72];
const LABELS = ['8', '10', '12', '14', '16', '18', '20', 'Now'];
const CHART_WIDTH = 320;
const CHART_HEIGHT = 140;
const CHART_PADDING = 12;

function createPoints(data: number[]) {
  const safeData = data.length > 1 ? data : DEFAULT_DATA;
  const step = (CHART_WIDTH - CHART_PADDING * 2) / (safeData.length - 1);

  return safeData.map((value, index) => ({
    x: CHART_PADDING + step * index,
    y:
      CHART_PADDING +
      ((100 - Math.max(0, Math.min(100, value))) / 100) *
        (CHART_HEIGHT - CHART_PADDING * 2),
  }));
}

export const ParkingTrendChart = memo(function ParkingTrendChart({
  data = DEFAULT_DATA,
}: ParkingTrendChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const { areaPath, linePath, points } = useMemo(() => {
    const nextPoints = createPoints(data);
    const nextLinePath = nextPoints
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
      )
      .join(' ');
    const first = nextPoints[0];
    const last = nextPoints[nextPoints.length - 1];

    return {
      points: nextPoints,
      linePath: nextLinePath,
      areaPath: `${nextLinePath} L ${last.x} ${CHART_HEIGHT} L ${first.x} ${CHART_HEIGHT} Z`,
    };
  }, [data]);

  const lastPoint = points[points.length - 1];

  return (
    <View>
      <Svg
        height={CHART_HEIGHT}
        preserveAspectRatio="none"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        width="100%"
      >
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#60A5FA" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#DBEAFE" stopOpacity={0.04} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill={`url(#${gradientId})`} />
        <Path
          d={linePath}
          fill="none"
          stroke="#2563EB"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={4}
        />
        <Circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          fill="#FFFFFF"
          r={5}
          stroke="#2563EB"
          strokeWidth={3}
        />
      </Svg>
      <View className="mt-1 flex-row justify-between px-1">
        {LABELS.map((label) => (
          <Text
            className="text-[10px] font-semibold text-slate-400"
            key={label}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
});
