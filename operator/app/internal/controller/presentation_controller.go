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
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"

	presentationsv1alpha1 "github.com/Haavasma/operator-sdk-demo-v2/api/v1alpha1"
)

// PresentationReconciler reconciles a Presentation object
type PresentationReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=presentations.haavard.dev,resources=presentations,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=presentations.haavard.dev,resources=presentations/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=presentations.haavard.dev,resources=presentations/finalizers,verbs=update
// +kubebuilder:rbac:groups="",resources=configmaps,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=services,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=gateway.networking.k8s.io,resources=gateways,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=gateway.networking.k8s.io,resources=httproutes,verbs=get;list;watch;create;update;patch;delete

// Reconcile ensures that the child resources for a Presentation CR match the desired state.
func (r *PresentationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := logf.FromContext(ctx)

	// Fetch the Presentation CR
	var presentation presentationsv1alpha1.Presentation
	if err := r.Get(ctx, req.NamespacedName, &presentation); err != nil {
		if errors.IsNotFound(err) {
			log.Info("Presentation resource not found, likely deleted")
			return ctrl.Result{}, nil
		}
		return ctrl.Result{}, fmt.Errorf("failed to get Presentation: %w", err)
	}

	// Generate Marp markdown
	marpContent, err := GenerateMarpMarkdown(presentation.Spec)
	if err != nil {
		meta.SetStatusCondition(&presentation.Status.Conditions, metav1.Condition{
			Type:               "Ready",
			Status:             metav1.ConditionFalse,
			Reason:             "MarpGenerationFailed",
			Message:            err.Error(),
			ObservedGeneration: presentation.Generation,
		})
		if statusErr := r.Status().Update(ctx, &presentation); statusErr != nil {
			log.Error(statusErr, "failed to update status after marp generation failure")
		}
		return ctrl.Result{}, fmt.Errorf("failed to generate marp markdown: %w", err)
	}

	// Reconcile ConfigMap
	cm := &corev1.ConfigMap{}
	cm.Name = presentation.Name
	cm.Namespace = presentation.Namespace
	op, err := controllerutil.CreateOrUpdate(ctx, r.Client, cm, func() error {
		desired := buildConfigMap(&presentation, marpContent)
		cm.Data = desired.Data
		cm.Labels = desired.Labels
		return controllerutil.SetControllerReference(&presentation, cm, r.Scheme)
	})
	if err != nil {
		return r.setFailedCondition(ctx, &presentation, "ConfigMapFailed", err)
	}
	log.Info("Reconciled ConfigMap", "operation", op)

	// Reconcile Deployment
	dep := &appsv1.Deployment{}
	dep.Name = presentation.Name
	dep.Namespace = presentation.Namespace
	op, err = controllerutil.CreateOrUpdate(ctx, r.Client, dep, func() error {
		desired := buildDeployment(&presentation)
		dep.Spec = desired.Spec
		dep.Labels = desired.Labels
		return controllerutil.SetControllerReference(&presentation, dep, r.Scheme)
	})
	if err != nil {
		return r.setFailedCondition(ctx, &presentation, "DeploymentFailed", err)
	}
	log.Info("Reconciled Deployment", "operation", op)

	// Reconcile Service
	svc := &corev1.Service{}
	svc.Name = presentation.Name
	svc.Namespace = presentation.Namespace
	op, err = controllerutil.CreateOrUpdate(ctx, r.Client, svc, func() error {
		desired := buildService(&presentation)
		svc.Spec.Selector = desired.Spec.Selector
		svc.Spec.Ports = desired.Spec.Ports
		svc.Labels = desired.Labels
		return controllerutil.SetControllerReference(&presentation, svc, r.Scheme)
	})
	if err != nil {
		return r.setFailedCondition(ctx, &presentation, "ServiceFailed", err)
	}
	log.Info("Reconciled Service", "operation", op)

	// Reconcile Gateway
	gw := &gatewayv1.Gateway{}
	gw.Name = presentation.Name
	gw.Namespace = presentation.Namespace
	op, err = controllerutil.CreateOrUpdate(ctx, r.Client, gw, func() error {
		desired := buildGateway(&presentation)
		gw.Spec = desired.Spec
		gw.Labels = desired.Labels
		return controllerutil.SetControllerReference(&presentation, gw, r.Scheme)
	})
	if err != nil {
		return r.setFailedCondition(ctx, &presentation, "GatewayFailed", err)
	}
	log.Info("Reconciled Gateway", "operation", op)

	// Reconcile HTTPRoute
	route := &gatewayv1.HTTPRoute{}
	route.Name = presentation.Name
	route.Namespace = presentation.Namespace
	op, err = controllerutil.CreateOrUpdate(ctx, r.Client, route, func() error {
		desired := buildHTTPRoute(&presentation)
		route.Spec = desired.Spec
		route.Labels = desired.Labels
		return controllerutil.SetControllerReference(&presentation, route, r.Scheme)
	})
	if err != nil {
		return r.setFailedCondition(ctx, &presentation, "HTTPRouteFailed", err)
	}
	log.Info("Reconciled HTTPRoute", "operation", op)

	// Update status: Ready
	presentation.Status.URL = fmt.Sprintf("http://%s", hostname(&presentation))
	meta.SetStatusCondition(&presentation.Status.Conditions, metav1.Condition{
		Type:               "Ready",
		Status:             metav1.ConditionTrue,
		Reason:             "AllResourcesHealthy",
		Message:            "All child resources reconciled successfully",
		ObservedGeneration: presentation.Generation,
	})
	if err := r.Status().Update(ctx, &presentation); err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to update status: %w", err)
	}

	return ctrl.Result{}, nil
}

func (r *PresentationReconciler) setFailedCondition(
	ctx context.Context,
	p *presentationsv1alpha1.Presentation,
	reason string,
	err error,
) (ctrl.Result, error) {
	log := logf.FromContext(ctx)
	meta.SetStatusCondition(&p.Status.Conditions, metav1.Condition{
		Type:               "Ready",
		Status:             metav1.ConditionFalse,
		Reason:             reason,
		Message:            err.Error(),
		ObservedGeneration: p.Generation,
	})
	if statusErr := r.Status().Update(ctx, p); statusErr != nil {
		log.Error(statusErr, "failed to update status after error")
	}
	return ctrl.Result{}, fmt.Errorf("%s: %w", reason, err)
}

// SetupWithManager sets up the controller with the Manager.
func (r *PresentationReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&presentationsv1alpha1.Presentation{}).
		Owns(&corev1.ConfigMap{}).
		Owns(&appsv1.Deployment{}).
		Owns(&corev1.Service{}).
		Owns(&gatewayv1.Gateway{}).
		Owns(&gatewayv1.HTTPRoute{}).
		Named("presentation").
		Complete(r)
}
