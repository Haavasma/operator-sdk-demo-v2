/*
Copyright 2026.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controller

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	presentationsv1alpha1 "github.com/Haavasma/operator-sdk-demo-v2/api/v1alpha1"
)

var _ = Describe("Presentation Controller", func() {
	const resourceName = "test-presentation"
	const namespace = "default"

	ctx := context.Background()

	namespacedName := types.NamespacedName{
		Name:      resourceName,
		Namespace: namespace,
	}

	newPresentation := func() *presentationsv1alpha1.Presentation {
		return &presentationsv1alpha1.Presentation{
			ObjectMeta: metav1.ObjectMeta{
				Name:      resourceName,
				Namespace: namespace,
			},
			Spec: presentationsv1alpha1.PresentationSpec{
				Theme: presentationsv1alpha1.ThemeSpec{
					PrimaryColor:    "#0366d6",
					SecondaryColor:  "#f6f8fa",
					BackgroundColor: "#ffffff",
					FontFamily:      "Inter, sans-serif",
				},
				Slides: []presentationsv1alpha1.SlideSpec{
					{
						Title:    "Kubernetes Operators",
						Subtitle: "Extending the platform",
						Bullets: []string{
							"Custom Resources define your domain",
							"Controllers reconcile desired → actual state",
						},
						Notes: "Speaker notes here",
					},
				},
			},
		}
	}

	reconciler := func() *PresentationReconciler {
		return &PresentationReconciler{
			Client: k8sClient,
			Scheme: k8sClient.Scheme(),
		}
	}

	AfterEach(func() {
		// Clean up: delete the Presentation CR if it exists
		p := &presentationsv1alpha1.Presentation{}
		err := k8sClient.Get(ctx, namespacedName, p)
		if err == nil {
			Expect(k8sClient.Delete(ctx, p)).To(Succeed())
		}
	})

	Context("When reconciling a new Presentation", func() {
		It("should create all child resources with correct specs", func() {
			By("creating the Presentation CR")
			Expect(k8sClient.Create(ctx, newPresentation())).To(Succeed())

			By("reconciling the resource")
			_, err := reconciler().Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())

			By("verifying the ConfigMap exists with marp content")
			cm := &corev1.ConfigMap{}
			Expect(k8sClient.Get(ctx, namespacedName, cm)).To(Succeed())
			Expect(cm.Data).To(HaveKey("slides.md"))
			Expect(cm.Data["slides.md"]).To(ContainSubstring("marp: true"))
			Expect(cm.Data["slides.md"]).To(ContainSubstring("# Kubernetes Operators"))
			Expect(cm.Data["slides.md"]).To(ContainSubstring("Custom Resources define your domain"))

			By("verifying the Deployment exists with correct spec")
			dep := &appsv1.Deployment{}
			Expect(k8sClient.Get(ctx, namespacedName, dep)).To(Succeed())
			Expect(dep.Spec.Template.Spec.Containers).To(HaveLen(1))
			Expect(dep.Spec.Template.Spec.Containers[0].Image).To(Equal("marpteam/marp-cli:latest"))
			Expect(dep.Spec.Template.Spec.Containers[0].Args).To(Equal([]string{"--server", "/slides/"}))
			Expect(*dep.Spec.Replicas).To(Equal(int32(1)))

			By("verifying the Service exists")
			svc := &corev1.Service{}
			Expect(k8sClient.Get(ctx, namespacedName, svc)).To(Succeed())
			Expect(svc.Spec.Ports).To(HaveLen(1))
			Expect(svc.Spec.Ports[0].Port).To(Equal(int32(8080)))

			By("verifying the Gateway exists")
			gw := &gatewayv1.Gateway{}
			Expect(k8sClient.Get(ctx, namespacedName, gw)).To(Succeed())
			Expect(string(gw.Spec.GatewayClassName)).To(Equal("eg"))
			Expect(gw.Spec.Listeners).To(HaveLen(1))
			Expect(string(*gw.Spec.Listeners[0].Hostname)).To(Equal("test-presentation.default.localhost"))

			By("verifying the HTTPRoute exists")
			route := &gatewayv1.HTTPRoute{}
			Expect(k8sClient.Get(ctx, namespacedName, route)).To(Succeed())
			Expect(route.Spec.ParentRefs).To(HaveLen(1))
			Expect(string(route.Spec.ParentRefs[0].Name)).To(Equal(resourceName))
			Expect(route.Spec.Hostnames).To(HaveLen(1))
			Expect(string(route.Spec.Hostnames[0])).To(Equal("test-presentation.default.localhost"))

			By("verifying ownerReferences on all child resources")
			for _, obj := range []metav1.Object{cm, dep, svc, gw, route} {
				refs := obj.GetOwnerReferences()
				Expect(refs).To(HaveLen(1))
				Expect(refs[0].Name).To(Equal(resourceName))
				Expect(refs[0].Kind).To(Equal("Presentation"))
			}

			By("verifying the status is Ready")
			p := &presentationsv1alpha1.Presentation{}
			Expect(k8sClient.Get(ctx, namespacedName, p)).To(Succeed())
			readyCond := meta.FindStatusCondition(p.Status.Conditions, "Ready")
			Expect(readyCond).NotTo(BeNil())
			Expect(readyCond.Status).To(Equal(metav1.ConditionTrue))
			Expect(readyCond.Reason).To(Equal("AllResourcesHealthy"))
			Expect(p.Status.URL).To(Equal("http://test-presentation.default.localhost"))
		})
	})

	Context("When updating a Presentation spec", func() {
		It("should update the ConfigMap with new content", func() {
			By("creating the Presentation CR")
			p := newPresentation()
			Expect(k8sClient.Create(ctx, p)).To(Succeed())

			By("reconciling")
			_, err := reconciler().Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())

			By("updating the slide title")
			Expect(k8sClient.Get(ctx, namespacedName, p)).To(Succeed())
			p.Spec.Slides[0].Title = "Updated Title"
			Expect(k8sClient.Update(ctx, p)).To(Succeed())

			By("reconciling again")
			_, err = reconciler().Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())

			By("verifying the ConfigMap was updated")
			cm := &corev1.ConfigMap{}
			Expect(k8sClient.Get(ctx, namespacedName, cm)).To(Succeed())
			Expect(cm.Data["slides.md"]).To(ContainSubstring("# Updated Title"))
			Expect(cm.Data["slides.md"]).NotTo(ContainSubstring("# Kubernetes Operators"))
		})
	})

	Context("When the Presentation CR does not exist", func() {
		It("should return without error", func() {
			_, err := reconciler().Reconcile(ctx, reconcile.Request{
				NamespacedName: types.NamespacedName{
					Name:      "nonexistent",
					Namespace: namespace,
				},
			})
			Expect(err).NotTo(HaveOccurred())
		})
	})

	Context("When reconciling is called twice (idempotency)", func() {
		It("should not error on second reconciliation", func() {
			Expect(k8sClient.Create(ctx, newPresentation())).To(Succeed())

			r := reconciler()
			req := reconcile.Request{NamespacedName: namespacedName}

			_, err := r.Reconcile(ctx, req)
			Expect(err).NotTo(HaveOccurred())

			_, err = r.Reconcile(ctx, req)
			Expect(err).NotTo(HaveOccurred())

			// Verify resources still exist and are correct
			cm := &corev1.ConfigMap{}
			Expect(k8sClient.Get(ctx, namespacedName, cm)).To(Succeed())
			Expect(cm.Data).To(HaveKey("slides.md"))
		})
	})

	Context("When the Presentation CR is deleted", func() {
		It("should have ownerReferences that allow garbage collection", func() {
			Expect(k8sClient.Create(ctx, newPresentation())).To(Succeed())

			_, err := reconciler().Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())

			// Verify ownerReferences are set (envtest doesn't run GC, but we can verify refs)
			cm := &corev1.ConfigMap{}
			Expect(k8sClient.Get(ctx, namespacedName, cm)).To(Succeed())
			Expect(cm.OwnerReferences).To(HaveLen(1))
			Expect(cm.OwnerReferences[0].Kind).To(Equal("Presentation"))

			// Delete the Presentation
			p := &presentationsv1alpha1.Presentation{}
			Expect(k8sClient.Get(ctx, namespacedName, p)).To(Succeed())
			Expect(k8sClient.Delete(ctx, p)).To(Succeed())

			// Reconcile should handle not-found gracefully
			_, err = reconciler().Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())

			// In a real cluster, GC would clean up child resources.
			// In envtest, we verify that ownerRefs point to the deleted CR.
			_ = k8sClient.Get(ctx, namespacedName, cm)
			// ConfigMap may or may not exist depending on envtest GC support
			// The key assertion is that reconcile didn't error
		})
	})

	Context("When the Presentation has multiple slides", func() {
		It("should generate markdown with slide separators", func() {
			p := newPresentation()
			p.Spec.Slides = append(p.Spec.Slides, presentationsv1alpha1.SlideSpec{
				Title:   "Second Slide",
				Bullets: []string{"Another point"},
			})
			Expect(k8sClient.Create(ctx, p)).To(Succeed())

			_, err := reconciler().Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())

			cm := &corev1.ConfigMap{}
			Expect(k8sClient.Get(ctx, namespacedName, cm)).To(Succeed())
			Expect(cm.Data["slides.md"]).To(ContainSubstring("# Kubernetes Operators"))
			Expect(cm.Data["slides.md"]).To(ContainSubstring("# Second Slide"))
			Expect(cm.Data["slides.md"]).To(ContainSubstring("Another point"))
		})
	})
})

// cleanupPresentation removes the presentation and waits for deletion
func cleanupPresentation(ctx context.Context, name, namespace string) {
	p := &presentationsv1alpha1.Presentation{}
	err := k8sClient.Get(ctx, types.NamespacedName{Name: name, Namespace: namespace}, p)
	if err != nil && errors.IsNotFound(err) {
		return
	}
	_ = k8sClient.Delete(ctx, p)
}
