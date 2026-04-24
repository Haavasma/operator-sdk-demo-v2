import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";

/**
 * Storyboard — "Step 3: Custom Resources"
 *
 *  0.0s  Wall of YAML on left: Deployment + Service + Ingress + ConfigMap + HPA
 *        (~60 lines, hard to read)
 *  2.0s  Scan line sweeps across the YAML, pieces dim
 *  3.5s  Collapse animation: all blocks shrink and merge into a single
 *        10-line `ExposedApp` spec on the right
 *  6.0s  Caption: "same intent. one resource."
 *  8.0s  Small callout: "but Kubernetes doesn't know what this means yet"
 */
export const CrdAbstraction: React.FC = () => {
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
        [ storyboard: YAML wall collapses into CRD ]
      </div>
      <div style={{ fontSize: 24, color: theme.muted, marginTop: 24 }}>
        TODO: animate 60 lines → 10 lines
      </div>
    </AbsoluteFill>
  );
};
