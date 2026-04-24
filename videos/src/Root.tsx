import { Composition } from "remotion";
import { squareFormat, videoFormat } from "./theme";
import { ProblemToil } from "./problem-toil/Composition";
import { K8sReconcile } from "./k8s-reconcile/Composition";
import { GitopsSync } from "./gitops-sync/Composition";
import { CrdAbstraction } from "./crd-abstraction/Composition";
import { OperatorPresentation } from "./operator-presentation/Composition";
import { OperatorExposedApp } from "./operator-exposedapp/Composition";

export const Root: React.FC = () => {
  return (
    <>
      {/* split layouts — 1:1 square fills the right half of the slide */}
      <Composition
        id="problem-toil"
        component={ProblemToil}
        durationInFrames={8 * squareFormat.fps}
        fps={squareFormat.fps}
        width={squareFormat.width}
        height={squareFormat.height}
      />
      <Composition
        id="k8s-reconcile"
        component={K8sReconcile}
        durationInFrames={8 * squareFormat.fps}
        fps={squareFormat.fps}
        width={squareFormat.width}
        height={squareFormat.height}
      />
      <Composition
        id="gitops-sync"
        component={GitopsSync}
        durationInFrames={8 * squareFormat.fps}
        fps={squareFormat.fps}
        width={squareFormat.width}
        height={squareFormat.height}
      />
      <Composition
        id="crd-abstraction"
        component={CrdAbstraction}
        durationInFrames={9 * squareFormat.fps}
        fps={squareFormat.fps}
        width={squareFormat.width}
        height={squareFormat.height}
      />
      <Composition
        id="operator-presentation"
        component={OperatorPresentation}
        durationInFrames={10 * squareFormat.fps}
        fps={squareFormat.fps}
        width={squareFormat.width}
        height={squareFormat.height}
      />
      {/* hero layouts — 16:9 full slide */}
      <Composition
        id="operator-exposedapp"
        component={OperatorExposedApp}
        durationInFrames={13 * videoFormat.fps}
        fps={videoFormat.fps}
        width={videoFormat.width}
        height={videoFormat.height}
      />
    </>
  );
};
