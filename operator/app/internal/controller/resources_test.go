package controller

import (
	"testing"

	v1alpha1 "github.com/Haavasma/operator-sdk-demo-v2/api/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func newTestPresentation() *v1alpha1.Presentation {
	return &v1alpha1.Presentation{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "my-talk",
			Namespace: "demos",
		},
		Spec: v1alpha1.PresentationSpec{
			Theme: v1alpha1.ThemeSpec{
				PrimaryColor:    "#0366d6",
				SecondaryColor:  "#f6f8fa",
				BackgroundColor: "#ffffff",
				FontFamily:      "Inter, sans-serif",
			},
			Slides: []v1alpha1.SlideSpec{
				{Title: "Hello", Bullets: []string{"World"}},
			},
		},
	}
}

func TestBuildConfigMap(t *testing.T) {
	p := newTestPresentation()
	marpContent := "# Hello\n- World"

	cm := buildConfigMap(p, marpContent)

	if cm.Name != "my-talk" {
		t.Errorf("expected name my-talk, got %s", cm.Name)
	}
	if cm.Namespace != "demos" {
		t.Errorf("expected namespace demos, got %s", cm.Namespace)
	}
	if cm.Data["slides.md"] != marpContent {
		t.Errorf("expected slides.md to contain marp content, got %s", cm.Data["slides.md"])
	}
	if cm.Labels["app.kubernetes.io/managed-by"] != "presentation-operator" {
		t.Errorf("expected managed-by label, got %v", cm.Labels)
	}
	if cm.Labels["app.kubernetes.io/name"] != "my-talk" {
		t.Errorf("expected name label, got %v", cm.Labels)
	}
}

func TestBuildDeployment(t *testing.T) {
	p := newTestPresentation()

	dep := buildDeployment(p)

	if dep.Name != "my-talk" {
		t.Errorf("expected name my-talk, got %s", dep.Name)
	}
	if dep.Namespace != "demos" {
		t.Errorf("expected namespace demos, got %s", dep.Namespace)
	}
	if *dep.Spec.Replicas != int32(1) {
		t.Errorf("expected 1 replica, got %d", *dep.Spec.Replicas)
	}

	containers := dep.Spec.Template.Spec.Containers
	if len(containers) != 1 {
		t.Fatalf("expected 1 container, got %d", len(containers))
	}
	c := containers[0]
	if c.Image != "marpteam/marp-cli:latest" {
		t.Errorf("expected marpteam/marp-cli:latest image, got %s", c.Image)
	}
	if len(c.Args) < 2 || c.Args[0] != "--server" || c.Args[1] != "/slides/" {
		t.Errorf("expected args [--server /slides/], got %v", c.Args)
	}
	if c.Ports[0].ContainerPort != 8080 {
		t.Errorf("expected port 8080, got %d", c.Ports[0].ContainerPort)
	}

	// Check volume mount
	if len(c.VolumeMounts) != 1 || c.VolumeMounts[0].MountPath != "/slides" {
		t.Errorf("expected volume mount at /slides, got %v", c.VolumeMounts)
	}

	// Check volume references the configmap
	vols := dep.Spec.Template.Spec.Volumes
	if len(vols) != 1 || vols[0].ConfigMap.Name != "my-talk" {
		t.Errorf("expected volume from configmap my-talk, got %v", vols)
	}
}

func TestBuildService(t *testing.T) {
	p := newTestPresentation()

	svc := buildService(p)

	if svc.Name != "my-talk" {
		t.Errorf("expected name my-talk, got %s", svc.Name)
	}
	if svc.Namespace != "demos" {
		t.Errorf("expected namespace demos, got %s", svc.Namespace)
	}
	if len(svc.Spec.Ports) != 1 || svc.Spec.Ports[0].Port != 8080 {
		t.Errorf("expected port 8080, got %v", svc.Spec.Ports)
	}
	if svc.Spec.Selector["app.kubernetes.io/name"] != "my-talk" {
		t.Errorf("expected selector to match name label, got %v", svc.Spec.Selector)
	}
}

func TestBuildGateway(t *testing.T) {
	p := newTestPresentation()

	gw := buildGateway(p)

	if gw.Name != "my-talk" {
		t.Errorf("expected name my-talk, got %s", gw.Name)
	}
	if gw.Namespace != "demos" {
		t.Errorf("expected namespace demos, got %s", gw.Namespace)
	}
	if string(gw.Spec.GatewayClassName) != "eg" {
		t.Errorf("expected gatewayClassName eg, got %s", gw.Spec.GatewayClassName)
	}
	if len(gw.Spec.Listeners) != 1 {
		t.Fatalf("expected 1 listener, got %d", len(gw.Spec.Listeners))
	}
	l := gw.Spec.Listeners[0]
	if string(l.Name) != "http" {
		t.Errorf("expected listener name http, got %s", l.Name)
	}
	if l.Port != 80 {
		t.Errorf("expected port 80, got %d", l.Port)
	}
	if string(l.Protocol) != "HTTP" {
		t.Errorf("expected protocol HTTP, got %s", l.Protocol)
	}
	expectedHostname := "my-talk.demos.localhost"
	if l.Hostname == nil || string(*l.Hostname) != expectedHostname {
		t.Errorf("expected hostname %s, got %v", expectedHostname, l.Hostname)
	}
}

func TestBuildHTTPRoute(t *testing.T) {
	p := newTestPresentation()

	route := buildHTTPRoute(p)

	if route.Name != "my-talk" {
		t.Errorf("expected name my-talk, got %s", route.Name)
	}
	if route.Namespace != "demos" {
		t.Errorf("expected namespace demos, got %s", route.Namespace)
	}
	if len(route.Spec.ParentRefs) != 1 {
		t.Fatalf("expected 1 parentRef, got %d", len(route.Spec.ParentRefs))
	}
	if string(route.Spec.ParentRefs[0].Name) != "my-talk" {
		t.Errorf("expected parentRef name my-talk, got %s", route.Spec.ParentRefs[0].Name)
	}

	expectedHostname := "my-talk.demos.localhost"
	if len(route.Spec.Hostnames) != 1 || string(route.Spec.Hostnames[0]) != expectedHostname {
		t.Errorf("expected hostname %s, got %v", expectedHostname, route.Spec.Hostnames)
	}

	if len(route.Spec.Rules) != 1 {
		t.Fatalf("expected 1 rule, got %d", len(route.Spec.Rules))
	}
	backends := route.Spec.Rules[0].BackendRefs
	if len(backends) != 1 {
		t.Fatalf("expected 1 backendRef, got %d", len(backends))
	}
	if string(backends[0].Name) != "my-talk" {
		t.Errorf("expected backendRef name my-talk, got %s", backends[0].Name)
	}
	if *backends[0].Port != 8080 {
		t.Errorf("expected backendRef port 8080, got %d", *backends[0].Port)
	}
}
