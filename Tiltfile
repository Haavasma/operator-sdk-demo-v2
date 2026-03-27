load('ext://restart_process', 'docker_build_with_restart')

allow_k8s_contexts('k3d-slides-demo')
default_registry('localhost:5050')

compile_cmd = 'cd operator/app && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ../../.tilt/out/manager cmd/main.go'

# Build the operator binary locally, rebuild on source changes
local_resource(
    'operator-build',
    compile_cmd,
    deps=['operator/app/cmd', 'operator/app/internal', 'operator/app/api'],
)

# Build image from the .tilt/out/ staging directory and live-sync on rebuilds
docker_build_with_restart(
    'ghcr.io/haavasma/presentation-operator',
    context='.tilt/out/',
    dockerfile_contents='''
FROM alpine:3.21
WORKDIR /app
COPY manager /app/manager
USER 65532:65532
ENTRYPOINT ["/app/manager"]
''',
    entrypoint=['/app/manager'],
    live_update=[
        sync('.tilt/out', '/app'),
    ],
)

# Disable ArgoCD auto-sync for the operator app so Tilt owns the deployment
local(
    'kubectl patch app presentation-operator -n argocd --type merge -p \'{"spec":{"syncPolicy":null}}\' 2>/dev/null || true',
    quiet=True,
)

# Deploy via kustomize
k8s_yaml(kustomize('operator/config'))

k8s_resource('app-controller-manager', resource_deps=['operator-build'])
