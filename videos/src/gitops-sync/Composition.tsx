import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";

/**
 * gitops-sync — 8s @ 30fps = 240f, 1080x1080 (split layout)
 *
 * Vertical flow (reads top → bottom, like a pipeline):
 *   Git repo (top) ─┬─→ GitOps Agent (middle) ─┬─→ Cluster (bottom)
 *
 * Timeline:
 *   0.0s  Three nodes fade in (top/middle/bottom)
 *   0.5s  YAML types in inside git card
 *   2.5s  Arrow 1 (down): Git → Agent, `deploy.yaml` ghost travels
 *   3.3s  Agent pulses, terminal overlay shows `kubectl apply ...`
 *   4.8s  Arrow 2 (down): Agent → Cluster, YAML ghost travels
 *   5.5s  Deployment resource materializes in cluster, pods spring in
 *   7.0s  Caption
 */
export const GitopsSync: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const yamlStart = 15;
  const linesPerFrame = 6;
  const revealedLines = Math.max(
    0,
    Math.floor((frame - yamlStart) / linesPerFrame),
  );

  const pullProgress = interpolate(frame, [75, 105], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ghostPullOpacity = interpolate(frame, [75, 90, 110], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const argoPulse = spring({
    frame: frame - 100,
    fps,
    config: { damping: 8, stiffness: 130 },
  });

  const terminalIn = spring({
    frame: frame - 110,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const kubectlChars = Math.max(0, Math.floor((frame - 120) / 1.2));

  const applyProgress = interpolate(frame, [144, 174], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ghostApplyOpacity = interpolate(frame, [144, 160, 180], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const deploymentScale = spring({
    frame: frame - 165,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const pod1 = spring({ frame: frame - 175, fps });
  const pod2 = spring({ frame: frame - 185, fps });
  const pod3 = spring({ frame: frame - 195, fps });

  const captionOpacity = interpolate(frame, [205, 225], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Canvas: 1080 x 1080
  // Layout:
  //   Git repo:    y=40..260         (outside cluster)
  //   Arrow 1 (git pull): crosses cluster boundary at ~y=290
  //   Cluster box: y=290..1040       (wraps everything below)
  //     Cluster label: top-left inside box
  //     Agent:         y=370..540    (inside cluster — lives on cluster)
  //     Arrow 2 (kubectl apply):  y=555..605  (internal to cluster)
  //     Deployment:    y=620..1020  (inside cluster)

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        color: theme.fg,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* ── Git repo (top, outside cluster) ── */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 40,
          transform: "translateX(-50%)",
          width: 680,
          padding: 18,
          border: `2px solid #F05033`,
          borderRadius: 14,
          backgroundColor: theme.dim,
          opacity: sceneIn,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <GitLogo size={30} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>infra.git</div>
            <div
              style={{
                fontSize: 13,
                color: theme.muted,
                fontFamily: theme.mono,
              }}
            >
              main · deploy.yaml
            </div>
          </div>
        </div>
        <YamlBlock revealedLines={revealedLines} />
      </div>

      {/* ── Cluster (big dashed box wrapping Agent + Deployment) ── */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 290,
          transform: "translateX(-50%)",
          width: 960,
          height: 750,
          border: `2px dashed ${theme.muted}`,
          borderRadius: 16,
          opacity: sceneIn,
        }}
      >
        {/* Cluster label badge (top-left inside box) */}
        <div
          style={{
            position: "absolute",
            top: -16,
            left: 24,
            backgroundColor: theme.bg,
            padding: "0 12px",
            fontSize: 16,
            color: theme.muted,
            fontFamily: theme.mono,
            letterSpacing: 1,
          }}
        >
          KUBERNETES CLUSTER
        </div>
      </div>

      {/* Arrow 1: Git → Agent (crosses cluster boundary) */}
      <VerticalArrow
        x={540}
        y1={262}
        y2={370}
        progress={pullProgress}
        label="git pull"
      />
      <GhostYaml
        y={interpolate(frame, [75, 110], [265, 370])}
        opacity={ghostPullOpacity}
      />

      {/* ── Agent (inside cluster) ── */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 370,
          transform: `translateX(-50%) scale(${1 + argoPulse * 0.08})`,
          width: 260,
          height: 170,
          borderRadius: 14,
          border: `3px solid #EF7B4D`,
          backgroundColor: theme.dim,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          boxShadow: argoPulse
            ? `0 0 ${40 * argoPulse}px ${10 * argoPulse}px rgba(239,123,77,${0.6 * argoPulse})`
            : undefined,
          opacity: sceneIn,
        }}
      >
        <ArgoCDLogo size={56} />
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
          GitOps Agent
        </div>
        <div
          style={{
            fontSize: 12,
            color: theme.muted,
            marginTop: 4,
            fontFamily: theme.mono,
          }}
        >
          pod/argocd-application-controller
        </div>
      </div>

      {/* Terminal popup (inside cluster, right of agent) */}
      <div
        style={{
          position: "absolute",
          left: 700,
          top: 395,
          width: 300,
          padding: "12px 14px",
          backgroundColor: "#0b0b0b",
          border: `1px solid ${theme.muted}`,
          borderRadius: 8,
          fontFamily: theme.mono,
          fontSize: 14,
          transform: `scale(${terminalIn})`,
          transformOrigin: "top left",
          opacity: terminalIn,
          boxShadow: "0 10px 28px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
          <Dot color="#ff5f56" />
          <Dot color="#ffbd2e" />
          <Dot color="#27c93f" />
        </div>
        <div style={{ color: theme.accent }}>
          $ <TypedCommand chars={kubectlChars} />
        </div>
        {kubectlChars >= KUBECTL_CMD.length && (
          <div style={{ color: "#5fd97a", marginTop: 6 }}>
            deployment.apps/expose-api created
          </div>
        )}
      </div>

      {/* Arrow 2: Agent → Deployment (internal to cluster) */}
      <VerticalArrow
        x={540}
        y1={555}
        y2={620}
        progress={applyProgress}
        label="kubectl apply"
      />
      <GhostYaml
        y={interpolate(frame, [144, 180], [555, 615])}
        opacity={ghostApplyOpacity}
      />

      {/* ── Deployment resource (inside cluster) ── */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 630,
          transform: `translateX(-50%) scale(${deploymentScale})`,
          transformOrigin: "top center",
          opacity: deploymentScale,
          width: 820,
          padding: "18px 22px",
          borderRadius: 12,
          border: `2px solid ${theme.accent}`,
          backgroundColor: "rgba(51,102,255,0.1)",
          fontFamily: theme.mono,
        }}
      >
        <div style={{ fontSize: 20, color: theme.fg }}>
          Deployment/expose-api
        </div>
        <div style={{ fontSize: 14, color: theme.muted, marginTop: 3 }}>
          replicas: 3
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <Pod scale={pod1} />
          <Pod scale={pod2} />
          <Pod scale={pod3} />
        </div>
      </div>

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 15,
          color: theme.muted,
          fontFamily: theme.mono,
          opacity: captionOpacity,
        }}
      >
        ↻ agent runs on the cluster · reconciles to git
      </div>
    </AbsoluteFill>
  );
};

// ── Subcomponents ────────────────────────────────────────

const YAML_LINES = [
  { text: "apiVersion: apps/v1", color: theme.fg },
  { text: "kind: Deployment", color: theme.accent },
  { text: "metadata:", color: theme.fg },
  { text: "  name: expose-api", color: theme.fg },
  { text: "spec:", color: theme.fg },
  { text: "  replicas: 3", color: theme.accent },
];

const YamlBlock: React.FC<{ revealedLines: number }> = ({ revealedLines }) => (
  <div
    style={{
      fontFamily: theme.mono,
      fontSize: 16,
      lineHeight: 1.6,
      backgroundColor: "#000",
      padding: 12,
      borderRadius: 6,
      border: `1px solid ${theme.muted}`,
      minHeight: 150,
    }}
  >
    {YAML_LINES.map((line, i) => {
      const visible = i < revealedLines;
      return (
        <div
          key={i}
          style={{
            opacity: visible ? 1 : 0,
            transform: `translateX(${visible ? 0 : -6}px)`,
            color: line.color,
            whiteSpace: "pre",
          }}
        >
          {line.text}
        </div>
      );
    })}
  </div>
);

const GitLogo: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 97 97"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="#F05033"
      d="M92.71,44.408L53.592,5.291c-2.243-2.245-5.88-2.245-8.122,0l-8.13,8.13l10.68,10.68 c2.386-0.806,5.12-0.266,7.02,1.633c1.908,1.91,2.443,4.661,1.627,7.047l10.245,10.244c2.387-0.824,5.147-0.292,7.052,1.615 c2.661,2.66,2.661,6.975,0,9.636c-2.662,2.662-6.976,2.662-9.638,0c-2.006-2.008-2.502-4.978-1.489-7.459l-9.56-9.57v25.153 c0.65,0.32,1.266,0.745,1.807,1.286c2.661,2.656,2.661,6.97,0,9.638c-2.662,2.66-6.979,2.66-9.64,0 c-2.66-2.664-2.66-6.979,0-9.64c0.658-0.658,1.429-1.159,2.25-1.494V36.953c-0.82-0.334-1.592-0.828-2.25-1.492 c-2.016-2.016-2.502-5.002-1.472-7.492L30.58,17.447l-28.93,28.928c-2.243,2.247-2.243,5.884,0,8.131l39.121,39.117 c2.245,2.248,5.881,2.248,8.125,0L92.71,52.532C94.954,50.285,94.954,46.652,92.71,44.408z"
    />
  </svg>
);

const ArgoCDLogo: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 110"
    xmlns="http://www.w3.org/2000/svg"
  >
    <ellipse cx="50" cy="42" rx="32" ry="30" fill="#EF7B4D" />
    <ellipse cx="38" cy="40" rx="6" ry="7" fill="#FFFFFF" />
    <ellipse cx="62" cy="40" rx="6" ry="7" fill="#FFFFFF" />
    <circle cx="38" cy="41" r="3" fill="#1a1a1a" />
    <circle cx="62" cy="41" r="3" fill="#1a1a1a" />
    <path
      d="M22 62 Q 14 78, 22 92 Q 28 100, 20 108"
      stroke="#EF7B4D"
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M40 68 Q 34 82, 42 94 Q 48 102, 40 108"
      stroke="#EF7B4D"
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M60 68 Q 66 82, 58 94 Q 52 102, 60 108"
      stroke="#EF7B4D"
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M78 62 Q 86 78, 78 92 Q 72 100, 80 108"
      stroke="#EF7B4D"
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const GhostYaml: React.FC<{ y: number; opacity: number }> = ({ y, opacity }) => (
  <div
    style={{
      position: "absolute",
      left: "50%",
      top: y,
      opacity,
      transform: "translate(-50%, -50%)",
      padding: "5px 10px",
      borderRadius: 6,
      border: `1px solid ${theme.accent}`,
      backgroundColor: "rgba(51,102,255,0.2)",
      fontFamily: theme.mono,
      fontSize: 14,
      pointerEvents: "none",
    }}
  >
    deploy.yaml
  </div>
);

const Pod: React.FC<{ scale: number }> = ({ scale }) => (
  <div
    style={{
      width: 52,
      height: 52,
      borderRadius: 8,
      border: `2px solid ${theme.accent}`,
      backgroundColor: "rgba(51,102,255,0.15)",
      transform: `scale(${scale})`,
      opacity: scale,
    }}
  />
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

const KUBECTL_CMD = "kubectl apply -f deploy.yaml";

const TypedCommand: React.FC<{ chars: number }> = ({ chars }) => (
  <span>
    {KUBECTL_CMD.slice(0, Math.min(chars, KUBECTL_CMD.length))}
    {chars < KUBECTL_CMD.length && (
      <span style={{ opacity: Math.floor(chars) % 2 ? 0.3 : 1 }}>▌</span>
    )}
  </span>
);

const VerticalArrow: React.FC<{
  x: number;
  y1: number;
  y2: number;
  progress: number;
  label?: string;
}> = ({ x, y1, y2, progress, label }) => {
  // Reserve space for arrowhead so line doesn't overshoot
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
          fontSize={18}
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
