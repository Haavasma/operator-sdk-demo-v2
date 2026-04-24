import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";

/**
 * problem-toil — 8s @ 30fps = 240f, 1080x1080 (split layout)
 *
 * Timeline:
 *   0.0s  App card springs in (centered)
 *   1.0s  "goal: expose one endpoint" caption below
 *   1.5s  Tickets orbit in (6 total, reduced radius)
 *   4.8s  Week counter ticks 1 → 14 (bottom)
 *   6.5s  Dim overlay, punchline emerges
 *   7.8s  Fade
 */
export const ProblemToil: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appScale = spring({
    frame: frame - 0,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const goalOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Orbit radius tightened for square canvas (center 540,500)
  const tickets: TicketProps[] = [
    { delay: 45, text: "security review", angle: -135, radius: 340 },
    { delay: 63, text: "akamai edge rule", angle: -70, radius: 360 },
    { delay: 81, text: "DNS request", angle: 0, radius: 340 },
    { delay: 99, text: "change approval", angle: 65, radius: 360 },
    { delay: 117, text: "re: re: akamai", angle: 135, radius: 340 },
    { delay: 135, text: "waiting on DNS...", angle: 180, radius: 300 },
  ];

  const weekStart = 144;
  const weekEnd = 195;
  const weekCount = Math.round(
    interpolate(frame, [weekStart, weekEnd], [1, 14], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const weekOpacity = interpolate(frame, [weekStart, weekStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const freezeStart = 195;
  const dimOpacity = interpolate(
    frame,
    [freezeStart, freezeStart + 15],
    [0, 0.72],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const punchlineOpacity = interpolate(
    frame,
    [freezeStart + 15, freezeStart + 30],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const punchlineScale = spring({
    frame: frame - (freezeStart + 15),
    fps,
    config: { damping: 10, stiffness: 120 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        color: theme.fg,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Center app card */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) scale(${appScale})`,
          width: 280,
          padding: 26,
          border: `2px solid ${theme.accent}`,
          borderRadius: 16,
          backgroundColor: theme.dim,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 18,
            color: theme.muted,
            fontFamily: theme.mono,
            marginBottom: 10,
          }}
        >
          Azure Function App
        </div>
        <div style={{ fontSize: 30, fontWeight: 600 }}>my-app</div>
        <div
          style={{
            fontSize: 15,
            color: theme.muted,
            marginTop: 10,
            fontFamily: theme.mono,
          }}
        >
          /api/hello
        </div>
      </div>

      {/* Goal caption */}
      <div
        style={{
          position: "absolute",
          top: "calc(50% + 120px)",
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 22,
          color: theme.muted,
          opacity: goalOpacity,
        }}
      >
        goal: one endpoint, customer's domain
      </div>

      {/* Orbiting tickets */}
      {tickets.map((t, i) => (
        <Ticket key={i} frame={frame} fps={fps} {...t} />
      ))}

      {/* Week counter (bottom of square) */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: weekOpacity,
          fontFamily: theme.mono,
        }}
      >
        <div style={{ fontSize: 18, color: theme.muted }}>elapsed</div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: theme.accent,
            lineHeight: 1.05,
          }}
        >
          week {weekCount}
        </div>
      </div>

      {/* Freeze dim */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: `rgba(0, 0, 0, ${dimOpacity})`,
          pointerEvents: "none",
        }}
      />

      {/* Punchline */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: punchlineOpacity,
          transform: `scale(${0.9 + 0.1 * punchlineScale})`,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>
            months.
          </div>
          <div
            style={{
              fontSize: 34,
              color: theme.muted,
              marginTop: 12,
            }}
          >
            for one endpoint.
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

type TicketProps = {
  delay: number;
  text: string;
  angle: number;
  radius: number;
};

const Ticket: React.FC<TicketProps & { frame: number; fps: number }> = ({
  delay,
  text,
  angle,
  radius,
  frame,
  fps,
}) => {
  const local = frame - delay;
  const appear = spring({
    frame: local,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  if (local < 0) return null;

  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;

  const drift = Math.sin((frame - delay) / 20) * 3;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y + drift}px)) scale(${appear})`,
        padding: "10px 16px",
        borderRadius: 8,
        backgroundColor: "#1a1a1a",
        border: `1px solid ${theme.muted}`,
        fontFamily: theme.mono,
        fontSize: 16,
        color: theme.fg,
        boxShadow: "0 6px 20px rgba(0,0,0,0.6)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: theme.accent, marginRight: 8 }}>●</span>
      {text}
    </div>
  );
};
