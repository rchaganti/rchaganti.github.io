# AI Platform Engineering: How MLOps became platform engineering


There is a particular kind of engineering pain that comes from inheriting someone else's model. You get a file. You get a `requirements.txt` that no longer resolves. And you get a number, 94% accuracy, that you have no way to reproduce, because the data that produced it lived in a notebook cell that has since been overwritten.

For most of the 2010s, that was the state of the art.

In the [previous post](/blog/ai-platform-engineering-why-ai-platforms-are-different-from-web-platforms/), we established that AI platforms are not web platforms with a GPU bolted on. But that leaves an obvious objection: we already had a discipline for operationalizing machine learning. We called it MLOps, we spent years building it, and it worked. Why isn't it enough?

The answer is that MLOps rested on an assumption that quietly ceased to hold.

## Models as science projects

Before roughly 2018, machine learning was a research practice wearing an engineering costume. Data scientists worked in notebooks on their laptops or on one shared, over-provisioned server. The deployment strategy was to serialize the model—usually a pickle file—wrap it in Flask, and hand it to a software engineer who had no idea what was inside it.

There was no version control for data. No automated testing for drift. No CI for model artifacts. When something broke in production, debugging meant tracing backward through undocumented notebook cells, if they still existed.

The remarkable thing is that the problem was named very early, and named precisely. In 2015, a team at Google published [Hidden Technical Debt in Machine Learning Systems](https://papers.neurips.cc/paper/5656-hidden-technical-debt-in-machine-learning-systems.pdf)—the paper with the diagram everyone has since reproduced, where the box labeled "ML Code" is a small square surrounded by much larger boxes: configuration, data collection, feature extraction, serving infrastructure, monitoring, process management.

The paper's argument was that the model is the easy part. The system around it is where the cost lives.

That paper is over a decade old, and it is still one of the most accurate things ever written about this field. What it did not come with was tooling.

## The MLOps era

Tooling arrived about three years later. Kubeflow's first release landed in April 2018; MLflow was announced at that year's Spark + AI Summit. Within a couple of years, there was a recognizable stack: experiment tracking, model registries, feature stores, pipeline orchestrators, and CI that tested both data and code.

MLOps worked. It took what software engineering had spent twenty years learning—version control, reproducible builds, automated testing, staged deployment—and applied it to a domain that had been running on notebooks and good intentions. If you have ever been handed a model with a lineage you could actually trace, you are enjoying the results of that decade.

But look closely at what every one of those tools was organized around.

Experiment tracking assumes you are running experiments. A model registry assumes you are producing models. Feature stores assume you are engineering features for training. Pipeline orchestrators assume there is a training pipeline to orchestrate.

**MLOps was built on the assumption that you train the model.**

For the entire period in which the discipline was designed, that assumption was so obviously true that nobody thought to write it down. Which is exactly what makes it dangerous. Load-bearing assumptions are invisible right up until the moment they fail.

## The assumption breaks

Most teams building AI applications today do not train models.

They take a model somebody else trained, such as Llama, Qwen, DeepSeek, or something frontier, and put it behind an API, then adapt it: prompting, retrieval, tool wiring, and occasionally a LoRA adapter fitted to a base they did not create and could not afford to.

When you stop training, the hard problems move. They do not get easier; they relocate:

* From *"can I reproduce this training run?"* to *"can I serve seventy billion parameters inside a latency budget without going bankrupt?"*
* From *"is my feature pipeline correct?"* to *"is my KV cache actually being reused, or am I paying to recompute the same system prompt ten thousand times a day?"*
* From *"which experiment won?"* to *"which of my forty tenants is sitting on the GPU right now, and should they be?"*

None of those are model-lifecycle questions. They are systems questions, and specifically, they are questions about hardware you cannot pretend isn't there.

The industry's first attempt to name this was "LLMOps." It didn't stick, and it deserved not to. It was the same shape of thinking with a new prefix. The problem was never that MLOps needed LLM-specific plugins. The problem was that the center of gravity had moved from the training loop to the inference runtime, and an inference runtime is a fundamentally different kind of system: long-lived, stateful, memory-bound, and expensive by the second rather than by the run.

<!-- TODO (Ravi): this section is where a first-hand story lands hardest — a specific moment when an MLOps-shaped tool or process visibly failed against an inference-shaped problem. One paragraph, concrete, with a number in it. I've deliberately not invented one. -->

## Meanwhile, platform engineering grew up

While MLOps was experiencing an identity crisis, a separate movement had been maturing within mainstream software engineering.

Platform engineering emerged from a plain observation: infrastructure complexity is real and largely irreducible, so making every application team absorb it individually is enormously wasteful. Instead, you build a team whose *product* is a paved road—an internal developer platform with golden paths, sensible defaults, and self-service interfaces—and you treat the engineers who walk that road as customers rather than ticket-filers.

The discipline brought a genuinely useful vocabulary: cognitive load as a thing you can budget, platform-as-product rather than platform-as-project, the golden path as an artifact you deliberately design.

That thinking transfers. But it needs one important amendment before it survives contact with a GPU.

## Where the two meet

AI platform engineering is what you get when platform engineering *practice* is applied to the MLOps *problem domain*—with the amendment.

Classical platform engineering aims to hide the infrastructure. That is the entire point of a PaaS: you should not need to know or care which machine your container landed on.

**You cannot do that with an AI platform, and more importantly, you should not try.**

Hardware characteristics leak upward into application behavior in ways that are not incidental:

* Available VRAM determines the context length you can offer your users.
* The quantization you chose to fit the model on the box changes output quality.
* Batch size sits directly on the trade-off between throughput and the latency a user feels.
* Interconnect topology determines whether a given model can be served at acceptable speed at all.

An AI platform that successfully hides all of this produces application teams who cannot reason about their own system's behavior. They will not understand why latency doubled, why quality drifted after a deployment, or why their bill tripled—because you carefully removed every cue.

So the job is not to hide the hardware. It is to expose a *curated* set of hardware realities—the ones that genuinely change application design—and absorb everything else. Which realities make that list is the hardest judgment call in this discipline, and most of the rest of this series is an argument about where to draw that line.

## What actually changed

| | MLOps | AI Platform Engineering |
| :--- | :--- | :--- |
| **Central artifact** | The trained model | The running workload |
| **Core question** | Can I reproduce this? | Can I serve this, affordably, to many teams? |
| **Optimizes for** | Reproducibility and lineage | Utilization, latency, cost per token |
| **Assumes** | You train the model | You mostly adapt and serve someone else's |
| **Hardware is** | An implementation detail | A first-class design constraint |
| **Unit of work** | A pipeline run | A long-lived service—and now, an agent session |
| **Primary consumer** | Data scientists | Application teams |

One clarification worth making, because this gets overstated: MLOps did not become wrong. If you fine-tune anything, you still need experiment tracking, a registry, and honest lineage. What changed is its scope. MLOps went from being the whole discipline to a subsystem within a larger platform. This is an important one, but no longer the organizing principle.

## Key takeaways

* **MLOps rested on one load-bearing assumption**—that you train the model—and foundation models broke it. Every tool in the classical stack is organized around a training loop that most teams no longer run.
* **The bottleneck moved from the training loop to the inference runtime.** That is a different kind of system: long-lived, stateful, memory-bound, expensive by the second.
* **"LLMOps" was a renaming, not a rethink.** The gap was structural, not a missing plugin.
* **Platform engineering supplied the missing practice**: golden paths, platform-as-product, cognitive load as a budget.
* **The amendment is that you don't hide the hardware.** You expose a curated set of the hardware realities that change application design, and absorb the rest.

## What's next

We now know how the discipline came to be and why it needed a new name. That leaves the practical question: what actually goes into one of these platforms?

In the next part of this series, we'll open it up and walk through the subsystems an AI platform is built from—what each one owns, and which ones you genuinely need on day one.

