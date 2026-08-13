# Offline export of the Presentation CR to .pptx.
#
#   make pptx            build export/dist/deck.pptx (fetches missing assets)
#   make stills          re-render the diagram stills (Remotion, minutes)
#   make capture         re-capture the demo screenshots (k3d cluster, minutes)
#   make assets          stills + capture
#   make publish-assets  upload generated assets to the release tag
#   make md              markdown only (fast; no Docker, no assets needed)
#   make verify          go test for the export transformations
#   make clean           remove export/dist
#
# See docs/adrs/006-presentation-export.md for why the pipeline looks like this.

SHELL := /usr/bin/env bash
ROOT := $(shell cd .. && pwd)
DECK ?= kubernetes-operators-101

.PHONY: pptx md stills capture assets publish-assets verify clean

pptx: verify
	./scripts/build.sh

md:
	cd $(ROOT)/operator/app && go run ./cmd/marpgen \
		-presentation $(ROOT)/presentations/$(DECK).yaml \
		-overlay $(ROOT)/export/overlay.yaml \
		-o $(ROOT)/export/dist/deck.md

stills:
	cd $(ROOT)/videos && npm install --no-audit --no-fund && npm run still:all

capture:
	npm install --no-audit --no-fund
	./scripts/capture.sh

assets: stills capture

publish-assets:
	./scripts/publish-assets.sh

verify:
	cd $(ROOT)/operator/app && go test ./internal/export/ ./internal/controller/

clean:
	rm -rf dist
