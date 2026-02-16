# Building a Multi-Agent LinkedIn Newsletter System with Google ADK


Google's Agent Development Kit (ADK) provides [workflow agents](https://google.github.io/adk-docs/agents/workflow-agents/) to enable more deterministic agent execution. These workflows can be combined to create more complex agentic workflows.

In this post, I'll walk you through how I created an AI-powered content pipeline that:
- **Researches** trending topics using Google Search
- **Writes** engaging newsletter drafts
- **Edits** and quality-checks the content
- **Publishes** the final version to a local file

Let's dive in!

### The Big Picture: A Team of Specialized Agents

Instead of building one massive AI that does everything (and probably does nothing well), I went with a **multi-agent architecture**. Think of it like assembling a content team:

| Agent | Role | Job Description |
|-------|------|-----------------|
| **WebResearchAgent** | Research Analyst | Finds trending topics from the web |
| **WriterAgent** | Content Creator | Transforms research into engaging prose |
| **EditorAgent** | Quality Control | Reviews drafts and provides feedback |
| **PublisherAgent** | Publisher | Saves the final approved content |

The cool part? These agents talk to each other, pass work around, and even have a built-in feedback loop. Let me show you how it all works.

### Setting Up the Foundation

First, let's look at the imports and setup:

```python
import asyncio
from google.adk.agents import LlmAgent, SequentialAgent, LoopAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import google_search
from google.genai import types
from utils.agent_utils import load_instruction, save_to_local_file
from dotenv import load_dotenv

load_dotenv()
```

The key imports here are:
- **`LlmAgent`** – Your basic AI agent that can think and respond
- **`SequentialAgent`** – Runs agents one after another (like a pipeline)
- **`LoopAgent`** – Keeps running until a condition is met (perfect for edit cycles!)
- **`google_search`** – Built-in tool for web searches

---

### The Web Research Agent

This agent is our digital bloodhound. It sniffs out the latest trends using Google Search.

```python
web_research_agent = LlmAgent(
    name="WebResearchAgent",
    model="gemini-2.0-flash",
    instruction=load_instruction("web-search-agent.txt"),
    tools=[google_search],
    output_key="research_output",
)
```

Notice the `output_key="research_output"` – this is crucial! It stores the agent's output in a shared state that other agents can access later. Think of it as the agent putting its work in a shared folder.

#### The Research Prompt

Here's what the research agent's instructions look like:

```plaintext
Role: Strategic Research Analyst
Task: Identify and summarize the top 5 trending items for a provided set of topics from the last 7 days.

Instructions (Chain-of-Thought): For each topic provided, follow these steps internally:
- Deconstruct: Break down the topic into 2-3 specific search queries
- Execute: Use the Google Search tool for each query
- Evaluate: Select the 5 most "impactful" items
- Synthesize: Write a high-density summary for each item

Required Output Format per Topic:
Topic: [Topic Name]
- [Headline]: [1-sentence summary]
- Insight: [Why this matters to professionals]
- Reference: [Source URL]
```

The Chain-of-Thought (CoT) approach forces the agent to think systematically rather than just vomiting out whatever comes to mind first.

---

### The Writer Agent

Now we need someone to turn that raw research into something people actually want to read.

```python
writer_agent = LlmAgent(
    name="WriterAgent",
    model="gemini-2.0-flash",
    instruction=load_instruction("writer-agent.txt"),
    output_key="writer_draft"
)
```

#### The Writer's Prompt

```plaintext
Role: Creative Content Creator
Instruction: You are a professional Copywriter specializing in LinkedIn Newsletters.

Research Output:
{research_output}

Your workflow:
- Draft a LinkedIn Newsletter in Markdown format
- Structure the draft with:
  - Catchy Title: Use a hook that targets professionals
  - Introduction: Briefly set the stage for the week's trends
  - Body Paragraphs: One section per topic (narrative style, not just a list!)
  - Always use citations and link to the sources
  - Takeaways: A "So What?" section for the reader
  - Call to Action (CTA): Encourage comments or shares

Feedback Integration: If the editor responds with APPROVED, call the exit_loop tool.
Otherwise, use editor feedback provided below and revise the draft.

Editor Feedback (if any):
{editor_feedback:}
```

See that `{research_output}` placeholder? That's pulling in the `WebResearchAgent`'s work automatically. And `{editor_feedback}` lets the writer know what needs fixing. Magic!

---

### The Editor Agent

Every writer needs an editor (even AI writers). This agent plays the bad cop and ensures quality standards are met.

```python
editor_agent = LlmAgent(
    name="EditorAgent",
    model="gemini-2.0-flash",
    instruction=load_instruction("editor-agent.txt"),
    output_key="editor_feedback"
)
```

#### The Editor's Prompt

```plaintext
Role: Quality Control & Compliance
Instruction: You are a meticulous Senior Editor.

Writer's Draft to Review:
{writer_draft}

Review Checklist:
- Accuracy: Does it reflect the 5 trending items?
- Trust Worthy: Are citations added and linked to sources?
- Formatting: Is it valid Markdown with proper headers?
- Tone: Is it appropriate for a LinkedIn professional audience?
- Clarity: Any grammatical errors or awkward phrasings?
- Engagement: Is the hook strong enough to stop the scroll?

Response Logic:
- If the draft passes all checks: Respond only with "APPROVED"
- If the draft fails: Provide bulleted feedback for the Writer Agent
  (Do NOT rewrite the draft yourself!)
```

The key here is the **Response Logic** – if everything looks good, the editor just says "APPROVED", and we move on. If not, it sends feedback, and the loop continues.

---

### The Writer-Editor Loop

This is where things get interesting. We wrap the writer and editor in a `LoopAgent`:

```python
writer_editor_loop = LoopAgent(
    name="ReviewCycle",
    sub_agents=[
        writer_agent, 
        editor_agent
    ],
    max_iterations=3
)
```

What happens here:
1. Writer creates a draft
2. Editor reviews it
3. If "APPROVED" → Exit the loop
4. If not → Writer revises based on feedback
5. Repeat until approved or max iterations (3) is reached

This mimics real-world content workflows! No more publishing first drafts.

### The Publisher Agent

Once the editor gives the green light, we need to save the final product.

```python
publisher_agent = LlmAgent(
    name="PublisherAgent",
    model="gemini-2.0-flash",
    instruction=load_instruction("publisher-agent.txt"),
    tools=[save_to_local_file]
)
```

### Custom tool for saving the newsletter content

The publisher uses a custom tool to save files:

```python
def save_to_local_file(content: str, filename: str = None) -> str:
    """Saves the combined multi-topic newsletter to a local file."""
    try:
        if filename is None:
            date_str = datetime.now().strftime("%Y-%m-%d")
            filename = f"newsletter_issue_{date_str}.md"
            
        with open(filename, "w", encoding="utf-8") as f:
            f.write(content)
        return f"SUCCESS: Multi-topic newsletter saved to {filename}"
    except Exception as e:
        return f"FAILURE: {str(e)}"
```

> Always return meaningful success/failure messages from your tools. The agent needs to know what happened!

## Putting It All Together: The Sequential Pipeline

Now we chain everything into a master workflow:

```python
newsletter_system = SequentialAgent(
    name="LinkedInNewsletterSystem",
    sub_agents=[
        web_research_agent,    # Step 1: Research
        writer_editor_loop,     # Step 2: Write & Review (loops)
        publisher_agent         # Step 3: Publish
    ]
)
```
This creates a pipeline that flows like:

```
Research → Write → Edit → (Loop if needed) → Publish
```
### Running the Whole Thing

Here's the `main()` function that kicks everything off:

```python
async def main():
    topics = ["AI data center infrastructure", "Networking for AI", "Storage for AI"]
    
    APP_NAME = "linkedin_newsletter_assistant"
    USER_ID = "user_admin"
    SESSION_ID = "multi_topic_001"
    
    # Create a session service to manage state
    session_service = InMemorySessionService()
    
    await session_service.create_session(
        app_name=APP_NAME,
        user_id=USER_ID,
        session_id=SESSION_ID,
    )
    
    # Create the runner
    runner = Runner(
        agent=newsletter_system,
        app_name=APP_NAME,
        session_service=session_service,
    )
    
    print(f"🚀 Launching Multi-Topic System for: {', '.join(topics)}")
    
    # Send the initial message
    new_message = types.Content(
        role="user",
        parts=[types.Part(text=f"Process these topics: {', '.join(topics)}")],
    )
    
    # Run and stream results
    for event in runner.run(
        new_message=new_message,
        user_id=USER_ID,
        session_id=SESSION_ID,
    ):
        if event.is_final_response() and event.content and event.content.parts:
            print("\n--- Process Report ---")
            print(event.content.parts[0].text)

if __name__ == "__main__":
    asyncio.run(main())
```

The `load_instruction` helper function loads the agent's prompt from local text files. This helps keep the code clean.

```python
def load_instruction(file_name: str) -> str:
    """
    Finds the 'prompts' directory relative to the project root 
    and returns the content of the specified text file.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    file_path = os.path.join(project_root, "prompts", file_name)
    
    try:
        with open(file_path, 'r', encoding="utf-8") as file:
            return file.read().strip()
    except FileNotFoundError:
        return f"Error: The file {file_name} was not found in the prompts directory."
```

Keeping prompts in separate text files is a game-changer for:
- **Version control** – Track changes to prompts separately
- **Non-technical editing** – Let others tweak prompts without touching code
- **Experimentation** – A/B test different prompt strategies easily

The Google ADK makes building these multi-agent systems surprisingly straightforward. An example of the output from this multi-agent system is available as a [LinkedIn article I published](https://www.linkedin.com/pulse/ai-making-us-smarter-just-lazier-deep-work-dilemma-ravikanth-chaganti-9xgle/?trackingId=AAMVZzHobMNO7NspX0iQXA%3D%3D) last week.

Give it a try and let me know what you build! 

