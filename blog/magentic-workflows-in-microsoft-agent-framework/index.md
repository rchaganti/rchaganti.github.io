# Magentic workflows in Microsoft Agent Framework


In this series on Microsoft Agent Framework (MAF), we've explored [sequential workflows](https://ravichaganti.com/blog/sequential-workflows-in-microsoft-agent-framework/) where agents process tasks in a fixed order, [concurrent workflows](https://ravichaganti.com/blog/concurrent-workflows-in-microsoft-agent-framework/) where agents work in parallel, [handoff workflows](https://ravichaganti.com/blog/handoff-workflows-in-microsoft-agent-framework/) where agents transfer control based on context, and [group chat workflows](https://ravichaganti.com/blog/group-chat-workflows-in-microsoft-agent-framework/) where agents engage in turn-based discussions. Each pattern has its strengths, but they all share one limitation: the orchestration logic is predetermined at design time.

What if you need a workflow that can adapt its routing decisions based on what agents discover during execution? Enter Magentic workflows, the most sophisticated orchestration pattern in MAF, where an LLM-powered manager autonomously coordinates specialized agents, making real-time decisions about who to invoke next based on intermediate results.

## The Problem: Static Orchestration Isn't Always Enough

Consider a complex task like investment due diligence. A sequential workflow might work: research the company, analyze financials, assess risks, write a report. But what happens when the risk assessment reveals concerning findings? In a static workflow, you'd proceed to the report anyway. In reality, you'd want to go back and dig deeper into those risks before making a recommendation.

This is where magentic workflows shine. They enable:

- **Dynamic routing**: The manager decides which agent to invoke based on the current state of the conversation
- **Conditional branching**: Different paths through the workflow based on intermediate results
- **Feedback loops**: The ability to revisit earlier agents when new information warrants it
- **Autonomous coordination**: The LLM manager handles the orchestration logic without explicit programming

## What is a Magentic Workflow?

A magentic workflow consists of two key components:

1. **Participant agents**: Specialized agents, each with distinct tools and expertise
2. **Manager agent**: An LLM-powered orchestrator that plans the task, selects which agent to invoke, monitors progress, and determines when to complete or replan

Unlike group chat where agents take turns based on a selection function you define, magentic workflows delegate the entire orchestration decision to the manager LLM. The manager maintains a "task ledger" tracking facts discovered, the current plan, and progress toward completion.

## Example: Investment Due Diligence Workflow

Let's build a practical example that demonstrates the power of magentic orchestration. We'll create an investment research workflow with four specialized agents:

| Agent | Role | Tools |
|-------|------|-------|
| `MarketResearcher` | Gathers market context, news, analyst opinions | Web search, financial news |
| `FinancialAnalyst` | Analyzes fundamentals and financial health | Yahoo Finance API, Python |
| `RiskAssessor` | Evaluates risks and assigns a risk score | Risk assessment |
| `InvestmentAdvisor` | Synthesizes findings into a recommendation | Report generation |

{{< figure src="/images/magentic-maf.png" >}}  {{< load-photoswipe >}}

Here's the key feature. If the `RiskAssessor` returns a high risk score (>7), the manager will loop back to the `MarketResearcher` for deeper investigation before proceeding to the final recommendation.

### Setting Up the Environment

First, install the required packages:

```bash
pip install agent-framework azure-identity tavily-python yfinance python-dotenv
```

Create a `.env` file with your configuration:

```
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
TAVILY_API_KEY=your-tavily-api-key
```

### Defining the Tools

Each agent needs specialized tools. Let's start with the research and analysis tools:

```python
from agent_framework import ai_function
from tavily import TavilyClient
import yfinance as yf
import os

tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

@ai_function
def search_web(query: str) -> str:
    """Search the web for general information about markets, companies, or trends."""
    result = tavily_client.search(query=query, max_results=5)
    return str(result)

@ai_function
def search_financial_news(company_or_topic: str) -> str:
    """Search for recent financial news, analyst opinions, and market sentiment."""
    query = f"{company_or_topic} stock news analyst rating 2024"
    result = tavily_client.search(query=query, max_results=5)
    return f"FINANCIAL NEWS for {company_or_topic}:\n{str(result)}"
```

The financial analysis tool uses Yahoo Finance to fetch real market data:

```python
@ai_function
def analyze_financials(ticker: str) -> str:
    """Get key financial metrics using Yahoo Finance."""
    try:
        stock = yf.Ticker(ticker.upper())
        info = stock.info

        name = info.get('longName', ticker)
        price = info.get('currentPrice', 'N/A')
        pe_ratio = info.get('trailingPE', 'N/A')
        profit_margin = info.get('profitMargins', 'N/A')
        market_cap = info.get('marketCap', 'N/A')

        # Format market cap
        if isinstance(market_cap, (int, float)):
            if market_cap >= 1e12:
                market_cap = f"${market_cap/1e12:.2f}T"
            elif market_cap >= 1e9:
                market_cap = f"${market_cap/1e9:.2f}B"

        result = f"""FINANCIAL ANALYSIS for {name} ({ticker.upper()})
{'=' * 50}
- Current Price: ${price}
- Market Cap: {market_cap}
- P/E Ratio: {pe_ratio}
- Profit Margin: {profit_margin * 100:.1f}% if profit_margin else 'N/A'
"""
        # Add risk flags for unprofitable companies
        if profit_margin and profit_margin < 0:
            result += "\nRISK FLAG: Company is UNPROFITABLE (negative margins)"

        return result
    except Exception as e:
        return f"Error fetching data for {ticker}: {str(e)}"
```

The risk assessment tool is where the conditional logic lives:

```python
@ai_function
def assess_risk(analysis_summary: str) -> str:
    """Evaluate investment risks and return a risk score (1-10)."""
    summary_lower = analysis_summary.lower()

    risk_score = 3  # Base score
    risk_factors = []

    # Check for high-risk indicators
    if "unprofitable" in summary_lower or "negative margin" in summary_lower:
        risk_score += 3
        risk_factors.append("Company is not profitable - high cash burn risk")

    if "biotech" in summary_lower or "clinical" in summary_lower:
        risk_score += 2
        risk_factors.append("Clinical stage biotech - binary FDA approval risk")

    if "crypto" in summary_lower or "bitcoin" in summary_lower:
        risk_score += 2
        risk_factors.append("High volatility asset - significant drawdown risk")

    risk_score = max(1, min(10, risk_score))

    result = f"""RISK ASSESSMENT
===============
RISK SCORE: {risk_score}/10 {"[HIGH RISK]" if risk_score > 7 else "[Moderate]" if risk_score > 4 else "[Low Risk]"}

RISK FACTORS IDENTIFIED:
"""
    for i, factor in enumerate(risk_factors, 1):
        result += f"{i}. {factor}\n"

    # This message triggers the feedback loop
    if risk_score > 7:
        result += f"""
HIGH RISK ALERT: Risk score exceeds threshold.
RECOMMEND: Request MarketResearcher to conduct deeper research on: {risk_factors[0]}
"""

    return result
```

### Creating the Specialized Agents

Now we create four agents, each with distinct instructions and tools:

```python
from agent_framework.azure import AzureOpenAIChatClient
from azure.identity import DefaultAzureCredential

chat_client = AzureOpenAIChatClient(
    credential=DefaultAzureCredential(),
)

# Market Researcher - gathers context and news
market_researcher = chat_client.create_agent(
    name="MarketResearcher",
    instructions="""You are a market research analyst.

YOUR ROLE:
- Gather market context, industry trends, and competitive landscape
- Find recent news and analyst opinions
- Identify market sentiment and catalysts

Use search_web for broad context and search_financial_news for recent analyst takes.
If asked to do a "deep dive" on specific risks, focus your search on those factors.""",
    tools=[search_web, search_financial_news],
)

# Financial Analyst - evaluates fundamentals
financial_analyst = chat_client.create_agent(
    name="FinancialAnalyst",
    instructions="""You are a financial analyst specializing in fundamental analysis.

YOUR ROLE:
- Analyze financial metrics (P/E, margins, growth, debt)
- Evaluate company fundamentals and financial health
- Be objective about both strengths and weaknesses""",
    tools=[analyze_financials],
)

# Risk Assessor - identifies and scores risks
risk_assessor = chat_client.create_agent(
    name="RiskAssessor",
    instructions="""You are a risk management specialist.

YOUR ROLE:
- Evaluate investment risks based on gathered information
- Assign a risk score from 1-10
- Identify specific risk factors

CRITICAL: If risk score > 7, recommend deeper research before final recommendation.""",
    tools=[assess_risk],
)

# Investment Advisor - synthesizes final recommendation
investment_advisor = chat_client.create_agent(
    name="InvestmentAdvisor",
    instructions="""You are a senior investment advisor.

THIS IS THE FINAL STEP - After you complete your work, the task is DONE.

YOUR ROLE:
- Synthesize all research into a recommendation: BUY / HOLD / SELL / AVOID
- Save the final report using save_report tool
- After saving, confirm "TASK COMPLETE - Report saved successfully" """,
    tools=[save_report],
)
```

### Creating the Manager Agent

The manager agent is the brain of the magentic workflow. Its instructions define how agents are coordinated:

```python
manager_agent = chat_client.create_agent(
    name="InvestmentManager",
    instructions="""You are the Investment Due Diligence Manager.

YOUR TEAM:
- MarketResearcher: Gathers market context, news, analyst opinions
- FinancialAnalyst: Analyzes fundamentals, metrics, financial health
- RiskAssessor: Evaluates risks, assigns risk score (1-10)
- InvestmentAdvisor: Synthesizes findings and saves final report

WORKFLOW:
1. MarketResearcher - gather market context and news
2. FinancialAnalyst - analyze fundamentals
3. RiskAssessor - evaluate risks and get risk score

4. DECISION POINT (if risk score > 7):
   - Request ONE deep dive from MarketResearcher on the main risk
   - Then proceed to step 5

5. InvestmentAdvisor - synthesize and save final report

TERMINATION:
- The task is COMPLETE when InvestmentAdvisor confirms "Report saved"
- Do NOT call any more agents after InvestmentAdvisor completes"""
)
```

Notice how the manager's instructions encode the conditional logic: "if risk score > 7, request ONE deep dive." This is the power of magentic. The routing logic is expressed in natural language and interpreted by the LLM.

### Building the Workflow

With all components defined, we build the magentic workflow using `MagenticBuilder`:

```python
from agent_framework import MagenticBuilder

workflow = (
    MagenticBuilder()
    .participants(
        market_researcher=market_researcher,
        financial_analyst=financial_analyst,
        risk_assessor=risk_assessor,
        investment_advisor=investment_advisor,
    )
    .with_standard_manager(
        agent=manager_agent,
        max_round_count=15,   # Maximum orchestration rounds
        max_stall_count=3,    # Replan after this many stalls
    )
    .build()
)
```

Key configuration options:

- **`max_round_count`**: Limits total orchestration rounds to prevent infinite loops
- **`max_stall_count`**: If no progress is made for this many rounds, the manager replans

### Running and Monitoring the Workflow

Execute the workflow and observe the orchestration events:

```python
from agent_framework import (
    WorkflowOutputEvent,
    ExecutorInvokedEvent,
    ExecutorCompletedEvent,
    WorkflowStatusEvent,
    WorkflowRunState,
)
import asyncio

async def main():
    task = "Evaluate investing in Beam Therapeutics (BEAM), a small-cap biotech company."

    agent_sequence = []

    async for event in workflow.run_stream(task):
        if isinstance(event, ExecutorInvokedEvent):
            agent_sequence.append(event.executor_id)
            print(f">> Invoking: {event.executor_id}")

        elif isinstance(event, ExecutorCompletedEvent):
            print(f"   Completed: {event.executor_id}")

        elif isinstance(event, WorkflowStatusEvent):
            if event.state == WorkflowRunState.IDLE:
                print(f"\nWorkflow completed!")
                print(f"Agent sequence: {' -> '.join(agent_sequence)}")

        elif isinstance(event, WorkflowOutputEvent):
            print(f"\nFinal output received")

asyncio.run(main())
```

### Observing Dynamic Routing in Action

When we run this workflow with a high-risk biotech stock like BEAM, here's what happens:

```
>> Invoking: magentic_orchestrator
   Completed: magentic_orchestrator
>> Invoking: agent_market_researcher
   Completed: agent_market_researcher
>> Invoking: magentic_orchestrator
   Completed: magentic_orchestrator
>> Invoking: agent_financial_analyst
   Completed: agent_financial_analyst
>> Invoking: magentic_orchestrator
   Completed: magentic_orchestrator
>> Invoking: agent_risk_assessor
   Completed: agent_risk_assessor
>> Invoking: magentic_orchestrator        <- Manager sees high risk score
   Completed: magentic_orchestrator
>> Invoking: agent_market_researcher      <- LOOPS BACK for deep dive!
   Completed: agent_market_researcher
>> Invoking: magentic_orchestrator
   Completed: magentic_orchestrator
>> Invoking: agent_investment_advisor     <- Now proceeds to final step
   Completed: agent_investment_advisor

Workflow completed!
Agent sequence: orchestrator -> market_researcher -> orchestrator ->
               financial_analyst -> orchestrator -> risk_assessor ->
               orchestrator -> market_researcher -> orchestrator ->
               investment_advisor
```

Notice the feedback loop: after the risk assessor returns a high score, the manager autonomously decides to invoke the market researcher again for deeper research on the identified risks. This adaptive behavior is impossible with static workflow patterns.

Compare this to a low-risk stock like Microsoft (MSFT), where the workflow proceeds directly without the feedback loop:

```
orchestrator -> market_researcher -> orchestrator -> financial_analyst ->
orchestrator -> risk_assessor -> orchestrator -> investment_advisor
```

The same workflow code produces different execution paths based on the data discovered during execution.

## How Magentic Differs from Other Patterns

| Pattern | Orchestration | Routing Logic | Use Case |
|---------|--------------|---------------|----------|
| Sequential | Fixed order | Predetermined | Pipelines with known steps |
| Concurrent | Parallel execution | Fan-out/fan-in | Independent subtasks |
| Handoff | Agent-to-agent transfer | Explicit handoff calls | Escalation, specialization |
| Group Chat | Turn-based | Selection function | Brainstorming, debate |
| Magentic | LLM manager | Dynamic, adaptive | Complex tasks with conditional logic |

Magentic is the most flexible but also the most resource-intensive pattern. The manager LLM is invoked between every agent execution to evaluate progress and decide the next step. Use it when:

- The workflow requires conditional branching based on intermediate results
- You need feedback loops for iterative refinement
- The optimal sequence of agents isn't known at design time
- Task complexity warrants the overhead of LLM-based orchestration

Magentic workflows represent the most sophisticated orchestration pattern in MAF, bridging the gap between rigid automation and truly autonomous multi-agent systems. When your task requires adaptive decision-making that can't be predetermined, magentic is the pattern to reach for.

