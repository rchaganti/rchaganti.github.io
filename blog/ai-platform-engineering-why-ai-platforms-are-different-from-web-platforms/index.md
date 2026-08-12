# AI Platform Engineering: Why AI Platforms are different from web platforms


For the last decade, building an internal developer platform meant one thing: Kubernetes, stateless microservices, and a horizontally scalable database. If things got slow, you just added more pods. If you needed more compute, you spun up more CPU instances in the cloud. It was a solved problem. Then generative AI showed up, and suddenly everyone thought they could just bolt a GPU onto their existing web platform and call it a day.  I see this all the time in my work as an AI Platform Architect at Dell Technologies. A team will take their battle-tested, highly available web platform, try to run a massive LLM or a large-scale training job on it, and watch the whole thing melt down—sometimes literally.

Here is the hard truth: an AI platform is not just a web platform with a GPU attached. The core assumptions that drove web architecture for the last ten years are fundamentally broken when you introduce AI workloads. Let's look at why.

## GPU is the center of gravity, not the CPU

Web platforms are CPU-bound and designed for horizontal scalability. You treat servers like cattle. If one goes down, Kubernetes spins up another. 

AI platforms revolve entirely around the GPU. And GPUs are not cattle; they are incredibly expensive, power-hungry, scarce racehorses. A single modern data center GPU can cost between $20,000 and $40,000. You absolutely cannot just "add more pods." 

Because of this capital intensity, utilization matters enormously. Your platform has to support sophisticated scheduling, time-slicing, Multi-Instance GPU (MIG), and multi-tenancy just to make the economics work. An idle CPU is a minor inefficiency; an idle GPU cluster is a fireable offense.

## Thermals and Power

In traditional web infrastructure, developers rarely think about power draw or cooling. You deploy your code and assume the data center handles the rest.

With AI, physics becomes a software problem. Modern AI servers are beasts. Take the Dell PowerEdge XE9680 as a prime example—packing 8 massive GPUs into a single chassis. When you have GPUs pulling 700W+ *each*, traditional air cooling simply stops working. You start dealing with dedicated power circuits, liquid cooling requirements, and physical rack density limits. Your AI platform has to be deeply aware of the underlying hardware topology, PCIe lanes, and NVLink topologies in a way that a web microservice never cares about.

## Workloads Are Non-Deterministic

If a web service takes a JSON payload and writes it to a database, it should do the exact same thing a million times out of a million. You write unit tests: `assert response == expected`. LLMs don't work like that. They are probabilistic engines. The same prompt might yield different answers. This completely upends how we test, monitor, and validate software. You can't just check for a 200 OK status. Your platform needs semantic evaluation pipelines, output quality monitoring, hallucination detection, and safety guardrails baked in. Observability in AI isn't just about tracing latency; it's about evaluating truthfulness.

## Workflows Are Built for Experimentation

Web development is linear: *build $\rightarrow$ test $\rightarrow$ ship*.
AI development is scientific: *hypothesize $\rightarrow$ experiment $\rightarrow$ evaluate $\rightarrow$ repeat*.

An AI platform must support rapid, messy experimentation. A data scientist needs to spin up a fine-tuning job, try five different hyperparameter configurations, compare the results, track data lineage, and then throw four of them away. The platform has to manage these experiments, track MLflow or Weights & Biases metrics, and handle model registries. Web CI/CD pipelines are too rigid for the chaotic nature of AI model development.

## Massive Data Gravity

Web apps usually treat the database as just another component. In AI, the data infrastructure *is* the platform. 

Training datasets can be terabytes or petabytes. Vector stores for RAG grow continuously. You can't just move this data around on a whim. The compute has to move to the data. At Dell, we see this constantly—it's why architectures rely on high-throughput storage like Dell PowerScale for training data and ObjectScale for massive unstructured datasets. When you're saturating GPU interconnects, data movement becomes your primary bottleneck.

## Inverted Cost Profiles and AI FinOps

In web platforms, compute is generally cheap and developers are expensive. We waste compute to save developer time.

In AI platforms, the economics are entirely inverted. GPU hours are exquisitely expensive. Metrics like cost-per-token and cost-per-inference become your primary KPIs. This has birthed the entirely new discipline of AI FinOps. It's also why flexible consumption models exist. This is because not every organization wants to CapEx $500K+ servers just to figure out their AI strategy. The platform has to enforce strict quotas, track usage to the penny, and optimize resource allocation aggressively.

## The Tale of the Tape: Web vs. AI Platforms

| Characteristic       | Web Platforms                               | AI Platforms                                           |
| :------------------- | :------------------------------------------ | :----------------------------------------------------- |
| **Compute Focus**    | CPU-centric, cheap, abundant                | GPU-centric, expensive, scarce                         |
| **Scaling Model**    | Horizontal (scale out easily)               | Vertical + Complex Cluster (scale up & out)            |
| **Workload Nature**  | Deterministic, transactional                | Probabilistic, compute-intensive                       |
| **Development Loop** | Build $\rightarrow$ Test $\rightarrow$ Ship | Hypothesize $\rightarrow$ Train $\rightarrow$ Evaluate |
| **Storage Role**     | Component of the architecture               | The center of gravity                                  |
| **Key Metric**       | Requests per second, Latency                | Tokens per second, GPU Utilization                     |

## The Architectural Shift

When you compare a traditional web platform side-by-side with an AI platform, the most striking difference isn't just that the stack gets taller—it's that **every single layer of concern fundamentally shifts in responsibility, statefulness, and hardware intimacy.**

In a standard web platform, you manage 4 relatively straightforward tiers: the web UI, microservices, a relational/document database, and commodity CPU nodes. 

In an AI platform, those 4 tiers expand into **6 specialized, highly interdependent layers**:

{{< figure src="/images/ch1-02-layers.jpg" width=400 >}}  {{< load-photoswipe >}}

### Breaking Down the Shift in Responsibilities

1. **Application Layer $\rightarrow$ Eval & Guardrails Layer**
   * *Web:* Input validation means regex checking email formats and sanitizing SQL injection strings.
   * *AI:* Input/output validation requires non-deterministic guardrails: detecting prompt injection attacks, enforcing PII redaction, filtering toxicity, and running real-time semantic evaluation to catch model hallucinations before they reach the user.

2. **Microservices Layer $\rightarrow$ Model Serving & Inference Runtime**
   * *Web:* Microservices are lightweight, stateless containers running Node.js, Go, or Java. Scaling is cheap, startup time is seconds, and memory footprints are measured in megabytes.
   * *AI:* Model serving engines (vLLM, TensorRT-LLM, SGLang) are state-heavy runtimes. They manage gigabytes of model weights in VRAM, execute PagedAttention, orchestrate KV cache reuse, and perform continuous dynamic batching across hardware accelerators.

3. **Relational Database Layer $\rightarrow$ Vector DBs & Unstructured Data Fabric**
   * *Web:* Databases store structured rows or JSON documents. Queries are deterministic SQL index lookups.
   * *AI:* Data platforms store multi-dimensional vector embeddings and multi-petabyte unstructured datasets. Queries perform high-dimensional nearest-neighbor searches (HNSW). Storage platforms like Dell PowerScale and ObjectScale must stream tens of gigabytes per second directly to GPUs without causing I/O starvation.

4. **Commodity CPUs $\rightarrow$ High-Density GPU & Accelerator Clusters**
   * *Web:* Compute nodes are commodity CPU cores connected via standard gigabit networking. Kubernetes treats every pod and CPU core as interchangeable.
   * *AI:* Compute nodes are specialized accelerator fabrics (such as 8x GPU nodes connected via NVLink and high-bandwidth InfiniBand or Spectrum-X Ethernet). Topology awareness is critical—a pod scheduled on the wrong PCIe lane or remote GPU socket will suffer catastrophic latency penalties.

5. **Facility Air Cooling $\rightarrow$ Direct Liquid Cooling & Power Management**
   * *Web:* Facility thermal management is transparent to software developers. Racks pull 5kW to 10kW and run standard fans.
   * *AI:* High-density GPU racks pull 40kW to 100kW+ per rack. Modern AI servers like the Dell PowerEdge XE series require direct-to-chip liquid cooling, coolant distribution units (CDUs), and dynamic power capping. Hardware health and thermal telemetry leak directly up into the platform scheduler.

> You cannot solve AI platform challenges by taking your web platform and adding a GPU driver. Every layer from the facility floor up to the application interface requires a fundamental redesign.

## What's Next?

We've established that you can't just recycle your Kubernetes web platform and expect to succeed with AI. The constraints are different, the hardware is different, and the workflows are different. 

But how did we get here? For a while, we tried to solve this with "MLOps," but that term doesn't quite capture the reality of generative AI and LLMs. 

In **Part 3** of this series, we'll look at the evolution: why traditional MLOps wasn't enough, and how it evolved into the modern discipline of **AI Platform Engineering**. Stay tuned.
