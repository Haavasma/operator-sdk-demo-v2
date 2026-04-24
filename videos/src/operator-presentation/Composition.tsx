import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";

/**
 * operator-reconcile — 10s @ 30fps = 300f, 1080x1080 (split layout)
 *
 * Self-referential: the Presentation operator reconciling its own CR.
 * Payoff: one 8-line spec → 5 child resources materialize.
 *
 * Timeline:
 *   0.0s   YAML types in (Presentation CR)
 *   2.0s   Terminal: `kubectl apply -f presentation.yaml`
 *   3.0s   Arrow down → Presentation Operator (custom controller)
 *   4.0s   Controller pulses, fans out 5 arrows
 *   4.3s   ConfigMap springs in
 *   4.7s   Deployment springs in
 *   5.1s   Service springs in
 *   5.5s   Gateway springs in
 *   5.9s   HTTPRoute springs in
 *   7.0s   Caption: "1 spec → 5 resources · ops knowledge in code"
 *  10.0s   Hold
 */
export const OperatorPresentation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // YAML typing
  const yamlStart = 10;
  const revealedLines = Math.max(0, Math.floor((frame - yamlStart) / 5));

  // Terminal
  const terminalIn = spring({
    frame: frame - 60,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const kubectlChars = Math.max(0, Math.floor((frame - 70) / 1.2));
  const confirmShow = frame >= 70 + KUBECTL_CMD.length * 1.2;

  // Arrow 1: terminal → operator
  const arrow1 = interpolate(frame, [100, 125], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const operatorIn = spring({
    frame: frame - 115,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const operatorPulse = spring({
    frame: frame - 135,
    fps,
    config: { damping: 8, stiffness: 130 },
  });

  // Fan-out arrows (5 arrows from operator bottom to each resource)
  const fanStart = 140;
  const fanArrows = [0, 1, 2, 3, 4].map((i) =>
    interpolate(frame, [fanStart + i * 3, fanStart + 25 + i * 3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  // Resources spring in as each arrow completes
  const resourceSprings = [0, 1, 2, 3, 4].map((i) =>
    spring({
      frame: frame - (fanStart + 25 + i * 3),
      fps,
      config: { damping: 12, stiffness: 100 },
    }),
  );

  const captionIn = interpolate(frame, [200, 225], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Layout math
  // Canvas 1080x1080
  //   y=30     "YOU DECLARE" label
  //   y=58     YAML block (h=210)
  //   y=290    terminal (h=78)
  //   y=395    arrow to operator
  //   y=430    operator node (h=145)
  //   y=590    fan-out arrows begin
  //   y=620    cluster box (h=400)
  //     5 resource cards at y=680
  //   y=1035   caption

  // Resource positions (inside cluster, centered on x=540)
  // 5 cards: w=170, gap=20 → total=890. Row1: 3 cards, Row2: 2 cards
  // Actually let's stack vertically by category: grid 3+2 centered
  const resources = [
    { label: "ConfigMap", sub: "slides.md", row: 0, col: 0 },
    { label: "Deployment", sub: "marp-cli", row: 0, col: 1 },
    { label: "Service", sub: ":8080", row: 0, col: 2 },
    { label: "Gateway", sub: "class=eg", row: 1, col: 0 },
    { label: "HTTPRoute", sub: "*.localhost", row: 1, col: 1 },
  ];

  // Cluster box: x=60..1020 (w=960), y=620..1020 (h=400)
  const clusterX = 60;
  const clusterY = 620;
  const clusterW = 960;
  const cardW = 180;
  const cardH = 120;
  const gap = 20;
  // Row1: 3 cards, row2: 2 cards (centered)
  const row1StartX = clusterX + (clusterW - (3 * cardW + 2 * gap)) / 2;
  const row2StartX = clusterX + (clusterW - (2 * cardW + gap)) / 2;
  const row1Y = clusterY + 50;
  const row2Y = row1Y + cardH + gap;

  const resourceLayout = resources.map((r, i) => {
    const x =
      r.row === 0
        ? row1StartX + r.col * (cardW + gap)
        : row2StartX + r.col * (cardW + gap);
    const y = r.row === 0 ? row1Y : row2Y;
    return { ...r, x: x + cardW / 2, y: y + cardH / 2, left: x, top: y };
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        color: theme.fg,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* YOU DECLARE label */}
      <div
        style={{
          position: "absolute",
          top: 28,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 15,
          color: theme.muted,
          fontFamily: theme.mono,
          letterSpacing: 1,
          opacity: sceneIn,
        }}
      >
        YOU DECLARE
      </div>

      {/* Presentation CR YAML */}
      <div
        style={{
          position: "absolute",
          top: 58,
          left: "50%",
          transform: "translateX(-50%)",
          width: 540,
          padding: 14,
          border: `2px solid ${theme.accent}`,
          borderRadius: 10,
          backgroundColor: "#000",
          fontFamily: theme.mono,
          fontSize: 16,
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

      {/* Terminal */}
      <div
        style={{
          position: "absolute",
          top: 290,
          left: "50%",
          transform: `translateX(-50%) scale(${terminalIn})`,
          transformOrigin: "top center",
          width: 560,
          padding: "10px 14px",
          backgroundColor: "#0b0b0b",
          border: `1px solid ${theme.muted}`,
          borderRadius: 8,
          fontFamily: theme.mono,
          fontSize: 15,
          opacity: terminalIn,
          boxShadow: "0 10px 24px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <Dot color="#ff5f56" />
          <Dot color="#ffbd2e" />
          <Dot color="#27c93f" />
        </div>
        <div style={{ color: theme.accent }}>
          ${" "}
          <TypedCommand cmd={KUBECTL_CMD} chars={kubectlChars} />
        </div>
        {confirmShow && (
          <div style={{ color: "#5fd97a", marginTop: 5 }}>
            presentation.slides.example.com/my-deck created
          </div>
        )}
      </div>

      {/* Arrow to operator */}
      <VerticalArrow x={540} y1={400} y2={450} progress={arrow1} />

      {/* Operator node */}
      <div
        style={{
          position: "absolute",
          top: 460,
          left: "50%",
          transform: `translateX(-50%) scale(${Math.max(
            operatorIn,
            1 + 0.08 * operatorPulse,
          )})`,
          width: 320,
          height: 130,
          borderRadius: 14,
          border: `3px solid #00ADD8`,
          backgroundColor: theme.dim,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          boxShadow: operatorPulse
            ? `0 0 ${40 * operatorPulse}px ${10 * operatorPulse}px rgba(0,173,216,${0.6 * operatorPulse})`
            : undefined,
          opacity: sceneIn,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <GearIcon size={46} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>
              Presentation Operator
            </div>
            <div
              style={{
                fontSize: 13,
                color: theme.muted,
                fontFamily: theme.mono,
              }}
            >
              written in Go · you own it
            </div>
          </div>
        </div>
      </div>

      {/* Cluster box */}
      <div
        style={{
          position: "absolute",
          left: clusterX,
          top: clusterY,
          width: clusterW,
          height: 400,
          border: `2px dashed ${theme.muted}`,
          borderRadius: 14,
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
          CLUSTER (reconciled children)
        </div>
      </div>

      {/* Fan-out arrows from operator bottom → each resource */}
      {resourceLayout.map((r, i) => (
        <FanArrow
          key={i}
          x1={540}
          y1={590}
          x2={r.x}
          y2={r.top - 4}
          progress={fanArrows[i]}
        />
      ))}

      {/* Resource cards */}
      {resourceLayout.map((r, i) => (
        <ResourceCard
          key={i}
          label={r.label}
          sub={r.sub}
          left={r.left}
          top={r.top}
          w={cardW}
          h={cardH}
          scale={resourceSprings[i]}
        />
      ))}

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 18,
          color: "#5fd97a",
          fontFamily: theme.mono,
          opacity: captionIn,
        }}
      >
        ● 1 spec → 5 resources · ops knowledge as code
      </div>
    </AbsoluteFill>
  );
};

// ── YAML ─────────────────────────────────────────

const YAML_LINES = [
  { text: "kind: Presentation", color: theme.accent },
  { text: "metadata:", color: theme.fg },
  { text: "  name: my-deck", color: theme.fg },
  { text: "spec:", color: theme.fg },
  { text: "  theme:", color: theme.fg },
  { text: "    bg: black", color: theme.muted },
  { text: "  slides:", color: theme.fg },
  { text: "    - title: Hello", color: theme.muted },
];

const KUBECTL_CMD = "kubectl apply -f presentation.yaml";

// ── Subcomponents ────────────────────────────────

const TypedCommand: React.FC<{ cmd: string; chars: number }> = ({
  cmd,
  chars,
}) => (
  <span>
    {cmd.slice(0, Math.min(chars, cmd.length))}
    {chars < cmd.length && (
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

const ResourceCard: React.FC<{
  label: string;
  sub: string;
  left: number;
  top: number;
  w: number;
  h: number;
  scale: number;
}> = ({ label, sub, left, top, w, h, scale }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width: w,
      height: h,
      borderRadius: 10,
      border: `2px solid ${theme.accent}`,
      backgroundColor: "rgba(51,102,255,0.08)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      fontFamily: theme.mono,
      transform: `scale(${scale})`,
      opacity: scale,
    }}
  >
    <div style={{ fontSize: 18, fontWeight: 600, color: theme.fg }}>
      {label}
    </div>
    <div style={{ fontSize: 13, color: theme.muted, marginTop: 4 }}>
      {sub}
    </div>
  </div>
);

const GearIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="50" cy="50" r="30" fill="none" stroke="#00ADD8" strokeWidth="5" />
    <circle cx="50" cy="50" r="10" fill="#00ADD8" />
    {/* 8 teeth */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const x1 = 50 + 32 * Math.cos(rad);
      const y1 = 50 + 32 * Math.sin(rad);
      const x2 = 50 + 44 * Math.cos(rad);
      const y2 = 50 + 44 * Math.sin(rad);
      return (
        <line
          key={deg}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#00ADD8"
          strokeWidth="6"
          strokeLinecap="round"
        />
      );
    })}
  </svg>
);

const VerticalArrow: React.FC<{
  x: number;
  y1: number;
  y2: number;
  progress: number;
}> = ({ x, y1, y2, progress }) => {
  const headSize = 12;
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
          points={`${x - 8},${y2 - headSize} ${x + 8},${y2 - headSize} ${x},${y2}`}
          fill={theme.accent}
        />
      )}
    </svg>
  );
};

const FanArrow: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
}> = ({ x1, y1, x2, y2, progress }) => {
  const endX = x1 + (x2 - x1) * progress;
  const endY = y1 + (y2 - y1) * progress;
  const headVisible = progress > 0.95;
  // Arrow direction angle
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headSize = 10;
  // Arrowhead triangle points (at tip, rotated by angle)
  const tipX = x2;
  const tipY = y2;
  const baseLeftX = tipX - headSize * Math.cos(angle - Math.PI / 6);
  const baseLeftY = tipY - headSize * Math.sin(angle - Math.PI / 6);
  const baseRightX = tipX - headSize * Math.cos(angle + Math.PI / 6);
  const baseRightY = tipY - headSize * Math.sin(angle + Math.PI / 6);
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
        x1={x1}
        y1={y1}
        x2={endX}
        y2={endY}
        stroke="#00ADD8"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.75}
      />
      {headVisible && (
        <polygon
          points={`${tipX},${tipY} ${baseLeftX},${baseLeftY} ${baseRightX},${baseRightY}`}
          fill="#00ADD8"
          opacity={0.9}
        />
      )}
    </svg>
  );
};
