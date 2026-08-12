# AI Platform Engineering: The Platform Layer


Every AI demo I've ever seen works perfectly. Every AI system I've ever built breaks in ways no demo ever warned me about.

If you've spent any time trying to take an AI workload from a Jupyter notebook to production, you know exactly what I mean. In the notebook, the model predicts, generates, and reasons beautifully. In production, GPUs sit idle waiting for data, inference latency spikes unpredictably, memory leaks crash the system, and your cloud bill suddenly looks like a down payment on a house.

These aren't model failures. They are platform failures.

In this first post of our *AI Platform Engineering* series, we need to set the stage. Before we can talk about how to build resilient, scalable AI systems, we have to define exactly what we are building. The key to understanding modern AI architecture is recognizing that it exists in three distinct layers—and almost all the pain right now is concentrated in the middle one.

## The three-layer AI architecture

If you strip away the buzzwords, every production AI deployment breaks down into three layers.

{{< figure src="/images/ch1-01-3-layers.jpg" width=400 >}}  {{< load-photoswipe >}}

The bottom-most layer is the ***infrastructure***. It's the hardware: GPUs, CPUs, high-speed networking (InfiniBand, RoCE), storage arrays, power delivery, and cooling systems. Whether you are running this on-premises or in the cloud, this is the physical reality of compute. This layer is provided by vendors such as Dell, NVIDIA, and AMD.

The middle layer is the ***platform***, and it's the focus of this entire series. The platform layer is the software that orchestrates the infrastructure to make it usable for AI workloads. It abstracts away the hardware complexity and provides the services needed to train, serve, and monitor AI models. This layer typically includes Kubernetes, model serving engines (vLLM, SGLang), GPU schedulers (Run:ai), vector databases, experiment tracking (MLflow), data pipelines, observability stacks, and cost management tools.

The top-most layer is the ***application*** layer, and it's the software that users actually interact with. It's the chatbot, the coding assistant, the recommendation engine, or the RAG application. What we have been using for a while, such as ChatGPT, GitHub Copilot, and custom agentic systems that we build live at this layer.

If this three-layer model looks familiar, it's because we went through this exact evolution with web platforms. 

Twenty years ago, web developers were racking servers and configuring Apache directly on bare metal. It was painful. Then we built the web platform layer: virtualization, containers, Kubernetes, CI/CD pipelines, and PaaS offerings. The platform layer decoupled the web application from the physical server.

AI is going through this exact transition right now, but the stakes are higher. AI workloads are stateful, incredibly resource-intensive, and highly sensitive to latency and bandwidth constraints. You can't just slap a basic Kubernetes cluster on top of a GPU and call it an AI platform. The orchestration requires a fundamentally different approach.

With the rise of AI, we've seen an explosion of job titles and disciplines. Here is how they map to our three-layer model:

* **Infrastructure Engineering:** Lives at the bottom. Focused on power, cooling, hardware provisioning, and raw network topology.
* **DataOps:** Feeds the platform layer. Focused on data quality, ingestion pipelines, and governance.
* **MLOps:** Lives squarely in the platform layer, but traditionally focuses more on the model lifecycle (training, testing, deployment) than the underlying orchestration and hardware efficiency.
* **AI Engineering:** Spans the application layer and the upper edges of the platform layer (like prompt engineering and RAG design).
* **Platform Engineering:** The umbrella discipline that builds and maintains the entire middle layer.

## The platform layer is the bottleneck

In my work at Dell, building AI platforms and helping enterprises deploy the Dell AI Factory architecture, I see a consistent pattern. Organizations spend millions on high-end infrastructure (like PowerEdge XE9680s packed with GPUs). They have brilliant data scientists building great models. But they stall when trying to connect the two. The platform layer is where the engineering effort concentrates because it's where the abstractions leak. When your model is starving for data because the storage throughput can't keep up with the GPU ingestion rate, that's a platform problem. When you have 8 GPUs, but your serving engine can only effectively utilize two of them due to poor parallelization, that's a platform problem. Dell AI Platforms exist specifically to provide blueprint patterns for this layer, but the reality is that every organization has to build or compose a platform tailored to their specific applications and constraints.

If you don't build a robust platform layer, your AI applications will be brittle, your infrastructure will be underutilized, and your engineers will spend all their time fighting fires instead of building features.

## Key takeaways

If I were to summarize this article and explain the most critical points, here is what I'd tell you:

* **AI requires a three-layer architecture:** Infrastructure (hardware), Platform (orchestration), and Application (user experience).
* **Most AI failures happen in the middle:** The platform layer is the current bottleneck in taking AI from prototype to production.
* **We are repeating web history, but harder:** AI platforms require the same abstraction as web platforms (like Kubernetes), but must handle massive state, custom silicon, and extreme bandwidth requirements.
* **Platform Engineering is the critical discipline:** It's the glue that makes expensive GPUs actually useful to application developers.

We've established that the platform layer is critical. But wait, didn't we just spend the last ten years perfecting Kubernetes and cloud-native architectures? Why can't we just use our existing web platforms for AI?

In the next part of this series, we'll dive into exactly that: *Why AI Platforms Are Fundamentally Different from Web Platforms*. (Spoiler: Your microservices architecture isn't going to save you when you need to synchronize gradients across thousands of GPUs.)
