load('ext://restart_process', 'docker_build_with_restart')

# Build the operator binary locally for fast rebuilds
local_resource(
    'operator-build',
    'cd operator/app && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/manager cmd/main.go',
    deps=['operator/app/cmd', 'operator/app/internal', 'operator/app/api'],
)

# Build a minimal Docker image using the pre-built binary
docker_build_with_restart(
    'ghcr.io/haavasma/presentation-operator',
    context='operator/app',
    dockerfile_contents='''
FROM gcr.io/distroless/static:nonroot
WORKDIR /
COPY bin/manager /manager
USER 65532:65532
ENTRYPOINT ["/manager"]
''',
    only=['bin/manager'],
    entrypoint=['/manager'],
    live_update=[
        sync('operator/app/bin/manager', '/manager'),
    ],
)

# Deploy via kustomize
k8s_yaml(kustomize('operator/config'))

# Also deploy CRDs from the operator scaffolding
k8s_yaml(kustomize('operator/app/config/crd'))
