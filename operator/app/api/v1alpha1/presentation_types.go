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

package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ThemeSpec defines the visual theme for the presentation.
type ThemeSpec struct {
	// +kubebuilder:validation:Required
	PrimaryColor string `json:"primaryColor"`

	// +kubebuilder:validation:Required
	SecondaryColor string `json:"secondaryColor"`

	// +kubebuilder:validation:Required
	BackgroundColor string `json:"backgroundColor"`

	// +kubebuilder:validation:Required
	FontFamily string `json:"fontFamily"`

	// +optional
	Logo string `json:"logo,omitempty"`
}

// ImageSpec defines an image to display on a slide.
type ImageSpec struct {
	// +kubebuilder:validation:Required
	URL string `json:"url"`

	// +optional
	Alt string `json:"alt,omitempty"`
}

// SlideSpec defines a single slide in the presentation.
type SlideSpec struct {
	// +kubebuilder:validation:Required
	Title string `json:"title"`

	// +optional
	Subtitle string `json:"subtitle,omitempty"`

	// +optional
	Bullets []string `json:"bullets,omitempty"`

	// +optional
	Images []ImageSpec `json:"images,omitempty"`

	// +optional
	Notes string `json:"notes,omitempty"`

	// +optional
	// +kubebuilder:default="default"
	Layout string `json:"layout,omitempty"`
}

// PresentationSpec defines the desired state of Presentation.
type PresentationSpec struct {
	// +kubebuilder:validation:Required
	Theme ThemeSpec `json:"theme"`

	// +kubebuilder:validation:Required
	// +kubebuilder:validation:MinItems=1
	Slides []SlideSpec `json:"slides"`
}

// PresentationStatus defines the observed state of Presentation.
type PresentationStatus struct {
	// +optional
	Conditions []metav1.Condition `json:"conditions,omitempty"`

	// +optional
	URL string `json:"url,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Ready",type="string",JSONPath=".status.conditions[?(@.type=='Ready')].status"
// +kubebuilder:printcolumn:name="URL",type="string",JSONPath=".status.url"
// +kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"

// Presentation is the Schema for the presentations API.
type Presentation struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PresentationSpec   `json:"spec,omitempty"`
	Status PresentationStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// PresentationList contains a list of Presentation.
type PresentationList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Presentation `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Presentation{}, &PresentationList{})
}
