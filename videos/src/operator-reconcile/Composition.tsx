import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";

/**
 * Storyboard — "Step 4: Operator SDK"
 *
 *  Visual echoes k8s-reconcile (same grammar: spec → controller → realized state).
 *
 *  0.0s   `ExposedApp` spec fades in on left (same layout as K8s YAML)
 *  1.5s   Arrow to "ExposedApp Controller" (labeled, branded)
 *  3.0s   Controller fans out 4 arrows to:
 *           - Azure Function App
 *           - Firewall rule
 *           - Akamai config
 *           - DNS record
 *  5.5s   Each target ticks green as it reconciles
 *  8.0s   Replay AMD story: "months of tickets" strikes through,
 *         replaced with "10 lines of YAML"
 * 11.0s   Final frame: the loop arrow — same pattern, higher level
 */
export const OperatorReconcile: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        color: theme.fg,
        fontFamily: theme.fontFamily,
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <div style={{ fontSize: 48, color: theme.muted }}>
        [ storyboard: ExposedApp → controller → firewall/akamai/dns ]
      </div>
      <div style={{ fontSize: 24, color: theme.muted, marginTop: 24 }}>
        TODO: fan-out reconcile, AMD callback
      </div>
    </AbsoluteFill>
  );
};
