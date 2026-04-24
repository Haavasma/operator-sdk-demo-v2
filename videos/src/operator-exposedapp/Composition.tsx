import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";

/**
 * operator-exposedapp — 13s @ 30fps = 390f, 1920x1080 (hero layout)
 *
 * Payoff for the AMD story: a domain-specific `ExposedApp` operator
 * fans out to the SAME external teams that took months of tickets.
 *
 * Horizontal flow (matches the hero format):
 *   LEFT:   Developer writes `ExposedApp` CR + kubectl apply
 *   MIDDLE: Cluster box containing ExposedApp Operator
 *   RIGHT:  5 external systems (echoing problem-toil tickets):
 *             Firewall · Security · Akamai · DNS · Change board
 *
 * Timeline:
 *   0.0s   Scene fades in
 *   0.3s   YAML types in (ExposedApp spec)
 *   2.5s   Terminal: kubectl apply -f exposedapp.yaml
 *   3.3s   Terminal confirmation
 *   3.8s   Arrow → Operator (crosses into cluster)
 *   4.5s   Operator springs in, pulses
 *   5.3s   Fan-out arrows reach each external system
 *   5.8s   Firewall ✓ NSG rule created
 *   6.6s   Security ✓ flow approved
 *   7.4s   Akamai ✓ edge rule deployed
 *   8.2s   DNS ✓ record published
 *   9.0s   Change board ✓ ticket auto-filed
 *  10.0s   Final URL surfaces: https://api.customer.com/hello · LIVE
 *  11.0s   Callback caption: "what took months → ~90 seconds"
 *  13.0s   Hold
 */
export const OperatorExposedApp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // YAML typing
  const yamlStart = 10;
  const revealedLines = Math.max(0, Math.floor((frame - yamlStart) / 4));

  // Terminal
  const terminalIn = spring({
    frame: frame - 75,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const kubectlChars = Math.max(0, Math.floor((frame - 85) / 1.2));
  const confirmShow = frame >= 85 + KUBECTL_CMD.length * 1.2;

  // Arrow → operator
  const arrowToOperator = interpolate(frame, [115, 145], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const operatorIn = spring({
    frame: frame - 135,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const operatorPulse = spring({
    frame: frame - 155,
    fps,
    config: { damping: 8, stiffness: 130 },
  });

  // External systems — each has its own fan-out arrow + check animation
  const externalStart = 165;
  const perSystemDelay = 22; // frames between systems
  const externalSystems = EXTERNAL.map((sys, i) => {
    const arrowStart = externalStart + i * perSystemDelay;
    const checkStart = arrowStart + 22;
    return {
      ...sys,
      arrowProgress: interpolate(
        frame,
        [arrowStart, arrowStart + 22],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      ),
      checkIn: spring({
        frame: frame - checkStart,
        fps,
        config: { damping: 12, stiffness: 110 },
      }),
    };
  });

  // Final URL + callback caption
  const urlIn = interpolate(frame, [305, 330], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const captionIn = interpolate(frame, [330, 355], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Layout (1920x1080) ──
  // Left column:    x=40..600  (YAML, terminal)
  // Middle cluster: x=640..1140 (cluster box w=500)
  //                 Operator at (x=890 center, y=470)
  // Right column:   x=1160..1880 (5 external system cards stacked)

  const operatorCenterX = 890;
  const operatorCenterY = 540;
  const operatorHalfH = 80;

  // External card layout
  const extStartY = 180;
  const extW = 700;
  const extH = 110;
  const extGap = 20;
  const extX = 1180;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        color: theme.fg,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 30,
          fontWeight: 600,
          opacity: sceneIn,
        }}
      >
        A domain-specific operator encodes the dance
      </div>

      {/* ── LEFT: Developer intent ── */}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 120,
          fontSize: 16,
          color: theme.muted,
          fontFamily: theme.mono,
          letterSpacing: 1,
          opacity: sceneIn,
        }}
      >
        DEVELOPER WRITES
      </div>
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 155,
          width: 560,
          padding: 16,
          border: `2px solid ${theme.accent}`,
          borderRadius: 10,
          backgroundColor: "#000",
          fontFamily: theme.mono,
          fontSize: 19,
          lineHeight: 1.55,
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
          left: 40,
          top: 500,
          width: 560,
          padding: "12px 16px",
          backgroundColor: "#0b0b0b",
          border: `1px solid ${theme.muted}`,
          borderRadius: 8,
          fontFamily: theme.mono,
          fontSize: 17,
          transform: `scale(${terminalIn})`,
          transformOrigin: "top left",
          opacity: terminalIn,
          boxShadow: "0 10px 24px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <Dot color="#ff5f56" />
          <Dot color="#ffbd2e" />
          <Dot color="#27c93f" />
        </div>
        <div style={{ color: theme.accent }}>
          ${" "}
          <TypedCommand cmd={KUBECTL_CMD} chars={kubectlChars} />
        </div>
        {confirmShow && (
          <div style={{ color: "#5fd97a", marginTop: 6 }}>
            exposedapp.platform.example.com/my-app created
          </div>
        )}
      </div>

      {/* Arrow: Terminal → Operator (horizontal, crossing into cluster) */}
      <HorizontalArrow
        x1={610}
        x2={operatorCenterX - 160}
        y={540}
        progress={arrowToOperator}
      />

      {/* ── MIDDLE: Cluster box ── */}
      <div
        style={{
          position: "absolute",
          left: 640,
          top: 180,
          width: 500,
          height: 770,
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
          CLUSTER
        </div>
      </div>

      {/* Operator node */}
      <div
        style={{
          position: "absolute",
          left: operatorCenterX - 160,
          top: operatorCenterY - operatorHalfH,
          width: 320,
          height: 160,
          borderRadius: 14,
          border: `3px solid #00ADD8`,
          backgroundColor: theme.dim,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          transform: `scale(${Math.max(operatorIn, 1 + 0.08 * operatorPulse)})`,
          boxShadow: operatorPulse
            ? `0 0 ${40 * operatorPulse}px ${10 * operatorPulse}px rgba(0,173,216,${0.55 * operatorPulse})`
            : undefined,
          opacity: sceneIn,
        }}
      >
        <GearIcon size={48} />
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6 }}>
          ExposedApp Operator
        </div>
        <div
          style={{
            fontSize: 12,
            color: theme.muted,
            marginTop: 2,
            fontFamily: theme.mono,
          }}
        >
          your team's encoded playbook
        </div>
      </div>

      {/* Fan-out arrows from operator to each external system */}
      {externalSystems.map((sys, i) => {
        const cardTop = extStartY + i * (extH + extGap);
        const cardCenterY = cardTop + extH / 2;
        return (
          <FanArrow
            key={i}
            x1={operatorCenterX + 160}
            y1={operatorCenterY}
            x2={extX}
            y2={cardCenterY}
            progress={sys.arrowProgress}
          />
        );
      })}

      {/* ── RIGHT: External systems ── */}
      <div
        style={{
          position: "absolute",
          right: 40,
          top: 120,
          fontSize: 16,
          color: theme.muted,
          fontFamily: theme.mono,
          letterSpacing: 1,
          opacity: sceneIn,
          textAlign: "right",
          width: extW,
        }}
      >
        EXTERNAL SYSTEMS · the months-of-tickets
      </div>
      {externalSystems.map((sys, i) => {
        const cardTop = extStartY + i * (extH + extGap);
        const done = sys.checkIn > 0.2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: extX,
              top: cardTop,
              width: extW,
              height: extH,
              borderRadius: 10,
              border: `2px solid ${done ? "#5fd97a" : theme.muted}`,
              backgroundColor: done ? "rgba(95,217,122,0.08)" : theme.dim,
              display: "flex",
              alignItems: "center",
              padding: "0 20px",
              fontFamily: theme.mono,
              opacity: sceneIn,
              transition: "none",
            }}
          >
            <div style={{ fontSize: 28, marginRight: 18 }}>{sys.icon}</div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: done ? "#5fd97a" : theme.fg,
                }}
              >
                {sys.name}
              </div>
              <div style={{ fontSize: 14, color: theme.muted, marginTop: 2 }}>
                {done ? sys.done : sys.pending}
              </div>
            </div>
            <div
              style={{
                fontSize: 36,
                color: "#5fd97a",
                opacity: sys.checkIn,
                transform: `scale(${sys.checkIn})`,
              }}
            >
              ✓
            </div>
          </div>
        );
      })}

      {/* Final URL surface */}
      <div
        style={{
          position: "absolute",
          bottom: 150,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: urlIn,
          transform: `scale(${0.92 + 0.08 * urlIn})`,
        }}
      >
        <div
          style={{
            fontSize: 20,
            color: theme.muted,
            fontFamily: theme.mono,
          }}
        >
          ● LIVE
        </div>
        <div
          style={{
            fontSize: 38,
            color: "#5fd97a",
            fontFamily: theme.mono,
            marginTop: 6,
          }}
        >
          https://api.customer.com/hello
        </div>
      </div>

      {/* Callback caption */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 24,
          color: theme.fg,
          fontFamily: theme.fontFamily,
          opacity: captionIn,
        }}
      >
        what took <span style={{ textDecoration: "line-through", color: theme.muted }}>months</span> → <span style={{ color: "#5fd97a", fontWeight: 600 }}>~90 seconds</span>
      </div>
    </AbsoluteFill>
  );
};

// ── YAML ─────────────────────────────────────────

const YAML_LINES = [
  { text: "kind: ExposedApp", color: theme.accent },
  { text: "metadata:", color: theme.fg },
  { text: "  name: my-app", color: theme.fg },
  { text: "spec:", color: theme.fg },
  { text: "  service: my-app:8080", color: theme.fg },
  { text: "  domain: api.customer.com", color: theme.accent },
  { text: "  path: /hello", color: theme.fg },
  { text: "  team: platform", color: theme.fg },
];

const KUBECTL_CMD = "kubectl apply -f exposedapp.yaml";

// ── External systems (callback to problem-toil tickets) ──

const EXTERNAL = [
  {
    name: "Firewall",
    icon: "🧱",
    pending: "opening port 443...",
    done: "✓ NSG rule created",
  },
  {
    name: "Security",
    icon: "🛡",
    pending: "reviewing data flow...",
    done: "✓ flow approved",
  },
  {
    name: "Akamai Edge",
    icon: "🌐",
    pending: "configuring edge rule...",
    done: "✓ edge rule deployed",
  },
  {
    name: "DNS",
    icon: "📡",
    pending: "registering record...",
    done: "✓ record published",
  },
  {
    name: "Change Board",
    icon: "📋",
    pending: "filing ticket...",
    done: "✓ auto-approved",
  },
];

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
      width: 9,
      height: 9,
      borderRadius: "50%",
      backgroundColor: color,
      display: "inline-block",
    }}
  />
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

const HorizontalArrow: React.FC<{
  x1: number;
  x2: number;
  y: number;
  progress: number;
}> = ({ x1, x2, y, progress }) => {
  const headSize = 12;
  const effectiveX2 = x2 - headSize;
  const endX = x1 + (effectiveX2 - x1) * progress;
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
        x1={x1}
        y1={y}
        x2={endX}
        y2={y}
        stroke={theme.accent}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {headVisible && (
        <polygon
          points={`${x2 - headSize},${y - 8} ${x2 - headSize},${y + 8} ${x2},${y}`}
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
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headSize = 10;
  const baseLeftX = x2 - headSize * Math.cos(angle - Math.PI / 6);
  const baseLeftY = y2 - headSize * Math.sin(angle - Math.PI / 6);
  const baseRightX = x2 - headSize * Math.cos(angle + Math.PI / 6);
  const baseRightY = y2 - headSize * Math.sin(angle + Math.PI / 6);
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
          points={`${x2},${y2} ${baseLeftX},${baseLeftY} ${baseRightX},${baseRightY}`}
          fill="#00ADD8"
          opacity={0.9}
        />
      )}
    </svg>
  );
};
