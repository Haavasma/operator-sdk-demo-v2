package controller

import (
	"fmt"

	v1alpha1 "github.com/Haavasma/operator-sdk-demo-v2/api/v1alpha1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/utils/ptr"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

func labels(name string) map[string]string {
	return map[string]string{
		"app.kubernetes.io/name":       name,
		"app.kubernetes.io/managed-by": "presentation-operator",
		"app.kubernetes.io/part-of":    name,
	}
}

func hostname(p *v1alpha1.Presentation) string {
	return fmt.Sprintf("%s.%s.localhost", p.Name, p.Namespace)
}

func buildConfigMap(p *v1alpha1.Presentation, marpContent string) *corev1.ConfigMap {
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      p.Name,
			Namespace: p.Namespace,
			Labels:    labels(p.Name),
		},
		Data: map[string]string{
			"slides.md": marpContent,
		},
	}
}

func buildDeployment(p *v1alpha1.Presentation) *appsv1.Deployment {
	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      p.Name,
			Namespace: p.Namespace,
			Labels:    labels(p.Name),
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: ptr.To(int32(1)),
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app.kubernetes.io/name": p.Name,
				},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: labels(p.Name),
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "marp-server",
							Image: "marpteam/marp-cli:latest",
							Args:  []string{"--server", "/slides/"},
							Ports: []corev1.ContainerPort{
								{
									Name:          "http",
									ContainerPort: 8080,
									Protocol:      corev1.ProtocolTCP,
								},
							},
							VolumeMounts: []corev1.VolumeMount{
								{
									Name:      "slides",
									MountPath: "/slides",
									ReadOnly:  true,
								},
							},
							LivenessProbe: &corev1.Probe{
								ProbeHandler: corev1.ProbeHandler{
									HTTPGet: &corev1.HTTPGetAction{
										Path: "/",
										Port: intstr.FromInt32(8080),
									},
								},
								InitialDelaySeconds: 5,
								PeriodSeconds:       10,
							},
							ReadinessProbe: &corev1.Probe{
								ProbeHandler: corev1.ProbeHandler{
									HTTPGet: &corev1.HTTPGetAction{
										Path: "/",
										Port: intstr.FromInt32(8080),
									},
								},
								InitialDelaySeconds: 3,
								PeriodSeconds:       5,
							},
						},
					},
					Volumes: []corev1.Volume{
						{
							Name: "slides",
							VolumeSource: corev1.VolumeSource{
								ConfigMap: &corev1.ConfigMapVolumeSource{
									LocalObjectReference: corev1.LocalObjectReference{
										Name: p.Name,
									},
								},
							},
						},
					},
				},
			},
		},
	}
}

func buildService(p *v1alpha1.Presentation) *corev1.Service {
	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      p.Name,
			Namespace: p.Namespace,
			Labels:    labels(p.Name),
		},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{
				"app.kubernetes.io/name": p.Name,
			},
			Ports: []corev1.ServicePort{
				{
					Name:       "http",
					Port:       8080,
					TargetPort: intstr.FromInt32(8080),
					Protocol:   corev1.ProtocolTCP,
				},
			},
		},
	}
}

func buildGateway(p *v1alpha1.Presentation) *gatewayv1.Gateway {
	h := gatewayv1.Hostname(hostname(p))
	return &gatewayv1.Gateway{
		ObjectMeta: metav1.ObjectMeta{
			Name:      p.Name,
			Namespace: p.Namespace,
			Labels:    labels(p.Name),
		},
		Spec: gatewayv1.GatewaySpec{
			GatewayClassName: "eg",
			Listeners: []gatewayv1.Listener{
				{
					Name:     "http",
					Protocol: gatewayv1.HTTPProtocolType,
					Port:     80,
					Hostname: &h,
				},
			},
		},
	}
}

func buildHTTPRoute(p *v1alpha1.Presentation) *gatewayv1.HTTPRoute {
	port := gatewayv1.PortNumber(8080)
	return &gatewayv1.HTTPRoute{
		ObjectMeta: metav1.ObjectMeta{
			Name:      p.Name,
			Namespace: p.Namespace,
			Labels:    labels(p.Name),
		},
		Spec: gatewayv1.HTTPRouteSpec{
			CommonRouteSpec: gatewayv1.CommonRouteSpec{
				ParentRefs: []gatewayv1.ParentReference{
					{
						Name:      gatewayv1.ObjectName(p.Name),
						Namespace: (*gatewayv1.Namespace)(&p.Namespace),
					},
				},
			},
			Hostnames: []gatewayv1.Hostname{
				gatewayv1.Hostname(hostname(p)),
			},
			Rules: []gatewayv1.HTTPRouteRule{
				{
					BackendRefs: []gatewayv1.HTTPBackendRef{
						{
							BackendRef: gatewayv1.BackendRef{
								BackendObjectReference: gatewayv1.BackendObjectReference{
									Name: gatewayv1.ObjectName(p.Name),
									Port: &port,
								},
							},
						},
					},
				},
			},
		},
	}
}
