import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";

/**
 * operator-exposedapp — 12s @ 30fps = 360f, 1920x1080 (hero layout)
 *
 * Compact three-column layout. No top title (slide provides context).
 *   LEFT:   ExposedApp CR + kubectl apply
 *   MIDDLE: Cluster containing ExposedApp Operator
 *   RIGHT:  4 external systems (security · akamai · DNS · change board)
 */
export const OperatorExposedApp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const yamlStart = 10;
  const revealedLines = Math.max(0, Math.floor((frame - yamlStart) / 4));

  const terminalIn = spring({
    frame: frame - 75,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const kubectlChars = Math.max(0, Math.floor((frame - 85) / 1.2));
  const confirmShow = frame >= 85 + KUBECTL_CMD.length * 1.2;

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

  const externalStart = 165;
  const perSystemDelay = 22;
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

  const urlIn = interpolate(frame, [280, 310], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const captionIn = interpolate(frame, [310, 340], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Layout (1920x1080) ──
  // Left column:    x=40..580  (w=540)  YAML + terminal
  // Middle cluster: x=620..1100 (w=480)  Operator at center
  // Right column:   x=1140..1880 (w=740) 4 external cards

  const operatorCenterX = 860;
  const operatorCenterY = 500;

  const extStartY = 180;
  const extW = 740;
  const extH = 130;
  const extGap = 25;
  const extX = 1140;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        color: theme.fg,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* LEFT label + YAML */}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 60,
          fontSize: 18,
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
          top: 100,
          width: 540,
          padding: 18,
          border: `2px solid ${theme.accent}`,
          borderRadius: 10,
          backgroundColor: "#000",
          fontFamily: theme.mono,
          fontSize: 22,
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
          top: 480,
          width: 540,
          padding: "14px 18px",
          backgroundColor: "#0b0b0b",
          border: `1px solid ${theme.muted}`,
          borderRadius: 8,
          fontFamily: theme.mono,
          fontSize: 19,
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
          <div style={{ color: "#5fd97a", marginTop: 6, fontSize: 17 }}>
            exposedapp.platform.example.com/my-app created
          </div>
        )}
      </div>

      {/* Arrow: Terminal → Operator */}
      <HorizontalArrow
        x1={590}
        x2={operatorCenterX - 170}
        y={500}
        progress={arrowToOperator}
      />

      {/* MIDDLE: Cluster box */}
      <div
        style={{
          position: "absolute",
          left: 620,
          top: 150,
          width: 480,
          height: 720,
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
            padding: "0 14px",
            fontSize: 16,
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
          left: operatorCenterX - 170,
          top: operatorCenterY - 85,
          width: 340,
          height: 170,
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
        <GearIcon size={54} />
        <div style={{ fontSize: 22, fontWeight: 600, marginTop: 8 }}>
          ExposedApp Operator
        </div>
        <div
          style={{
            fontSize: 14,
            color: theme.muted,
            marginTop: 4,
            fontFamily: theme.mono,
          }}
        >
          your team's encoded playbook
        </div>
      </div>

      {/* Fan-out arrows */}
      {externalSystems.map((sys, i) => {
        const cardTop = extStartY + i * (extH + extGap);
        const cardCenterY = cardTop + extH / 2;
        return (
          <FanArrow
            key={i}
            x1={operatorCenterX + 170}
            y1={operatorCenterY}
            x2={extX}
            y2={cardCenterY}
            progress={sys.arrowProgress}
          />
        );
      })}

      {/* RIGHT: External systems */}
      <div
        style={{
          position: "absolute",
          left: extX,
          top: 130,
          fontSize: 18,
          color: theme.muted,
          fontFamily: theme.mono,
          letterSpacing: 1,
          opacity: sceneIn,
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
              borderRadius: 12,
              border: `2px solid ${done ? "#5fd97a" : theme.muted}`,
              backgroundColor: done ? "rgba(95,217,122,0.08)" : theme.dim,
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              fontFamily: theme.mono,
              opacity: sceneIn,
            }}
          >
            <div style={{ fontSize: 34, marginRight: 22 }}>{sys.icon}</div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: done ? "#5fd97a" : theme.fg,
                }}
              >
                {sys.name}
              </div>
              <div style={{ fontSize: 17, color: theme.muted, marginTop: 3 }}>
                {done ? sys.done : sys.pending}
              </div>
            </div>
            <div
              style={{
                fontSize: 44,
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

      {/* Final URL */}
      <div
        style={{
          position: "absolute",
          bottom: 110,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: urlIn,
          transform: `scale(${0.94 + 0.06 * urlIn})`,
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
            fontSize: 36,
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
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 26,
          color: theme.fg,
          fontFamily: theme.fontFamily,
          opacity: captionIn,
        }}
      >
        what took{" "}
        <span style={{ textDecoration: "line-through", color: theme.muted }}>
          months
        </span>{" "}
        → <span style={{ color: "#5fd97a", fontWeight: 600 }}>~90 seconds</span>
      </div>
    </AbsoluteFill>
  );
};

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

const EXTERNAL = [
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
      width: 10,
      height: 10,
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
