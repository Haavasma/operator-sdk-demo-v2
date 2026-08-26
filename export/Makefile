# Offline export of the Presentation CR to .pptx.
#
#   make build           build deck.pptx + deck.pdf + PNG sidecar (one render)
#   make pptx | make pdf aliases for the above (both formats come out together)
#   make stills          re-render the diagram stills (Remotion, minutes)
#   make capture         re-capture the demo screenshots (k3d cluster, minutes)
#   make assets          stills + capture
#   make publish-assets  upload generated assets to the release tag
#   make md              markdown only (fast; no Docker, no assets needed)
#   make verify          go test for the export transformations
#   make validate        mechanical checks on the built pptx/pdf/png
#   make clean           remove export/dist
#
# See docs/adrs/006-presentation-export.md for why the pipeline looks like this.

SHELL := /usr/bin/env bash
ROOT := $(shell cd .. && pwd)
DECK ?= kubernetes-operators-101

.PHONY: build pptx pdf md stills capture assets publish-assets verify validate clean

# One marp invocation per format, but a single markdown render and asset fetch,
# so pptx/pdf/png can never disagree with each other.
build: verify
	./scripts/build.sh
	$(MAKE) validate

pptx pdf: build

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

validate:
	python3 ./scripts/validate.py dist

clean:
	rm -rf dist
