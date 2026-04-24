import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";

/**
 * k8s-reconcile — 8s @ 30fps = 240f, 1080x1080 (split layout)
 *
 * Explicit beats for the full handoff: you write YAML → kubectl apply
 * → Kubernetes reconciles → self-heal demo.
 *
 * Timeline:
 *   0.0s  "YOU DECLARE" + YAML block types in (replicas: 3)
 *   1.0s  Terminal below YAML types `$ kubectl apply -f deploy.yaml`
 *   2.2s  Green "deployment created" confirmation
 *   2.5s  Arrow down → Kubernetes controller springs in
 *   3.5s  Arrow down → Cluster; 3 pods spring in
 *   4.0s  Status: "3/3 running"
 *   4.5s  Pod 2 red-flashes, fades
 *   5.2s  Status: "desired ≠ actual"
 *   5.7s  Controller pulses, replacement pod spawns
 *   7.2s  Status: "3/3 · reconciled" (held)
 */
export const K8sReconcile: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // YAML typing
  const yamlStart = 10;
  const revealedLines = Math.max(0, Math.floor((frame - yamlStart) / 5));

  // Terminal: kubectl apply
  const terminalIn = spring({
    frame: frame - 30,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const kubectlChars = Math.max(0, Math.floor((frame - 40) / 1.2));
  const confirmShow = frame >= 40 + KUBECTL_CMD.length * 1.2;

  // Arrow 1: kubectl → Controller (70..100)
  const arrow1 = interpolate(frame, [70, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const controllerIn = spring({
    frame: frame - 85,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Arrow 2: Controller → Cluster (110..140)
  const arrow2 = interpolate(frame, [110, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Initial pods spring in
  const pod1 = spring({ frame: frame - 130, fps });
  const pod2 = spring({ frame: frame - 140, fps });
  const pod3 = spring({ frame: frame - 150, fps });

  // Self-heal beat
  const dieStart = 150;
  const pod2RedFlash = interpolate(
    frame,
    [dieStart - 5, dieStart, dieStart + 15],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const pod2DieOpacity = interpolate(
    frame,
    [dieStart + 5, dieStart + 25],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const controllerRepulse = spring({
    frame: frame - 180,
    fps,
    config: { damping: 8, stiffness: 130 },
  });

  const replacementPod = spring({
    frame: frame - 190,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Status phases
  const statusPhase =
    frame < 130
      ? 0
      : frame < 150
        ? 1 // 3/3 running
        : frame < 185
          ? 2 // desired ≠ actual
          : frame < 215
            ? 3 // reconciling
            : 4; // 3/3 reconciled

  // Canvas 1080 x 1080:
  //   y=40   header "YOU DECLARE"
  //   y=75   YAML block (~h=120)
  //   y=210  Terminal (~h=95)
  //   y=320  Controller (~h=150)
  //   y=495  Arrow 2
  //   y=545  Cluster (~h=420)
  //   y=990  Status

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        color: theme.fg,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* YOU DECLARE header */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 40,
          transform: "translateX(-50%)",
          fontSize: 16,
          color: theme.muted,
          fontFamily: theme.mono,
          letterSpacing: 1,
          opacity: sceneIn,
        }}
      >
        YOU DECLARE
      </div>

      {/* YAML block */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 72,
          transform: "translateX(-50%)",
          width: 420,
          padding: 14,
          border: `2px solid ${theme.accent}`,
          borderRadius: 12,
          backgroundColor: "#000",
          fontFamily: theme.mono,
          fontSize: 18,
          lineHeight: 1.5,
          opacity: sceneIn,
        }}
      >
        {YAML_LINES.map((line, i) => {
          const visible = i < revealedLines;
          return (
            <div
              key={i}
              style={{
                opacity: visible ? 1 : 0,
                color: line.color,
                whiteSpace: "pre",
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>

      {/* Terminal: kubectl apply */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 210,
          transform: `translateX(-50%) scale(${terminalIn})`,
          transformOrigin: "top center",
          width: 520,
          padding: "12px 16px",
          backgroundColor: "#0b0b0b",
          border: `1px solid ${theme.muted}`,
          borderRadius: 8,
          fontFamily: theme.mono,
          fontSize: 16,
          opacity: terminalIn,
          boxShadow: "0 10px 28px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <Dot color="#ff5f56" />
          <Dot color="#ffbd2e" />
          <Dot color="#27c93f" />
        </div>
        <div style={{ color: theme.accent }}>
          $ <TypedCommand chars={kubectlChars} />
        </div>
        {confirmShow && (
          <div style={{ color: "#5fd97a", marginTop: 6 }}>
            deployment.apps/my-app created
          </div>
        )}
      </div>

      {/* Arrow 1: kubectl → Controller */}
      <VerticalArrow x={540} y1={320} y2={370} progress={arrow1} />

      {/* Kubernetes controller node */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 380,
          transform: `translateX(-50%) scale(${Math.max(
            controllerIn,
            1 + 0.1 * controllerRepulse,
          )})`,
          width: 280,
          height: 150,
          borderRadius: 14,
          border: `3px solid #326CE5`,
          backgroundColor: theme.dim,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          boxShadow: controllerRepulse
            ? `0 0 ${40 * controllerRepulse}px ${10 * controllerRepulse}px rgba(50,108,229,${0.6 * controllerRepulse})`
            : undefined,
          opacity: sceneIn,
        }}
      >
        <K8sLogo size={54} />
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2 }}>
          Kubernetes
        </div>
        <div
          style={{
            fontSize: 12,
            color: theme.muted,
            marginTop: 2,
            fontFamily: theme.mono,
          }}
        >
          reconciles desired → actual
        </div>
      </div>

      {/* Arrow 2: Controller → Cluster */}
      <VerticalArrow x={540} y1={540} y2={595} progress={arrow2} />

      {/* Cluster */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 605,
          transform: "translateX(-50%)",
          width: 820,
          height: 360,
          border: `2px dashed ${theme.muted}`,
          borderRadius: 14,
          padding: 20,
          opacity: sceneIn,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -14,
            left: 22,
            backgroundColor: theme.bg,
            padding: "0 12px",
            fontSize: 14,
            color: theme.muted,
            fontFamily: theme.mono,
            letterSpacing: 1,
          }}
        >
          CLUSTER
        </div>

        <div
          style={{
            marginTop: 4,
            padding: "16px 20px",
            borderRadius: 12,
            border: `2px solid ${theme.accent}`,
            backgroundColor: "rgba(51,102,255,0.08)",
            fontFamily: theme.mono,
          }}
        >
          <div style={{ fontSize: 18, color: theme.fg }}>
            Deployment/my-app
          </div>
          <div style={{ fontSize: 13, color: theme.muted, marginTop: 2 }}>
            replicas: 3
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 18,
              justifyContent: "center",
            }}
          >
            <Pod scale={pod1} label="pod-1" />
            <Pod
              scale={pod2}
              label="pod-2"
              opacity={pod2DieOpacity}
              redFlash={pod2RedFlash}
            />
            <Pod scale={pod3} label="pod-3" />
            <Pod scale={replacementPod} label="pod-2'" />
          </div>
        </div>
      </div>

      {/* Status line */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 20,
          fontFamily: theme.mono,
        }}
      >
        <StatusLine phase={statusPhase} />
      </div>
    </AbsoluteFill>
  );
};

// ── Subcomponents ────────────────────────────────────────

const YAML_LINES = [
  { text: "apiVersion: apps/v1", color: theme.fg },
  { text: "kind: Deployment", color: theme.accent },
  { text: "spec:", color: theme.fg },
  { text: "  replicas: 3", color: theme.accent },
];

const KUBECTL_CMD = "kubectl apply -f deploy.yaml";

const TypedCommand: React.FC<{ chars: number }> = ({ chars }) => (
  <span>
    {KUBECTL_CMD.slice(0, Math.min(chars, KUBECTL_CMD.length))}
    {chars < KUBECTL_CMD.length && (
      <span style={{ opacity: Math.floor(chars) % 2 ? 0.3 : 1 }}>▌</span>
    )}
  </span>
);

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <span
    style={{
      width: 8,
      height: 8,
      borderRadius: "50%",
      backgroundColor: color,
      display: "inline-block",
    }}
  />
);

const Pod: React.FC<{
  scale: number;
  label: string;
  opacity?: number;
  redFlash?: number;
}> = ({ scale, label, opacity = 1, redFlash = 0 }) => (
  <div
    style={{
      width: 92,
      height: 92,
      borderRadius: 12,
      border: `2px solid ${theme.accent}`,
      backgroundColor: `rgba(51,102,255,0.15)`,
      boxShadow: redFlash
        ? `0 0 ${30 * redFlash}px ${8 * redFlash}px rgba(255,70,70,${redFlash})`
        : undefined,
      transform: `scale(${scale})`,
      opacity: opacity * scale,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: theme.mono,
      fontSize: 14,
      color: theme.fg,
    }}
  >
    {label}
  </div>
);

const StatusLine: React.FC<{ phase: number }> = ({ phase }) => {
  if (phase === 0) return null;
  if (phase === 1) {
    return <span style={{ color: "#5fd97a" }}>● 3/3 running</span>;
  }
  if (phase === 2) {
    return (
      <span style={{ color: "#ff6b6b" }}>
        ● desired ≠ actual — pod-2 crashed
      </span>
    );
  }
  if (phase === 3) {
    return <span style={{ color: "#ffb84d" }}>↻ reconciling...</span>;
  }
  return (
    <span style={{ color: "#5fd97a" }}>
      ● 3/3 · desired state restored
    </span>
  );
};

const K8sLogo: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="50" cy="50" r="48" fill="#326CE5" />
    <polygon
      points="50,12 81,27 88,58 67,84 33,84 12,58 19,27"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="2"
    />
    <polygon
      points="50,30 68,38 72,54 61,70 39,70 28,54 32,38"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="1.5"
    />
    <line x1="50" y1="12" x2="50" y2="30" stroke="#FFFFFF" strokeWidth="1.5" />
    <line x1="81" y1="27" x2="68" y2="38" stroke="#FFFFFF" strokeWidth="1.5" />
    <line x1="88" y1="58" x2="72" y2="54" stroke="#FFFFFF" strokeWidth="1.5" />
    <line x1="67" y1="84" x2="61" y2="70" stroke="#FFFFFF" strokeWidth="1.5" />
    <line x1="33" y1="84" x2="39" y2="70" stroke="#FFFFFF" strokeWidth="1.5" />
    <line x1="12" y1="58" x2="28" y2="54" stroke="#FFFFFF" strokeWidth="1.5" />
    <line x1="19" y1="27" x2="32" y2="38" stroke="#FFFFFF" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="4" fill="#FFFFFF" />
  </svg>
);

const VerticalArrow: React.FC<{
  x: number;
  y1: number;
  y2: number;
  progress: number;
  label?: string;
}> = ({ x, y1, y2, progress, label }) => {
  const headSize = 14;
  const effectiveY2 = y2 - headSize;
  const endY = y1 + (effectiveY2 - y1) * progress;
  const headVisible = progress > 0.98;
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={endY}
        stroke={theme.accent}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {headVisible && (
        <polygon
          points={`${x - 9},${y2 - headSize} ${x + 9},${y2 - headSize} ${x},${y2}`}
          fill={theme.accent}
        />
      )}
      {label && progress > 0.2 && (
        <text
          x={x + 18}
          y={(y1 + y2) / 2}
          fill={theme.fg}
          fontSize={16}
          fontFamily={theme.mono}
          opacity={progress}
          dominantBaseline="middle"
        >
          {label}
        </text>
      )}
    </svg>
  );
};
