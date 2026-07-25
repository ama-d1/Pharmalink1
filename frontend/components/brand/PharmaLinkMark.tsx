import Svg, { Circle, Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  size?: number;
};

// The PharmaLink brand mark, built entirely as vector shapes (no image asset).
// A tilted capsule/pill "plugged into" an open ring, reading as pill + link.
// Renders on any background with no baked-in canvas — replaces the old
// logo.png/logo-icon.png raster assets, which had a background of their own
// and needed pixel-level background removal to sit cleanly on the header.
export function PharmaLinkMark({ size = 110 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="pillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#60A5FA" />
          <Stop offset="100%" stopColor="#1D4ED8" />
        </LinearGradient>
        <LinearGradient id="navyGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#0F172A" />
          <Stop offset="100%" stopColor="#1E3A8A" />
        </LinearGradient>
      </Defs>

      {/* open ring — the "link" */}
      <Circle
        cx={38}
        cy={63}
        r={21}
        fill="none"
        stroke="url(#navyGrad)"
        strokeWidth={13}
        strokeLinecap="round"
        strokeDasharray="102 132"
        transform="rotate(-25 38 63)"
      />

      {/* capsule / pill, tilted so its lower end tucks into the ring's gap */}
      <G transform="rotate(-45 56 40)">
        <Rect x={39} y={8} width={34} height={62} rx={17} fill="url(#pillGrad)" />
        <Rect x={39} y={37} width={34} height={2} fill="rgba(15,23,42,0.15)" />
        <Rect x={50} y={14} width={5} height={20} rx={2.5} fill="rgba(255,255,255,0.55)" />
      </G>
    </Svg>
  );
}
