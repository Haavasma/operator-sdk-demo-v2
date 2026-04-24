import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";

/**
 * crd-abstraction — 9s @ 30fps = 270f, 1080x1080 (split layout)
 *
 * Simple self-contained example: the `Greeting` resource.
 * Two panels: CRD (definition) on top, CR (instance) on bottom.
 *
 * Timeline:
 *   0.0s   "1. DEFINE THE TYPE" + CRD YAML types in
 *   1.8s   Terminal types `kubectl apply -f crd.yaml`, confirmation
 *   3.0s   Separator: "✓ API now knows Greeting"
 *   3.7s   "2. CREATE AN INSTANCE" + CR YAML types in
 *   5.7s   Terminal types `kubectl apply -f greeting.yaml`, confirmation
 *   7.0s   Final caption: "Now it's a first-class resource"
 *   8.0s   kubectl get output held
 *   9.0s   End (hold final state)
 */
export const CrdAbstraction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // ── Phase 1: CRD ────────────────────────────────
  const crdLabelIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const crdRevealed = Math.max(0, Math.floor((frame - 10) / 5));

  const crdTerminalIn = spring({
    frame: frame - 55,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const crdKubectlChars = Math.max(0, Math.floor((frame - 65) / 1.2));
  const crdConfirmShow = frame >= 65 + CRD_KUBECTL.length * 1.2;

  // ── Separator ───────────────────────────────────
  const sepShow = interpolate(frame, [88, 105], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Phase 2: CR ─────────────────────────────────
  const crLabelIn = interpolate(frame, [110, 125], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const crRevealStart = 115;
  const crRevealed = Math.max(
    0,
    Math.floor((frame - crRevealStart) / 5),
  );

  const crTerminalIn = spring({
    frame: frame - 175,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const crKubectlChars = Math.max(0, Math.floor((frame - 185) / 1.2));
  const crConfirmShow = frame >= 185 + CR_KUBECTL.length * 1.2;

  // ── Final status ────────────────────────────────
  const finalIn = interpolate(frame, [220, 240], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        color: theme.fg,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* ─────────── CRD section (top) ─────────── */}
      <div
        style={{
          position: "absolute",
          top: 30,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 15,
          color: "#9B59B6",
          fontFamily: theme.mono,
          letterSpacing: 1,
          opacity: crdLabelIn,
        }}
      >
        1. DEFINE THE TYPE (CRD)
      </div>

      <div
        style={{
          position: "absolute",
          top: 60,
          left: "50%",
          transform: "translateX(-50%)",
          width: 580,
          padding: 14,
          border: `2px solid #9B59B6`,
          borderRadius: 10,
          backgroundColor: "#000",
          fontFamily: theme.mono,
          fontSize: 17,
          lineHeight: 1.55,
          opacity: sceneIn,
        }}
      >
        {CRD_LINES.map((line, i) => {
          const visible = i < crdRevealed;
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

      {/* CRD terminal */}
      <Terminal
        top={295}
        width={600}
        scale={crdTerminalIn}
        cmd={CRD_KUBECTL}
        chars={crdKubectlChars}
        confirmShow={crdConfirmShow}
        confirmText="customresourcedefinition.../greetings.example.com created"
      />

      {/* Separator */}
      <div
        style={{
          position: "absolute",
          top: 418,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 22,
          fontWeight: 600,
          color: "#9B59B6",
          opacity: sepShow,
        }}
      >
        ✓ Kubernetes API now knows <span style={{ color: theme.fg }}>Greeting</span>
      </div>

      {/* ─────────── CR section (bottom) ─────────── */}
      <div
        style={{
          position: "absolute",
          top: 470,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 15,
          color: theme.accent,
          fontFamily: theme.mono,
          letterSpacing: 1,
          opacity: crLabelIn,
        }}
      >
        2. CREATE AN INSTANCE (CR)
      </div>

      <div
        style={{
          position: "absolute",
          top: 500,
          left: "50%",
          transform: "translateX(-50%)",
          width: 580,
          padding: 14,
          border: `2px solid ${theme.accent}`,
          borderRadius: 10,
          backgroundColor: "#000",
          fontFamily: theme.mono,
          fontSize: 17,
          lineHeight: 1.55,
          opacity: crLabelIn,
        }}
      >
        {CR_LINES.map((line, i) => {
          const visible = i < crRevealed;
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

      {/* CR terminal */}
      <Terminal
        top={735}
        width={600}
        scale={crTerminalIn}
        cmd={CR_KUBECTL}
        chars={crKubectlChars}
        confirmShow={crConfirmShow}
        confirmText="greeting.example.com/hello-world created"
      />

      {/* Final status */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: finalIn,
        }}
      >
        <div style={{ fontSize: 20, color: theme.muted, fontFamily: theme.mono }}>
          kubectl get greetings
        </div>
        <div
          style={{
            fontSize: 18,
            color: "#5fd97a",
            fontFamily: theme.mono,
            marginTop: 6,
          }}
        >
          ● a first-class resource, just like Deployment
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── YAML content ─────────────────────────────────

const CRD_LINES = [
  { text: "kind: CustomResourceDefinition", color: "#9B59B6" },
  { text: "spec:", color: theme.fg },
  { text: "  group: example.com", color: theme.fg },
  { text: "  names: { kind: Greeting }", color: theme.fg },
  { text: "  schema:", color: theme.fg },
  { text: "    name: string", color: theme.muted },
  { text: "    message: string", color: theme.muted },
];

const CR_LINES = [
  { text: "kind: Greeting", color: theme.accent },
  { text: "metadata:", color: theme.fg },
  { text: "  name: hello-world", color: theme.fg },
  { text: "spec:", color: theme.fg },
  { text: "  name: Håvard", color: theme.fg },
  { text: "  message: Welcome to KubeCon", color: theme.fg },
];

const CRD_KUBECTL = "kubectl apply -f crd.yaml";
const CR_KUBECTL = "kubectl apply -f greeting.yaml";

// ── Terminal subcomponent ────────────────────────

const Terminal: React.FC<{
  top: number;
  width: number;
  scale: number;
  cmd: string;
  chars: number;
  confirmShow: boolean;
  confirmText: string;
}> = ({ top, width, scale, cmd, chars, confirmShow, confirmText }) => (
  <div
    style={{
      position: "absolute",
      top,
      left: "50%",
      transform: `translateX(-50%) scale(${scale})`,
      transformOrigin: "top center",
      width,
      padding: "10px 14px",
      backgroundColor: "#0b0b0b",
      border: `1px solid ${theme.muted}`,
      borderRadius: 8,
      fontFamily: theme.mono,
      fontSize: 15,
      opacity: scale,
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
      <span>
        {cmd.slice(0, Math.min(chars, cmd.length))}
        {chars < cmd.length && (
          <span style={{ opacity: Math.floor(chars) % 2 ? 0.3 : 1 }}>▌</span>
        )}
      </span>
    </div>
    {confirmShow && (
      <div style={{ color: "#5fd97a", marginTop: 5 }}>{confirmText}</div>
    )}
  </div>
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
