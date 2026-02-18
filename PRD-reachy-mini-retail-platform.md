🎭📋 **High-Level Concept PRD**
**Product:** Reachy Retail Cognitive Platform (RRCP)
**Positioning:** Open Spatial Intelligence OS for Physical Retail

---

# 1. Executive Summary

Reachy Retail Cognitive Platform (RRCP) is an open, modular, spatially-aware operating system designed to transform physical retail environments into intelligent, interactive, and scalable digital ecosystems.

RRCP unifies:

* A navigable digital store twin (Planolyzer)
* Conversational AI retail assistance (Reachy Mini Retail Assistant)
* Cognitive memory infrastructure (Reachy Mini Second Brain)
* Behavioral & safety monitoring (Safety Clawz)

The platform is architected from day one as a **multi-store, hybrid edge + cloud system**, enabling enterprise-scale deployment while maintaining in-store resilience.

The open-source release of the spatial core establishes RRCP as the foundational infrastructure layer for AI-enabled retail.

---

# 2. Vision

To create the **Spatial Intelligence Layer for Physical Retail** — a distributed system where every store has a digital twin that anchors customer interaction, operational visibility, and future AI-driven optimization.

RRCP positions Planolyzer not as a tool, but as the spatial operating system through which all retail intelligence flows.

---

# 3. Product Philosophy

RRCP is built on four principles:

1. Spatial First — Every interaction is anchored to physical space.
2. Modular Intelligence — Capabilities plug into the spatial layer.
3. Multi-Store by Design — Enterprise scalability from inception.
4. Open Core — The spatial engine is publicly available to drive ecosystem growth and enterprise trust.

---

# 4. Platform Components & Existing POCs

## 4.1 Planolyzer – Spatial Twin Engine (Core OS)

**Existing POCs:**

* Hugging Face Space: [https://huggingface.co/spaces/chelleboyer/planolyzer](https://huggingface.co/spaces/chelleboyer/planolyzer)

Concept:

* Interactive wireframe store twin
* Zoom into aisles and shelves
* Drill into specific SKU dashboards
* Visual spatial navigation
* Foundation for customer-facing map display

Role in Platform:

* Authoritative store layout model
* SKU-to-shelf mapping engine
* Customer navigation interface
* Future analytics overlay surface

Planolyzer is the spatial control layer for RRCP.

---

## 4.2 Reachy Mini Retail Assistant – Conversational Interface

**Existing POCs:**

* GitHub: [https://github.com/chelleboyer/reachy_mini_retail_assistant](https://github.com/chelleboyer/reachy_mini_retail_assistant)
* Hugging Face: [https://huggingface.co/spaces/chelleboyer/reachy_mini_retail_assistant](https://huggingface.co/spaces/chelleboyer/reachy_mini_retail_assistant)
* Karen Whisperer variant:

  * GitHub: [https://github.com/chelleboyer/reachy_mini_karen_whisperer](https://github.com/chelleboyer/reachy_mini_karen_whisperer)
  * Hugging Face: [https://huggingface.co/spaces/chelleboyer/reachy_mini_karen_whisperer](https://huggingface.co/spaces/chelleboyer/reachy_mini_karen_whisperer)

Capabilities:

* Voice-based product lookup
* NLP-driven query interpretation
* Retail interaction mediation
* Escalation handling behaviors

Role in Platform:

* Conversational gateway to Planolyzer
* Customer navigation trigger
* Behavioral signal source for Safety Clawz
* Interaction anchor for Second Brain memory

Reachy is an interface — not the core system.

---

## 4.3 Reachy Mini Second Brain – Cognitive Layer

Concept:

* Persistent contextual memory
* Store-level knowledge graph
* Interaction recall
* Longitudinal learning

Role in Platform (Phase 2+):

* Attach contextual memory to spatial nodes
* Store event history per zone/shelf
* Enable store intelligence evolution over time
* Anchor insights to physical space

---

## 4.4 Safety Clawz – Risk & Compliance Layer

**Existing POC:**

* GitHub: [https://github.com/chelleboyer/safetyclawz](https://github.com/chelleboyer/safetyclawz)

Capabilities:

* Behavioral detection logic
* Escalation patterns
* Risk flagging

Role in Platform:

* Spatially anchored alert overlays
* Customer interaction risk signals
* Staff escalation triggers
* Multi-store compliance visibility (enterprise tier)

---

# 5. MVP Definition

## MVP Scope

The MVP establishes the spatial foundation and customer navigation use case.

Included:

* Static digital twin per store
* SKU-to-shelf mapping
* Multi-store architecture support
* Hybrid edge + cloud deployment
* Voice-based SKU lookup via Reachy
* Zoom-to-shelf highlighting for customers
* Public open-source spatial core

Excluded (Future Phases):

* Real-time POS integration
* Predictive layout modeling
* Behavioral heatmaps
* Advanced analytics overlays
* Enterprise orchestration dashboards

---

# 6. User Personas

## Target Environment: Retail Truck Stop
*(e.g. Pilot Flying J, Love's Travel Stops, TravelCenters of America)*

Large-format, 24/7, high-SKU-density stores (3,000–8,000 SKUs) serving transient customers. Chronically understaffed — often 1–2 associates covering 10,000+ sq ft per shift. Edge-first connectivity is mandatory due to unreliable store-floor WiFi. SKU churn is high (seasonal items, fuel additives, pricing volatility). This environment makes RRCP a **force multiplier**, not a luxury.

---

## 6.1 Persona — "Big Rig Bobby" *(Primary: Transactional Customer)*

| Attribute | Detail |
|---|---|
| **Who** | Professional long-haul truck driver, 40s–50s |
| **Context** | 30-minute break window, needs specific items fast: DEF fluid, specific coffee brand, rig supplies |
| **Emotional State** | Tired, purposeful, zero patience for wandering |
| **Tech Comfort** | Moderate — uses GPS and ELD devices, won't read instructions |
| **Interaction Mode** | Voice: "Where's the DEF?" → Reachy responds with aisle + visual map highlight |
| **Pain Point** | Store layouts change between visits; wastes precious break time searching |
| **Success Metric** | Product located in <30 seconds from approach |

**Reachy Mode:** Fast wayfinding. Minimal words. Clear visual direction.

---

## 6.2 Persona — "Road Trip Rachel" *(Primary: Exploratory Customer)*

| Attribute | Detail |
|---|---|
| **Who** | Family road-tripper, 30s, traveling with kids |
| **Context** | Needs snacks, phone charger, medicine — disoriented in a large unfamiliar store |
| **Emotional State** | Frazzled, overwhelmed, time-pressured |
| **Tech Comfort** | High — app-native, responds well to visual interfaces |
| **Interaction Mode** | Multi-turn conversational: "Do you have gluten-free snacks?" / "Where's the bathroom?" / "Kids Tylenol?" |
| **Pain Point** | Store is huge and she's never been there; doesn't know product availability |
| **Success Metric** | 3+ queries answered in a single interaction; positive affect at exit |

**Reachy Mode:** Warm, conversational guide. Leverages visual map for multi-item journeys.

---

## 6.3 Persona — "Karen" *(Primary: Frustrated/Escalating Customer)*

| Attribute | Detail |
|---|---|
| **Who** | Any customer — archetype for frustration escalation scenarios |
| **Context** | Something went wrong: wrong price, out-of-stock item, long wait, broken equipment |
| **Emotional State** | Actively frustrated, potentially confrontational |
| **Tech Comfort** | Irrelevant — emotional state dominates |
| **Interaction Mode** | Karen Whisperer mode — Reachy detects escalating sentiment, de-escalates, triggers manager call at defined thresholds |
| **Pain Point** | Feels ignored or poorly treated; no staff visible to resolve issue |
| **Success Metric** | De-escalation without human intervention (Tier 1); clean manager handoff when threshold crossed (Tier 2) |

**Reachy Mode:** Calm, neutral, empathetic. **Never inflames.** Escalation to staff is a first-class feature, not a fallback.

> ⚠️ **PRD Requirement:** Karen Whisperer is a **core MVP feature** in the truck stop context, not a Phase 2 edge case. Single-associate overnight shifts make automated de-escalation operationally critical.

---

## 6.4 Persona — "Store Sam" *(Primary: Staff / Operator)*

| Attribute | Detail |
|---|---|
| **Who** | Store associate or shift manager, 20s–40s, high turnover role |
| **Context** | Managing a large store, potentially solo. Responsible for escalations, stock, and ops |
| **Tech Comfort** | Low-to-moderate; needs simple, glanceable interface |
| **Interaction Mode** | Receives Reachy escalation alerts on handheld device; accesses Planolyzer dashboard for zone visibility, live camera feed, SKU lookup |
| **Pain Point** | Constantly interrupted with "where is X?" questions; stretched thin across the store floor |
| **Success Metric** | Tier-1 customer queries handled by Reachy without Sam involvement; Sam receives actionable alerts only for genuine escalations |

**Planolyzer Mode:** Staff dashboard — zone view, camera feed integration, SKU drill-down, escalation alert panel.

---

# 7. Multi-Store Hybrid Architecture

RRCP is architected as:

## Edge Layer (Per Store)

* Local Planolyzer instance
* SKU database
* Navigation renderer
* Reachy integration
* Offline-capable operation

## Cloud Layer (Enterprise)

* Store registry
* Schema management
* Version-controlled layouts
* Tenant isolation
* Cross-store analytics (future)

Each store operates independently while being centrally manageable.

---

# 8. Reachy ↔ Planolyzer Integration Contract

> Derived from UI reference mockups showing the Reachy Mini Control panel, Customer IM interface, and Store Planogram dashboard.

## 8.1 Spatial Data Model

The authoritative location schema used across all system boundaries:

```
Store
└── Zone (e.g. "Front Wall", "Counter", "Rear")
    └── Aisle (e.g. "Aisle 1", "Aisle 2", "Aisle 3")
        └── Bay (e.g. "Bay 1", "Bay 2")
            └── Shelf Position (future)
```

All SKU-to-location mappings MUST use this hierarchy. Location strings rendered to customers: **"Aisle [N], Bay [N]"**.

## 8.2 System Boundary Map

| Component | Role | Owns |
|---|---|---|
| **Planolyzer** | Spatial + inventory store of record | Store layout, SKU locations, planogram state, stock level, price, scan history |
| **Reachy Runtime** | Conversation + pipeline orchestrator | NLP interpretation, query routing, vision scan triggers, escalation logic |
| **Customer IM Interface** | Customer-facing renderer | Conversation display, mini-map rendering, product result cards |
| **Staff Planogram Dashboard** | Operator-facing renderer | 3D store view, item drill-down, camera feed, scan audit log |

## 8.3 Query Pipeline & Latency Budget

Derived from observed mockup timings. All values are **per-request SLA targets**:

| Stage | Description | Target Latency | Source |
|---|---|---|---|
| **1. NLP Parse** | Extract intent + product entity from voice/text | <200ms | Reachy Runtime |
| **2. Planogram Lookup** | Query Planolyzer for SKU location + price | <500ms | Planolyzer API |
| **3. Response Render** | Display location + mini-map to customer | <100ms | Customer IM |
| **4. Vision Scan (optional)** | Physical shelf scan via camera to confirm stock | <2s | Vision subsystem |
| **5. Vision Result** | Full shelf scan pipeline completion | <45s | Vision subsystem |

> **Total time-to-answer (Steps 1–3):** <800ms target for standard wayfinding queries.
> Vision scan is **opt-in / background** — customer receives location answer before scan completes.

## 8.4 Planolyzer API Contract (Required Endpoints)

### `GET /api/sku/locate`
Locate a product by name or SKU ID.

**Request:**
```json
{
  "store_id": "string",
  "query": "string",        // natural language or SKU ID
  "query_type": "name|sku"
}
```

**Response:**
```json
{
  "sku_id": "string",
  "product_name": "string",
  "location": {
    "zone": "string",
    "aisle": "string",
    "bay": "string"
  },
  "price": "number",
  "stock_level": "ok|low|out",
  "planogram_match": "verified|unverified|mismatch",
  "map_highlight_id": "string"  // reference for Planolyzer map pin
}
```

### `GET /api/store/map`
Return spatial layout for mini-map rendering.

**Response:** Store zone/aisle/bay graph with coordinates for map rendering.

### `POST /api/scan/submit`
Submit vision scan result for inventory audit.

**Request:**
```json
{
  "store_id": "string",
  "aisle": "string",
  "bay": "string",
  "scan_result": "found|not_found",
  "product_name": "string",
  "timestamp": "ISO8601"
}
```

### `GET /api/scan/history`
Return recent scan log for staff dashboard.

## 8.5 Reachy Runtime Events → Staff Dashboard

Reachy publishes events consumed by the Staff Planogram Dashboard:

| Event | Trigger | Staff Dashboard Action |
|---|---|---|
| `customer.query` | Any customer interaction begins | Log to activity feed |
| `sku.located` | Product found in Planolyzer | Highlight item on 3D store view |
| `vision.scan.started` | Shelf scan initiated | Show "Scanning Aisle N..." status |
| `escalation.triggered` | Karen Whisperer threshold crossed | Push alert to staff device; show customer zone on map |
| `manager.requested` | Explicit manager call | High-priority alert + customer location pin |

## 8.6 Offline Behavior

| Scenario | Behavior |
|---|---|
| Planolyzer unreachable (cloud down) | Serve from local edge cache; mark data as "last synced [timestamp]" |
| Edge cache stale (>24h) | Reachy warns: *"My store map may not be fully up to date"* |
| Vision system offline | Skip vision scan; return planogram location only |
| Full offline | Reachy responds: *"I can't look that up right now — please ask a team member"* + triggers staff alert |

## 8.7 Staff Dashboard — Planolyzer View Requirements

Derived from right-panel mockup:

- **3D isometric store view** with real-time item location pins
- **Item Details panel:** Product name, Location (Aisle + Bay), Price, Stock Level
- **Recent Scans log:** Vision Scan status, Inventory Check status, Planogram Match status
- **Camera feed integration:** Staff can view live camera for any aisle/bay
- **Escalation alert overlay:** Customer zone highlighted when escalation event fires

---

# 9. Open Source Strategy

Planolyzer core is released publicly to:

* Establish spatial schema standardization
* Attract enterprise partnerships
* Enable experimentation and pilot adoption
* Demonstrate technical maturity

Enterprise monetization focuses on:

* Hosted cloud orchestration
* Integration services
* Advanced analytics modules
* Safety & memory enterprise layers
* Multi-store intelligence dashboards

---

# 10. Target Customers

## Primary Markets

| Segment | Fit | Notes |
|---|---|---|
| **Travel Stop / Truck Stop Chains** | ⭐ Highest | 24/7 ops, understaffed, high SKU churn, transient customer base — ideal RRCP fit |
| **Mid-size regional retail chains** | High | Multi-store deployment, consistent layout patterns |
| **Innovation-driven retail brands** | High | Early adopter appetite, PR value of robot-assisted retail |
| **Robotics-enabled retail stores** | High | Pre-existing hardware infrastructure reduces deployment friction |
| **Smart mall environments** | Medium | Complex tenancy model but high foot traffic |

## Secondary Markets

* Retail innovation labs and R&D teams
* Academic spatial AI research groups
* Systems integrators building managed retail tech stacks

## Beachhead Market Recommendation

> **Retail truck stop chains** (Pilot Flying J, Love's, TravelCenters of America) represent the highest-fit MVP target: 24/7 operations, understaffed environments, high-value transient customers, and a direct commercial case for Reachy as a force multiplier. A single chain pilot across 5–10 locations validates the multi-store architecture.

---

# 11. Differentiation

RRCP differs from:

Planogram SaaS:

* Moves beyond static merchandising tools into interactive spatial OS.

Retail dashboards:

* Anchors analytics to physical space.

Robotics demos:

* Decouples robot from intelligence layer.

Digital twin platforms:

* Purpose-built for retail and conversational interaction.

RRCP creates a new category:

> Distributed Spatial Intelligence for Physical Retail.

---

# 12. Reachy Personality Specification

Reachy Mini's **physical form IS the UX**. As a small robot with a body, expressive head, and antennas, customers anthropomorphize Reachy immediately. This is a strategic asset — it enables de-escalation, engagement, and brand differentiation that a kiosk screen cannot replicate.

## Core Personality Traits

| Trait | Expression |
|---|---|
| **Calm** | Never reactive, never rushed — especially under confrontation |
| **Helpful** | Genuinely oriented around solving the customer's problem |
| **Approachable** | Warm enough to invite interaction; not intimidating |
| **Efficient** | Respects the customer's time — especially trucker personas |
| **Honest** | If Reachy doesn't know, it says so and offers an escalation path |

## Mode Behaviors

### Wayfinding Mode *(Big Rig Bobby)*
- Direct, concise verbal response
- Immediate visual map highlight
- Minimal small talk; respects urgency
- Example: *"DEF fluid is in Aisle 9, near the back wall. I've highlighted it on the map for you."*

### Conversational Guide Mode *(Road Trip Rachel)*
- Multi-turn dialogue support
- Friendly and patient
- Proactively offers related help ("Want me to show you where the restrooms are too?")
- Leverages visual map for multi-item journeys

### Karen Whisperer Mode *(Escalating Customer)*
- Detect escalating sentiment via voice tone + language signals
- Respond with calm acknowledgment: *"I hear you, and I want to help get this resolved."*
- **Never escalate rhetoric.** Never be defensive.
- Tier 1: Attempt de-escalation with empathy + solution offer
- Tier 2: Trigger staff alert automatically when threshold crossed
- Example threshold: 3 consecutive negative sentiment signals OR explicit profanity/aggression
- Handoff phrase: *"Let me get a team member over to you right now — they'll take great care of you."*

## Personality Requirements (PRD)

- Reachy MUST maintain persona consistency across all interaction modes
- Personality parameters shall be configurable per store/chain (tone can vary from warm to utilitarian)
- Escalation thresholds for Karen Whisperer mode shall be operator-configurable
- Reachy shall never claim to be human if sincerely asked

---

# 13. Long-Term Vision

Phase 2:

* Real-time inventory overlays
* Safety alert spatial visualization
* Memory graph integration

Phase 3:

* Predictive layout simulation
* Revenue optimization modeling
* Cross-store comparative intelligence

Phase 4:

* Fully cognitive store network
* Spatially aware AI optimization loops
* Retail behavior orchestration

---

# Final Positioning Statement

Reachy Retail Cognitive Platform is:

An open, modular, multi-store spatial operating system that transforms physical retail environments into intelligent, interactive ecosystems.

The robot is an interface.
The twin is the foundation.
The platform is the infrastructure.

---
