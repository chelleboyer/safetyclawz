# Appendix: OpenClaw Documentation References

These pages are the primary public references used to align SafetyClawz docs with OpenClaw behavior and terminology.

## Security

- https://docs.openclaw.ai/gateway/security
  - Security audit CLI (`openclaw security audit`), allowlists, DM policies, session isolation, incident response.

## Tools

- https://docs.openclaw.ai/tools
  - Tool policy surface (`tools.allow`, `tools.deny`, `tools.profile`, `tools.byProvider`, tool groups).
  - Tool inventory and parameters (`exec`, `process`, `browser`, `gateway`, `bash`, `read`, `write`, `edit`, etc.).

## Elevated Mode

- https://docs.openclaw.ai/tools/elevated
  - Elevated execution behavior, allowlists, and approval interactions.

## Plugins

- https://docs.openclaw.ai/tools/plugin
  - Plugin install rules, load order, allow/deny lists, and safety notes.

## Related

- https://docs.openclaw.ai/gateway/configuration
  - Gateway and channel settings referenced by allowlist and policy discussions.
- https://docs.openclaw.ai/channels/pairing
  - Pairing and allowlist storage for inbound DM policies.
- https://docs.openclaw.ai/channels/groups
  - Group allowlist and mention-gating behavior.
