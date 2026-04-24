import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";

/**
 * K8s reconciliation loop.
 *
 * Beats:
 *  0.0s  YAML fades in on left (desired state)
 *  1.5s  Arrow draws from YAML to controller
 *  2.5s  Controller node pulses, label "watch / diff / act"
 *  4.0s  Arrow draws from controller to cluster
 *  4.5s  Pods spawn in cluster (1..3)
 *  6.5s  One pod "dies" (red flash, fades)
 *  7.5s  Controller pulse, replacement pod spawns (self-healing)
 *  9.0s  Loop arrow pulses behind scene
 */
export const K8sReconcile: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const yamlOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const arrow1 = interpolate(frame, [45, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const controllerScale = spring({
    frame: frame - 75,
    fps,
    config: { damping: 10, stiffness: 80 },
  });

  const arrow2 = interpolate(frame, [120, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pod1 = spring({ frame: frame - 150, fps });
  const pod2 = spring({ frame: frame - 165, fps });
  const pod3 = spring({ frame: frame - 180, fps });

  const podDieStart = 6.5 * fps;
  const podDieOpacity = interpolate(
    frame,
    [podDieStart, podDieStart + 20],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const podRedFlash = interpolate(
    frame,
    [podDieStart - 5, podDieStart, podDieStart + 15],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const controllerRepulse = spring({
    frame: frame - 7.5 * fps,
    fps,
    config: { damping: 8, stiffness: 120 },
  });

  const replacementPod = spring({ frame: frame - 8 * fps, fps });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        color: theme.fg,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* YAML (desired state) */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 360,
          opacity: yamlOpacity,
          fontFamily: theme.mono,
          fontSize: 28,
          lineHeight: 1.5,
          padding: 32,
          border: `2px solid ${theme.accent}`,
          borderRadius: 12,
          backgroundColor: theme.dim,
          width: 420,
        }}
      >
        <div style={{ color: theme.muted, marginBottom: 12, fontSize: 20 }}>
          desired state
        </div>
        <div style={{ color: theme.fg }}>kind: Deployment</div>
        <div style={{ color: theme.fg }}>replicas: 3</div>
        <div style={{ color: theme.fg }}>image: nginx:1.27</div>
      </div>

      {/* Arrow 1: YAML → Controller */}
      <Arrow
        x1={580}
        y1={460}
        x2={820}
        y2={460}
        progress={arrow1}
        color={theme.accent}
      />

      {/* Controller */}
      <div
        style={{
          position: "absolute",
          left: 820,
          top: 380,
          width: 240,
          height: 180,
          transform: `scale(${Math.max(
            controllerScale,
            1 + 0.1 * controllerRepulse,
          )})`,
          transformOrigin: "center",
          borderRadius: 16,
          border: `3px solid ${theme.accent}`,
          backgroundColor: theme.dim,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div>Controller</div>
        <div
          style={{
            fontSize: 18,
            color: theme.muted,
            marginTop: 12,
            fontFamily: theme.mono,
          }}
        >
          watch → diff → act
        </div>
      </div>

      {/* Arrow 2: Controller → Cluster */}
      <Arrow
        x1={1080}
        y1={460}
        x2={1320}
        y2={460}
        progress={arrow2}
        color={theme.accent}
      />

      {/* Cluster */}
      <div
        style={{
          position: "absolute",
          left: 1320,
          top: 300,
          width: 440,
          height: 360,
          border: `2px dashed ${theme.muted}`,
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div
          style={{
            color: theme.muted,
            fontSize: 20,
            marginBottom: 16,
            fontFamily: theme.mono,
          }}
        >
          cluster
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Pod
            scale={pod1}
            dying={podRedFlash}
            opacity={podDieOpacity}
            label="pod-1"
          />
          <Pod scale={pod2} label="pod-2" />
          <Pod scale={pod3} label="pod-3" />
          <Pod scale={replacementPod} label="pod-1'" />
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 44,
          fontWeight: 600,
        }}
      >
        Kubernetes reconciles desired state → reality
      </div>
    </AbsoluteFill>
  );
};

const Arrow: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  color: string;
}> = ({ x1, y1, x2, y2, progress, color }) => {
  const endX = x1 + (x2 - x1) * progress;
  const endY = y1 + (y2 - y1) * progress;
  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="5"
          orient="auto"
        >
          <polygon points="0 0, 10 5, 0 10" fill={color} />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth={4}
        markerEnd={progress > 0.95 ? "url(#arrowhead)" : undefined}
      />
    </svg>
  );
};

const Pod: React.FC<{
  scale: number;
  label: string;
  dying?: number;
  opacity?: number;
}> = ({ scale, label, dying = 0, opacity = 1 }) => {
  const red = `rgba(255, 70, 70, ${dying})`;
  return (
    <div
      style={{
        width: 110,
        height: 110,
        borderRadius: 16,
        border: `2px solid ${theme.accent}`,
        backgroundColor: `rgba(51, 102, 255, 0.15)`,
        boxShadow: dying > 0 ? `0 0 40px 8px ${red}` : undefined,
        transform: `scale(${scale})`,
        opacity,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: theme.mono,
        fontSize: 18,
      }}
    >
      {label}
    </div>
  );
};
