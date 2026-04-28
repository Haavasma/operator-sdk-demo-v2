import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";

/**
 * operator-reconcile — 8s @ 30fps = 240f, 1080x1080 (split layout)
 *
 * The reconcile loop made visible. Four stages around the operator gear,
 * activating in sequence; on the second pass everything flashes together to
 * sell "24/7 control loop".
 *
 * Timeline:
 *   0.0s   scene fade in, title, center gear, dim ring
 *   0.7s   Watch stage activates (top)
 *   1.5s   curved arrow → Diff stage activates (right)
 *   2.3s   curved arrow → Apply stage activates (bottom)
 *   3.1s   curved arrow → Status stage activates (left)
 *   3.9s   curved arrow → loops back to Watch
 *   4.5s   second pass: all four pulse in unison
 *   5.5s   caption fades in: "watch → diff → apply → repeat · 24/7"
 *   8.0s   end
 */
export const OperatorReconcile: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Stage activation windows (frames)
  // Each stage: glow ramps up over ~12f, then holds; arrow to next stage
  // overlaps the tail of the previous stage's hold.
  const stageActivations = [
    interpolateGlow(frame, 20), // Watch: starts at f20
    interpolateGlow(frame, 50), // Diff:  starts at f50
    interpolateGlow(frame, 80), // Apply: starts at f80
    interpolateGlow(frame, 110), // Status: starts at f110
  ];

  // Curved arrow progress between stages
  const arc01 = interpolate(frame, [38, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arc12 = interpolate(frame, [68, 88], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arc23 = interpolate(frame, [98, 118], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arc30 = interpolate(frame, [128, 148], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Second pass — at f150, everything pulses in unison once
  const unisonPulse = spring({
    frame: frame - 150,
    fps,
    config: { damping: 8, stiffness: 130 },
  });
  const unisonFade = interpolate(frame, [150, 165, 200], [0, 1, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Center gear pulses each time a stage activates
  const gearPulse = Math.max(
    spring({ frame: frame - 22, fps, config: { damping: 10, stiffness: 140 } }) -
      spring({ frame: frame - 32, fps, config: { damping: 10, stiffness: 140 } }),
    spring({ frame: frame - 52, fps, config: { damping: 10, stiffness: 140 } }) -
      spring({ frame: frame - 62, fps, config: { damping: 10, stiffness: 140 } }),
    spring({ frame: frame - 82, fps, config: { damping: 10, stiffness: 140 } }) -
      spring({ frame: frame - 92, fps, config: { damping: 10, stiffness: 140 } }),
    spring({ frame: frame - 112, fps, config: { damping: 10, stiffness: 140 } }) -
      spring({ frame: frame - 122, fps, config: { damping: 10, stiffness: 140 } }),
    unisonPulse,
  );

  const captionIn = interpolate(frame, [165, 195], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Layout — center of canvas
  const cx = 540;
  const cy = 560;
  const ringR = 320; // distance from center to stage card center

  const stages = [
    { label: "WATCH", sub: "observe spec", angle: -90, icon: "eye" as const },
    { label: "DIFF", sub: "desired vs actual", angle: 0, icon: "delta" as const },
    { label: "APPLY", sub: "create / update", angle: 90, icon: "wrench" as const },
    { label: "STATUS", sub: "update CR", angle: 180, icon: "check" as const },
  ];

  const stagePositions = stages.map((s) => {
    const rad = (s.angle * Math.PI) / 180;
    return {
      ...s,
      x: cx + ringR * Math.cos(rad),
      y: cy + ringR * Math.sin(rad),
    };
  });

  const arcs = [
    { from: stagePositions[0], to: stagePositions[1], progress: arc01 },
    { from: stagePositions[1], to: stagePositions[2], progress: arc12 },
    { from: stagePositions[2], to: stagePositions[3], progress: arc23 },
    { from: stagePositions[3], to: stagePositions[0], progress: arc30 },
  ];

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
          top: 36,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 16,
          color: theme.muted,
          fontFamily: theme.mono,
          letterSpacing: 2,
          opacity: sceneIn,
        }}
      >
        RECONCILE LOOP
      </div>
      <div
        style={{
          position: "absolute",
          top: 64,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 30,
          fontWeight: 600,
          opacity: sceneIn,
        }}
      >
        controller never sleeps
      </div>

      {/* Dim background ring (full circle) */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          opacity: sceneIn * 0.35,
        }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={ringR}
          fill="none"
          stroke={theme.muted}
          strokeWidth={1.5}
          strokeDasharray="4 6"
        />
      </svg>

      {/* Curved arrows between stages */}
      {arcs.map((a, i) => (
        <CurvedArrow
          key={i}
          cx={cx}
          cy={cy}
          r={ringR}
          fromAngleDeg={stages[i].angle}
          toAngleDeg={stages[(i + 1) % 4].angle}
          progress={a.progress}
        />
      ))}

      {/* Center: operator gear */}
      <div
        style={{
          position: "absolute",
          left: cx - 80,
          top: cy - 80,
          width: 160,
          height: 160,
          borderRadius: "50%",
          border: `3px solid #00ADD8`,
          backgroundColor: theme.dim,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          transform: `scale(${1 + 0.06 * gearPulse})`,
          boxShadow: gearPulse
            ? `0 0 ${50 * gearPulse}px ${12 * gearPulse}px rgba(0,173,216,${0.55 * gearPulse})`
            : undefined,
          opacity: sceneIn,
        }}
      >
        <GearIcon size={66} />
        <div
          style={{
            fontSize: 13,
            color: theme.muted,
            fontFamily: theme.mono,
            marginTop: 4,
          }}
        >
          operator
        </div>
      </div>

      {/* Stage cards */}
      {stagePositions.map((s, i) => (
        <StageCard
          key={i}
          x={s.x}
          y={s.y}
          label={s.label}
          sub={s.sub}
          icon={s.icon}
          activation={Math.max(stageActivations[i], unisonFade)}
        />
      ))}

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 22,
          color: "#5fd97a",
          fontFamily: theme.mono,
          opacity: captionIn,
        }}
      >
        ● watch → diff → apply → repeat · 24/7
      </div>
    </AbsoluteFill>
  );
};

// ── helpers ─────────────────────────────────────

function interpolateGlow(frame: number, startFrame: number): number {
  return interpolate(
    frame,
    [startFrame, startFrame + 12, startFrame + 26],
    [0, 1, 0.7],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

// ── subcomponents ───────────────────────────────

type IconKind = "eye" | "delta" | "wrench" | "check";

const StageCard: React.FC<{
  x: number;
  y: number;
  label: string;
  sub: string;
  icon: IconKind;
  activation: number;
}> = ({ x, y, label, sub, icon, activation }) => {
  const w = 230;
  const h = 130;
  const glow = activation;
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        borderRadius: 12,
        border: `2px solid ${glow > 0.05 ? theme.accent : theme.muted}`,
        backgroundColor:
          glow > 0.05
            ? `rgba(51,102,255,${0.12 * glow})`
            : "rgba(40,40,40,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: theme.mono,
        boxShadow:
          glow > 0.1
            ? `0 0 ${30 * glow}px ${6 * glow}px rgba(51,102,255,${0.55 * glow})`
            : undefined,
        transform: `scale(${1 + 0.04 * glow})`,
        transition: "border-color 0.2s",
      }}
    >
      <StageIcon kind={icon} active={glow > 0.2} />
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: glow > 0.05 ? theme.fg : theme.muted,
          marginTop: 8,
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: theme.muted,
          marginTop: 2,
        }}
      >
        {sub}
      </div>
    </div>
  );
};

const StageIcon: React.FC<{ kind: IconKind; active: boolean }> = ({
  kind,
  active,
}) => {
  const color = active ? theme.accent : theme.muted;
  const size = 30;
  switch (kind) {
    case "eye":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <ellipse
            cx="50"
            cy="50"
            rx="42"
            ry="22"
            fill="none"
            stroke={color}
            strokeWidth="6"
          />
          <circle cx="50" cy="50" r="10" fill={color} />
        </svg>
      );
    case "delta":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <polygon
            points="50,15 88,80 12,80"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "wrench":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <path
            d="M70 10 L90 30 L70 50 L60 40 L40 60 L30 50 L50 30 L60 40 Z"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <line
            x1="40"
            y1="60"
            x2="20"
            y2="80"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="20" cy="80" r="8" fill={color} />
        </svg>
      );
    case "check":
      return (
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke={color}
            strokeWidth="5"
          />
          <polyline
            points="32,52 46,68 70,38"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};

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

const CurvedArrow: React.FC<{
  cx: number;
  cy: number;
  r: number;
  fromAngleDeg: number;
  toAngleDeg: number;
  progress: number;
}> = ({ cx, cy, r, fromAngleDeg, toAngleDeg, progress }) => {
  // Inset the arc endpoints so we don't overlap with stage cards.
  const insetDeg = 18;
  const startDeg = fromAngleDeg + insetDeg;
  // Always go clockwise by adding 90° between each (with end inset).
  const endDeg = toAngleDeg - insetDeg;
  const totalDeg = ((endDeg - startDeg + 360) % 360);

  // Sample arc points
  const samples = 60;
  const visibleEnd = startDeg + totalDeg * progress;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const deg = startDeg + (visibleEnd - startDeg) * t;
    const rad = (deg * Math.PI) / 180;
    points.push({
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    });
  }
  const path = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  // Arrowhead at the visible end of the arc (tangent to circle)
  const tipRad = (visibleEnd * Math.PI) / 180;
  const tipX = cx + r * Math.cos(tipRad);
  const tipY = cy + r * Math.sin(tipRad);
  // Tangent direction (clockwise = +90 degrees from radius direction)
  const tangentRad = tipRad + Math.PI / 2;
  const headSize = 16;
  const baseLeftX = tipX - headSize * Math.cos(tangentRad - Math.PI / 6);
  const baseLeftY = tipY - headSize * Math.sin(tangentRad - Math.PI / 6);
  const baseRightX = tipX - headSize * Math.cos(tangentRad + Math.PI / 6);
  const baseRightY = tipY - headSize * Math.sin(tangentRad + Math.PI / 6);

  const headVisible = progress > 0.92;

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
      <path
        d={path}
        fill="none"
        stroke={theme.accent}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={progress > 0 ? 0.95 : 0}
      />
      {headVisible && (
        <polygon
          points={`${tipX},${tipY} ${baseLeftX},${baseLeftY} ${baseRightX},${baseRightY}`}
          fill={theme.accent}
        />
      )}
    </svg>
  );
};
