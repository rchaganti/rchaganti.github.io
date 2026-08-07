# Understanding AGNTCY - The OASF data model and agent schemas


As a part of this series on AGNTCY, we have explored the high-level design and the broader context. In Part 2, we examined the architecture overview, and in Part 3, we discussed where AGNTCY sits within the larger AI ecosystem. Now, let us drill into Layer 1 of the AGNTCY stack: the Open Agentic Schema Framework (OASF).

## Why Schemas Matter

Before two systems can interact dynamically, they need a clear contract. Think of this like implementing interfaces in object-oriented programming or defining Protobuf messages for gRPC services. In the agentic world, an agent's schema acts as a universal API specification and a capability résumé combined. 

Without a standardized schema, orchestrators are left guessing what an agent can do, often resorting to fragile prompt parsing and heuristic-based routing. This is neither scalable nor reliable. To achieve true interoperability, we need a deterministic way for agents to advertise their capabilities, inputs, and expected outputs. 

## OCSF Origins

The inspiration for OASF comes from a highly successful standardization effort in a different domain: the Open Cybersecurity Schema Framework (OCSF). For years, security practitioners struggled with heterogeneous security logs from different vendors. OCSF solved this by providing an extensible, vendor-agnostic core schema for cybersecurity events. 

What I like about this approach is its pragmatic focus on a unified taxonomy. By applying the same principles to AI agents, OASF standardizes agent attributes. This standardization solves the fundamental problem of inter-vendor agent discovery. If every agent describes itself using the same foundational vocabulary, an orchestrator can dynamically discover and route tasks to the right agent, regardless of who built it.

## The `Record` Object

At the heart of OASF is the `Record` object. This is the core foundational data structure that defines an agent. Let us look at a realistic example for a cloud security & compliance auditor agent.

```json
{
  "name": "Cloud Security Auditor",
  "description": "Analyzes cloud infrastructure configurations against well-architected best practices and security frameworks.",
  "version": "1.2.0",
  "schema_version": "1.0.0",
  "authors": ["Platform Security Team <security@example.com>"],
  "created_at": "2025-01-15T00:00:00Z",
  "domains": [
    {"name": "technology/security/data_security", "id": 10702},
    {"name": "technology/information_technology", "id": 106}
  ],
  "skills": [
    {"name": "security_privacy/secret_leak_detection", "id": 803},
    {"name": "governance_compliance/compliance_assessment", "id": 1302}
  ],
  "modules": [
  ],
  "locators": [
    {"type": "source_code", "urls": ["https://github.com/example/cloud-security-auditor"]}
  ]
}
```

This `Record` object provides a complete, machine-readable definition of the agent. It clearly states what the agent can do, the context in which it operates, what data it requires, and what it will return.

### Skills vs Domains Taxonomy

You might notice the distinction between `skills` and `domains` in the JSON payload above. This separation is a deliberate and critical design choice in OASF. 

In classical Indian knowledge systems, particularly in Sanskrit grammar formulated by Pāṇini in the *Aṣṭādhyāyī*, language is constructed by combining unbound root actions with specific contexts or loci. There is a strict, foundational distinction between the root action (*dhātu*) and the context or object (*viṣaya* or *adhikaraṇa*) of that action.

Let us look at a concrete linguistic example:

Consider the verbal root **पच् (*pac*)**, which means the abstract process of cooking, maturing, or refining. It specifies *what operation is being performed*, completely independent of what is being cooked or where it happens.

When you pair this root action with different contexts (*viṣaya* or *kāraka*), the precise operational meaning adapts seamlessly:

* **पच् (*pac*) + ओदन (*odana* / rice):** "cooking rice"
* **पच् (*pac*) + स्थाली (*sthālī* / pot):** "cooking in a pot"
* **पच् (*pac*) + शास्त्र (*śāstra* / text):** "digesting or mastering a text"

If Pāṇini had defined a single compound word for "rice-cooking" as an indivisible primitive root, you would need a new primitive root for "vegetable-cooking", another for "pot-cooking", and another for "text-digesting". By isolating **Dhātu (the verb)** from **Viṣaya (the noun/context)**, a small, finite set of ~2,000 root actions can produce millions of precise, contextual expressions.

In OASF, this exact compositional principle can be seen:

| Pāṇini's Grammar  | OASF Schema (AGNTCY)            | Official OASF 1.0.0 Example                                  |
| :---------------- | :------------------------------ | :----------------------------------------------------------- |
| **Dhātu (धातु)**   | **Skill** (The Verb / Action)   | `security_privacy/secret_leak_detection` (ID: 803), `governance_compliance/compliance_assessment` (ID: 1302) |
| **Viṣaya (विषय)** | **Domain** (The Noun / Context) | `technology/security/data_security` (ID: 10702), `technology/information_technology` (ID: 106) |

*Why is this separation so critical in production?* 

If an enterprise agent simply publishes a monolithic string tag like `"cloud_security_auditor"`, an automated directory router cannot easily determine if that agent can also perform secret leak detection on an on-premise code repository. The action (`secret_leak_detection`) and context (`data_security`) are fused together.

By enforcing the separation of Skills (*Dhātu*) and Domains (*Viṣaya*), the AGNTCY Directory (`dirctl`) can execute deterministic relational queries across the network:

1. **Pure Skill Lookup (\*Dhātu\*):** *"Find any agent capable of `security_privacy/secret_leak_detection` (ID: 803) regardless of domain."*
2. **Pure Domain Lookup (\*Viṣaya\*):** *"Find all agents operating within the `technology/security/data_security` (ID: 10702) domain."*
3. **Relational Intersection:** Skill(ID: 803)∩Domain(ID: 10702)Skill(ID: 803)∩Domain(ID: 10702)

This eliminates ambiguity and prevents routing black holes when orchestrating multi-agent workflows.

## Composable Modules

The base OASF schema is kept intentionally lean. However, enterprise scenarios require additional metadata. This is where composable modules come into play. As seen in our JSON example, modules allow developers to attach extra metadata—such as pricing models, Service Level Agreements (SLAs), or compliance certifications—without bloating the base schema. This composability ensures that the core schema remains fast and easy to parse, while still supporting the complex requirements of a production marketplace.

## Looking Ahead

Standardizing how agents describe themselves is the first step toward a robust, interoperable agentic ecosystem. By defining clear contracts and separating actions from contexts, OASF provides the foundation for dynamic discovery and routing. In Part 5 of this series, we will explore Schema Validation and Private Extensions, looking at how organizations can enforce quality and extend OASF for their internal use cases. How are you currently handling capability discovery in your multi-agent setups? Are you using a formalized schema or relying on ad hoc descriptions? I would love to hear your thoughts.

