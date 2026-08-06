# EdgePilot TODOs

This TODO file tracks the edge-AI roadmap for the project. It captures completed work, current priorities, and remaining gaps for an edge-ready runtime.

## 1. Local tiny on-device model support

- [x] Add a local model provider abstraction to support multiple edge runtimes.
- [x] Implement a local provider integration for edge devices.
- [ ] Implement a tiny on-device provider for low-memory models.
- [ ] Support quantized and compact model formats appropriate for 4GB RAM devices.
- [ ] Add model selection logic that targets devices with ~1.7GB free memory.
- [ ] Provide fallback behavior when local model memory is insufficient.

## 2. Offline-first and hybrid compute logic

- [ ] Add network/connectivity detection and a local-first runtime policy.
- [ ] Implement hybrid planning logic that chooses between local and remote compute.
- [ ] Add support for queueing and resuming tasks while offline.
- [ ] Build a fallback strategy for remote Ollama use only when connectivity is available.

## 3. Resource and performance management

- [ ] Add device capability detection (CPU, RAM, GPU/NPU availability).
- [ ] Implement execution scheduling and throttling for low-power devices.
- [ ] Add time and memory budget awareness to workflows.
- [ ] Track runtime performance and avoid heavy tasks on constrained hardware.

## 4. Edge security and sandboxing

- [ ] Add stronger plugin isolation or sandboxing for third-party plugins.
- [ ] Implement fine-grained capability enforcement, not just plugin-level permissions.
- [ ] Add a local-only privacy mode for edge deployments.
- [ ] Harden runtime execution against untrusted plugin code.

## 5. Persistent edge memory and local state

- [ ] Replace or extend in-memory storage with durable local storage.
- [ ] Add file-backed or SQLite-backed memory persistence.
- [ ] Support snapshots, restore, and state recovery across device restarts.
- [ ] Add local semantic memory storage for edge agent sessions.

## 6. Edge-aware workflow capabilities

- [ ] Add adaptive workflow generation based on device capability and connectivity.
- [ ] Support conditional tool selection for edge vs cloud execution.
- [ ] Add event-driven workflows for sensors, triggers, and local device events.
- [ ] Improve workflow compiler to optimize for edge execution.

## 7. Edge plugins and device integration

- [ ] Add device-specific plugins for edge environments:
  - [ ] filesystem and storage
  - [ ] device metadata and hardware info
  - [ ] sensors, camera, microphone, GPS
  - [ ] local network discovery and connectivity checks
- [ ] Build plugin abstractions for cross-platform edge APIs.

## 8. Packaging and deployment for edge devices

- [ ] Add support for lightweight ARM and mobile deployment targets.
- [ ] Define a packaging approach for Android/Linux/ARM.
- [ ] Add a small runtime distribution or container for edge use.
- [ ] Provide deployment scripts and documentation for edge devices.

## 9. Observability and edge diagnostics

- [ ] Add execution metrics and runtime telemetry.
- [ ] Add structured logging for workflow and plugin execution.
- [ ] Build offline logging and diagnostic replay support.
- [ ] Add health checks for local model provider, workflow engine, and plugins.

## 10. Edge-focused documentation and examples

- [ ] Add edge-specific documentation explaining local model setup.
- [ ] Create examples for tiny-device usage and low-memory deployment.
- [ ] Add onboarding instructions for Tailscale/Ollama remote device access.
- [ ] Document the edge runtime architecture and how to extend it.

## 11. Tablet-specific constraint

- [x] The target tablet has only 4GB total memory and ~1.7GB free.
- [ ] Prioritize lightweight models, compact runtimes, and strict resource limits.
- [ ] Ensure the planner and runtime avoid operations that exceed the device's memory and CPU capacity.
- [ ] Validate the implementation with a tiny on-device model execution path.

---

## Current status

- Completed: local provider wiring, compile support, and core provider manager integration.
- Next priority: local tiny-model execution path, hybrid offline/remote planning, and memory-aware scheduling.
- Validation step: test local provider behavior on the tablet and add remote Ollama fallback only when connectivity is available.
