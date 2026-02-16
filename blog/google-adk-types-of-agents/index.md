# Google ADK - types of agents


In the introduction to Google ADK, we looked at the basics of using ADK to create an agent, connect tools, and also learnt how to define agents using the declarative YAML configuration. The example we implemented used the `Agent` class. This class is an alias of the `LlmAgent` class. `LlmAgent` behavior is non-deterministic as it uses an LLM for deciding what tools to use or how to proceed toward a goal. ADK also offers [workflow agents](https://google.github.io/adk-docs/agents/workflow-agents/) that are more deterministic, control the execution flow of their sub-agents, and operate according to predefined logic. The execution flow of workflow agents depends on their type. 

In this article today, we will review different agent types.

## LlmAgent

We have seen a detailed example of using an `Agent` or `LlmAgent` in the earlier part of this series. Let us revisit `LlmAgent` and understand how this agent type deals with sub-agents. To demonstrate this, we will build a code tutor agent with two sub-agents: a code generator and a code reviewer.

```python
from google.adk.agents.llm_agent import LlmAgent

code_generator_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='code_generator',
    description='Agent that generates code based on user requirements.',
    instruction='''
    You are a code generator only and NOT a reviewer. Generate code based on the user's requirements.
    Ensure that the code is well-commented and follows best practices.
    Wrap the code in markdown format for better readability.
    ''',
)

code_reviewer_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='code_reviewer',
    description='Agent that reviews code and provides feedback.',
    instruction='''
    You are a code reviewer. Review the provided code and provide constructive feedback.
    Suggest improvements and best practices to enhance the code quality.
    ''',
)

root_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='code_tutor',
    description='Code tutor agent that can help generate or review code.',
    instruction='''
    You are an expert code tutor that can help a learner generate or review code in any programming language.
    For generating code, use only the code_generator_agent.
    For reviewing code, use only the code_reviewer_agent.
    Always decide which sub-agent to use based on the user's request.
    ''',
    sub_agents = [code_generator_agent, code_reviewer_agent],
)
```

In the preceding example, we have three agents. The `code_generator_agent` can generate code in any language, the `code_reviewer_agent` reviews code written in any language, and the `code_tutor` agent chooses and orchestrates the right agent based on the user prompt.

````shell
(.venv) PS C:\GitHub\google-adk-101> adk run .\code_tutor\

Running agent code_tutor, type exit to exit.
[user]: Write a Hello, World program in Python and review it for any enhancements.

[code_generator]: ```python
# hello_world.py

def greet():
    """
    This function prints the classic "Hello, World!" message to the console.
    """
    print("Hello, World!")

if __name__ == "__main__":
    # Call the greet function when the script is executed directly
    greet()
```

Now, I will transfer this to the `code_reviewer` agent for any potential enhancements.

[code_reviewer]: This is a well-structured and excellent "Hello, World!" program in Python! Here's a review with some feedback, mostly reinforcing the good practices already in place:

**Strengths and Best Practices Observed:**

1.  **Function Encapsulation (`greet()`):** You've correctly encapsulated the "Hello, World!" logic within a function. This promotes modularity, reusability, and makes the code easier to read and test.
2.  **Docstrings:** The `greet()` function includes a clear and concise docstring. This is a best practice for documenting what functions do, which is invaluable for code maintainability and understanding, especially in larger projects.
3.  **`if __name__ == "__main__":` Block:** This is a crucial Python best practice. It ensures that the `greet()` function is only called when the script is executed directly (e.g., `python hello_world.py`). If this file were imported as a module into another script, the `greet()` function would not be automatically executed, preventing unintended side effects.
4.  **Readability:** The code is very clean, straightforward, and easy to understand.

**Potential Enhancements (Minor/General Best Practices):**

For this specific "Hello, World!" program, your code is already highly optimized and follows best practices. There isn't much to "enhance" without making it overly complex. However, for future reference in more complex applications, you might consider:

1.  **Type Hinting (for more complex functions):** While not applicable here as `greet()` takes no arguments and implicitly returns `None`, for functions that accept parameters or return values, adding type hints can improve code readability, help catch errors during development with static analysis tools (like MyPy), and serve as self-documentation.

    *Example of type hinting (not for your current `greet` function, but for illustration):*

    ```python
    def greet_person(name: str) -> str:
        """
        Greets a person by name.
        """
        return f"Hello, {name}!"

    # print(greet_person("Alice"))
    ```

**Conclusion:**

Your "Hello, World!" program is very well-written, adheres to Pythonic best practices, and is a perfect example for its purpose. Great job!
[user]: 
````

Given the prompt, the `code_tutor` agent first transfers control to the `code_generator_agent`, then to the `code_reviewer_agent`, for review of the generated code for any improvements. The `code_tutor` agent is still non-deterministic because it uses an LLM to choose which agent to transfer to.

## Workflow agents

Another category of agents that ADK offers is the workflow agents. Workflow agents offer a deterministic execution flow. In the earlier example, an `LlmAgent` orchestrated the workflow based on the prompt. Workflow agents use a predefined logic to orchestrate the sub-agents. With this type of agent, an LLM is not needed to determine the execution order; rather, the agent's type determines the execution flow. 

There are three types of workflow agents.

### Sequential Agent

As the name suggests, this type of agent executes sub-agents in a sequence, in the order they are specified. Let us look at an example.

```python
from google.adk.agents import LlmAgent, SequentialAgent

code_generator_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='code_generator',
    description='Agent that generates code based on user requirements.',
    instruction='''
    You are a code generator only and NOT a reviewer. Generate code based on the user's requirements.
    Ensure that the code is well-commented and follows best practices.
    Wrap the code in markdown format for better readability.
    ''',
)

code_reviewer_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='code_reviewer',
    description='Agent that reviews code and provides feedback.',
    instruction='''
    You are a code reviewer. Review the provided code and provide constructive feedback.
    Suggest improvements and best practices to enhance the code quality.
    ''',
)

root_agent = SequentialAgent(
    name='code_tutor',
    description='Code tutor agent that can help generate or review code.',
    sub_agents = [code_generator_agent, code_reviewer_agent],
)
```

This [sequential agent](https://google.github.io/adk-docs/agents/workflow-agents/sequential-agents/) is similar to the previous example. It is a code tutor. In the previous example, a sub-agent was chosen based on the user prompt. Depending on the prompt, either or both agents get executed. With a sequential agent, both agents are executed in the order specified in the `sub_agents` list.

{{< figure src="/images/adk-seq-agent.png" >}}  {{< load-photoswipe >}}

````shell
(.venv) PS C:\GitHub\google-adk-101> adk run .\code_tutor\
Running agent code_tutor, type exit to exit.

[user]: Write a Hello, World program in Python.
[code_generator]: ```python
# This is a simple Python program that prints "Hello, World!" to the console.

def hello_world():
  """
  Prints the classic "Hello, World!" message.
  """
  print("Hello, World!")

# The entry point of the program.
if __name__ == "__main__":
  # Call the function to display the message.
  hello_world()
```
[code_reviewer]: This is a well-written "Hello, World!" program that goes beyond the absolute minimum to demonstrate good programming practices.

Here's a review:

**Positive Aspects:**

1.  **Readability:** The code is extremely clear, easy to understand, and well-commented.
2.  **Function Definition (`hello_world()`):** Encapsulating the print statement within a function is excellent practice. Even for a single line, it promotes modularity and makes the code reusable and testable.
3.  **Docstring:** The function includes a clear docstring, which is crucial for explaining the purpose of functions, especially in larger projects.
4.  **`if __name__ == "__main__":` block:** This is a fundamental Python best practice. It ensures that the `hello_world()` function is only called when the script is executed directly, not when it's imported as a module into another script. This makes your code reusable.        
5.  **Comments:** The comments explain the purpose of the program and the entry point clearly, which is helpful for beginners or anyone new to the codebase.

**Suggestions for Improvement (Minor and Contextual):**

For a program of this simplicity, there's very little to "improve" as it already follows best practices. However, here are some points to consider for more complex scenarios:

1.  **Type Hinting (Advanced but good to know):** For functions that take arguments or return values, adding type hints improves code clarity and allows for static analysis tools (like MyPy) to catch potential errors.
    *   *Example (if `hello_world` were to return a string):*
        ```python
        def hello_world() -> str:
            """
            Returns the classic "Hello, World!" message.
            """
            return "Hello, World!"

        if __name__ == "__main__":
            message = hello_world()
            print(message)
        ```
    *   For the current `hello_world()` that just prints and implicitly returns `None`, type hints aren't strictly necessary but could be added as `def hello_world() -> None:`. However, for such a simple function, this might be considered overkill by some.

2.  **Minimalism vs. Best Practices:** While the current code demonstrates excellent practices, the *absolute most minimal* "Hello, World!" would just be `print("Hello, World!")`. The provided code wisely prioritizes good structure over extreme minimalism, which is commendable.  

**Conclusion:**

This is an excellent example of a "Hello, World!" program. It's not just functional, but also showcases fundamental Python best practices like modularity, documentation, and proper script execution. Well done!
[user]: 
````

[Sequential agents](https://google.github.io/adk-docs/agents/workflow-agents/sequential-agents/), any workflow agent for that matter, do not require an LLM, as they simply orchestrate the task using sub-agents in a predefined order.

The second type of workflow agent is a [parallel agent](https://google.github.io/adk-docs/agents/workflow-agents/parallel-agents/).

### Parallel Agent

A parallel agent executes its sub-agents concurrently. Let us look at an example to understand this.

```python
from google.adk.agents import LlmAgent, SequentialAgent, ParallelAgent

code_generator_agent_g25 = LlmAgent(
    model='gemini-2.5-flash',
    name='code_generator_g25',
    description='Agent that generates code based on user requirements.',
    instruction='''
    You are a code generator only and NOT a reviewer. Generate code based on the user's requirements.
    Ensure the code is well commented and follows best practices.
    Wrap the code in markdown format for better readability.
    ''',
    output_key='g25_code'
)

code_generator_agent_g30 = LlmAgent(
    model='gemini-3-flash-preview',
    name='code_generator_g30',
    description='Agent that generates code based on user requirements.',
    instruction='''
    You are a code generator only and NOT a reviewer. Generate code based on the user's requirements.
    Ensure that the code is well-commented and follows best practices.
    Wrap the code in markdown format for better readability.
    ''',
    output_key='g30_code'
)

parallel_code_generator = ParallelAgent(
    name='parallel_code_generator',
    description='Parallel agent to generate code using different models.',
    sub_agents=[code_generator_agent_g25, code_generator_agent_g30],
)

code_reviewer_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='code_reviewer',
    description='Agent that reviews code and provides feedback.',
    instruction='''
    You are a code reviewer. Review and compare the code by the two code generator agents and select the best one.
    code_generator_agent_g25 output {g25_code}.
    code_generator_agent_g30 output {g30_code}. 
    
    Explain the reasons for your selection.
    ''',
)

root_agent = SequentialAgent(
    name='code_tutor',
    description='Code tutor agent that can help generate or review code.',
    sub_agents = [parallel_code_generator, code_reviewer_agent],
)
```

This example uses the parallel agent construct to generate code for the same prompt with two different models. The `code_generator_agent_g25` uses Gemini 2.5 Flash, and Gemini 3.0 Flash is used by the `code_generator_agent_g30` agent.

{{< figure src="/images/adk_parallel_agent.png" >}}

This example implements output keys to save the agent's response directly into the [session's state](https://google.github.io/adk-docs/sessions/state/). We will learn more about this later. For now, understand that you can specify the `output_key` within the `LlmAgent` definition to specify the key used to retrieve an agent's response within a session. This example also implements a sequential agent that combines the parallel agent with the `code_reviewer_agent` to select the best code. The `code_reviewer_agent` receives the output from the parallel agent and takes an action based on its instructions. The output keys defined in the code generator agents are specified within the reviewer agent's instructions.

````shell
PS C:\GitHub\google-adk-101> adk run .\code_tutor\
Running agent code_tutor, type exit to exit.

[user]: Write a program to determine LCM of two numbers.

[code_generator_g25]: To determine the Least Common Multiple (LCM) of two numbers, we can use the relationship between LCM and the Greatest Common Divisor (GCD) of the two numbers. The formula is:

`LCM(a, b) = |a * b| / GCD(a, b)`

First, we need a function to calculate the GCD, which can be efficiently done using the Euclidean algorithm.

```python
import math

def gcd(a: int, b: int) -> int:
    """
    Calculates the Greatest Common Divisor (GCD) of two non-negative integers
    using the Euclidean algorithm.

    Args:
        a (int): The first integer.
        b (int): The second integer.

    Returns:
        int: The Greatest Common Divisor of a and b.
    """
    # The math.gcd function in Python's standard library
    # already implements the Euclidean algorithm efficiently.
    return math.gcd(a, b)

def lcm(a: int, b: int) -> int:
    """
    Calculates the Least Common Multiple (LCM) of two integers.

    The formula used is: LCM(a, b) = |a * b| / GCD(a, b).
    Handles edge cases where one or both numbers might be zero.
    The LCM of any number and zero is considered zero.

    Args:
        a (int): The first integer.
        b (int): The second integer.

    Returns:
        int: The Least Common Multiple of a and b.
    """
    if a == 0 or b == 0:
        return 0 # LCM of any number with 0 is 0

    # Calculate the absolute product to handle negative inputs correctly,
    # though LCM is typically defined for positive integers.
    # If a and b are non-zero, their GCD will be non-zero.
    # We use abs() to ensure the result is positive, as LCM is
    # conventionally a positive value.
    return abs(a * b) // gcd(a, b)

# --- Main part of the program ---
if __name__ == "__main__":
    print("--- LCM Calculator ---")

    # Example 1: Positive integers
    num1_a = 4
    num1_b = 6
    result1 = lcm(num1_a, num1_b)
    print(f"The LCM of {num1_a} and {num1_b} is: {result1}") # Expected: 12

    # Example 2: Another pair of positive integers
    num2_a = 15
    num2_b = 20
    result2 = lcm(num2_a, num2_b)
    print(f"The LCM of {num2_a} and {num2_b} is: {result2}") # Expected: 60

    # Example 3: Prime numbers
    num3_a = 7
    num3_b = 11
    result3 = lcm(num3_a, num3_b)
    print(f"The LCM of {num3_a} and {num3_b} is: {result3}") # Expected: 77

    # Example 4: One number is a multiple of the other
    num4_a = 8
    num4_b = 16
    result4 = lcm(num4_a, num4_b)
    print(f"The LCM of {num4_a} and {num4_b} is: {result4}") # Expected: 16

    # Example 5: One of the numbers is zero
    num5_a = 0
    num5_b = 10
    result5 = lcm(num5_a, num5_b)
    print(f"The LCM of {num5_a} and {num5_b} is: {result5}") # Expected: 0

    # Example 6: Both numbers are zero
    num6_a = 0
    num6_b = 0
    result6 = lcm(num6_a, num6_b)
    print(f"The LCM of {num6_a} and {num6_b} is: {result6}") # Expected: 0

    # Example 7: User input
    try:
        user_num1 = int(input("\nEnter the first number: "))
        user_num2 = int(input("Enter the second number: "))
        user_lcm = lcm(user_num1, user_num2)
        print(f"The LCM of {user_num1} and {user_num2} is: {user_lcm}")
    except ValueError:
        print("Invalid input. Please enter integers only.")
    except Exception as e:
        print(f"An error occurred: {e}")
```

[code_generator_g30]: This program calculates the Least Common Multiple (LCM) of two numbers using the relationship between the Greatest Common Divisor (GCD) and the LCM. The formula used is:
`LCM(a, b) = abs(a * b) / GCD(a, b)`.

```python
def calculate_gcd(a: int, b: int) -> int:
    """
    Calculates the Greatest Common Divisor (GCD) using the Euclidean Algorithm.

    Args:
        a (int): First integer.
        b (int): Second integer.

    Returns:
        int: The greatest common divisor of a and b.
    """
    while b:
        a, b = b, a % b
    return a

def calculate_lcm(a: int, b: int) -> int:
    """
    Calculates the Least Common Multiple (LCM) of two numbers.

    Args:
        a (int): First integer.
        b (int): Second integer.

    Returns:
        int: The least common multiple of a and b.
    """
    # LCM of 0 and any number is 0
    if a == 0 or b == 0:
        return 0

    # Using the formula: LCM(a, b) = |a * b| / GCD(a, b)
    # We use integer division (//) to ensure the result is an integer
    return abs(a * b) // calculate_gcd(a, b)

def main():
    """
    Main function to handle user input and display the result.
    """
    print("--- LCM Calculator ---")

    try:
        # Prompt user for input
        num1 = int(input("Enter the first number: "))
        num2 = int(input("Enter the second number: "))

        # Calculate LCM
        result = calculate_lcm(num1, num2)

        # Display the result
        print(f"The LCM of {num1} and {num2} is: {result}")

    except ValueError:
        print("Invalid input! Please enter integer values.")

if __name__ == "__main__":
    main()
```

### Key Features of this Implementation:
1.  **Efficiency**: It uses the Euclidean Algorithm to find the GCD first, which is much faster than iterating through multiples for large numbers.
2.  **Robustness**: It handles cases involving zero (LCM with zero is zero).
3.  **Best Practices**:
    *   Uses **type hinting** (`a: int`) for better code clarity.
    *   Includes a `try-except` block to handle non-integer user inputs gracefully.
    *   Modularizes logic into specific functions (`calculate_gcd`, `calculate_lcm`, and `main`).
    *   Uses the `if __name__ == "__main__":` block to allow the script to be imported without executing the main logic immediately.

[code_reviewer]: I will compare the two code submissions and select the better one based on clarity, efficiency, correctness, robustness, and adherence to best practices.

### Review of `code_generator_agent_g25`

**Pros:**
1.  **Leverages Standard Library:** It correctly identifies and utilizes `math.gcd` for calculating the Greatest Common Divisor. This is a significant advantage as `math.gcd` is highly optimized, reliable, and generally preferred over a custom implementation in production code.
2.  **Clear Functionality:** The `lcm` function is concise and correctly implements the formula `LCM(a, b) = |a * b| / GCD(a, b)`, handling the zero case (`LCM(x, 0) = 0`).
3.  **Comprehensive Examples:** The `if __name__ == "__main__":` block includes a wide range of example test cases (positive integers, prime numbers, multiples, zero inputs) that clearly demonstrate the function's behavior and correctness. This is excellent for testing and understanding.
4.  **Robust Error Handling:** The user input section includes `try-except` blocks for `ValueError` (for non-integer input) and a general `Exception` for other unexpected errors.
5.  **Good Docstrings and Type Hinting:** Clear docstrings explain the purpose, arguments, and return values, and type hints are used effectively.

**Cons:**
1.  The `gcd` function is essentially a wrapper around `math.gcd`. While it adds a docstring, it could potentially be omitted, and `math.gcd` called directly within `lcm` to reduce one level of indirection, or its docstring could mention it's a wrapper. However, having a dedicated `gcd` function is not a significant drawback.

### Review of `code_generator_agent_g30`

**Pros:**
1.  **Correct Logic:** Both `calculate_gcd` and `calculate_lcm` functions are logically correct and implement the Euclidean algorithm and the LCM formula accurately.
2.  **Good Structure:** It separates the GCD, LCM, and main execution logic into distinct functions (`calculate_gcd`, `calculate_lcm`, `main`).
3.  **Robustness for Zero:** Correctly handles the LCM of zero with any number.
4.  **Good Docstrings and Type Hinting:** Similar to g25, it uses clear docstrings and type hints.
5.  **Error Handling:** Includes a `try-except` block for `ValueError` in user input.

**Cons:**
1.  **Manual GCD Implementation:** While functionally correct, reimplementing the Euclidean algorithm when `math.gcd` is readily available in the standard library is generally less efficient and less Pythonic. `math.gcd` is implemented in C and is typically faster.
2.  **Limited Examples:** The `main` function focuses solely on user input and does not provide pre-defined example test cases. This makes it less immediately illustrative compared to g25's comprehensive examples.
3.  **Less Comprehensive Error Handling:** Only handles `ValueError` for user input, whereas g25 also catches a broader `Exception`.

### Conclusion

Both agents provide valid and correct solutions for calculating the LCM. However, `code_generator_agent_g25` stands out as the superior choice due to the following reasons:

1.  **Efficiency and Best Practice (GCD):** `g25` correctly utilizes the `math.gcd` function from Python's standard library. This is the recommended approach as it's optimized, tested, and reliable. `g30` re-implements the Euclidean algorithm, which, while correct, is unnecessary when a superior built-in option exists.
2.  **Demonstrative Examples:** `g25` includes a wide array of test cases in its `if __name__ == "__main__":` block, covering various scenarios including edge cases (like zero inputs). These examples are invaluable for understanding how the function behaves, for verification, and for demonstrating its robustness. `g30` only includes user input, lacking these illustrative examples.
3.  **Robust Error Handling:** `g25` includes a more comprehensive error handling block in its `main` function (`except ValueError` and `except Exception`), making it slightly more robust.

**The best code is generated by `code_generator_agent_g25`.**
[user]: 
````

The third type of workflow agent is the [loop agent](https://google.github.io/adk-docs/agents/workflow-agents/loop-agents/).

### Loop Agent

A loop agent repeatedly runs a sequence of agents for a specified number of iterations or until a stop condition is met. We can refine our earlier examples to add a review-refine loop to code generation. Let us look at the example.

```python
from google.adk.agents import LlmAgent, SequentialAgent, LoopAgent

code_generator_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='code_generator',
    description='Agent that generates code based on user requirements.',
    instruction='''
    You are a code generator only and NOT a reviewer. Generate code based on the user's requirements.
    Ensure that the code is well-commented and follows best practices.
    Output code only and wrap the code in markdown format for better readability.
    ''',
    output_key='generated_code',
)

code_reviewer_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='code_reviewer',
    description='Agent that reviews code and provides feedback.',
    instruction='''
    You are a code reviewer. Review the code generated by the code generator.
    Generate code:
    {generated_code}
    Provide constructive feedback and suggest improvements. Do not generate the code yourself.
    ''',
    output_key='review_feedback',
)

code_refiner_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='code_refiner',
    description='Agent that refines code based on feedback.',
    instruction='''
    You are a code refiner. You must consider the feedback provided by the code reviwer agent and respond with refined code.
    Code to update:
    {generated_code}

    Review feedback:
    {review_feedback}

    Ensure that the code is well-commented and follows best practices.
    Output code only and wrap the code in markdown format for better readability.
    ''',
    output_key='generated_code',
)

loop_agent = LoopAgent(
    name='parallel_code_generator',
    description='Parallel agent to generate code using different models.',
    sub_agents=[code_reviewer_agent,code_refiner_agent],
    max_iterations=3,
)

root_agent = SequentialAgent(
    name='code_tutor_agent',
    description='An agent that generates, reviews, and refines code based on user requirements.',
    sub_agents=[code_generator_agent, loop_agent],
)
```

{{< figure src="/images/adk_loop_agent.png" >}}

In this example, a loop agent is defined to iterate between the review and refine process. The initial code generation is performed by the code_generator_agent, and then the review-refine loop refines the code. This loop runs for maximum iterations as specified by the `max_iterations` property in the `LoopAgent` definition.

````shell
PS C:\GitHub\google-adk-101> adk run .\code_tutor\
[user]: Write a program to determine GCD of two numbers.

[code_generator]: ```python
def gcd(a, b):
    """
    Calculates the Greatest Common Divisor (GCD) of two non-negative integers
    using the Euclidean algorithm.

    The Euclidean algorithm is an efficient method for computing the
    greatest common divisor (GCD) of two integers (numbers), the largest
    number that divides them both without a remainder.

    Args:
        a (int): The first non-negative integer.
        b (int): The second non-negative integer.

    Returns:
        int: The Greatest Common Divisor (GCD) of a and b.
    """
    # Ensure both numbers are non-negative. If negative inputs are provided,
    # the absolute values are used, as GCD is typically defined for positive integers.
    a = abs(a)
    b = abs(b)

    # The Euclidean algorithm works by repeatedly applying the division algorithm
    # until the remainder is 0. The GCD is the last non-zero remainder.
    # In each step, we replace the larger number with the smaller number,
    # and the smaller number with the remainder of the division.
    while b:
        # The line 'a, b = b, a % b' simultaneously updates 'a' and 'b'.
        # 'a' takes the previous value of 'b'.
        # 'b' takes the remainder of 'a' divided by 'b'.
        a, b = b, a % b

    # When 'b' becomes 0, 'a' holds the GCD.
    return a

# --- Example Usage ---
if __name__ == "__main__":
    print("--- GCD Calculator ---")

    # Test cases
    num1 = 48
    num2 = 18
    result = gcd(num1, num2)
    print(f"The GCD of {num1} and {num2} is: {result}") # Expected: 6

    num1 = 101
    num2 = 103
    result = gcd(num1, num2)
    print(f"The GCD of {num1} and {num2} is: {result}") # Expected: 1 (prime numbers)

    num1 = 60
    num2 = 24
    result = gcd(num1, num2)
    print(f"The GCD of {num1} and {num2} is: {result}") # Expected: 12

    num1 = 7
    num2 = 0
    result = gcd(num1, num2)
    print(f"The GCD of {num1} and {num2} is: {result}") # Expected: 7 (GCD(n, 0) = |n|)

    num1 = 0
    num2 = 0
    result = gcd(num1, num2)
    print(f"The GCD of {num1} and {num2} is: {result}") # Expected: 0 (GCD(0, 0) is usually defined as 0)

    num1 = -48
    num2 = 18
    result = gcd(num1, num2)
    print(f"The GCD of {num1} and {num2} is: {result}") # Expected: 6 (handles negative numbers by taking absolute value)

    # User input example
    try:
        user_num1 = int(input("\nEnter the first number: "))
        user_num2 = int(input("Enter the second number: "))
        user_result = gcd(user_num1, user_num2)
        print(f"The GCD of {user_num1} and {user_num2} is: {user_result}")
    except ValueError:
        print("Invalid input. Please enter integers only.")
```

[code_reviewer]: This is a very well-written and robust implementation of the Greatest Common Divisor (GCD) using the Euclidean algorithm. The code is clear, efficient, and handles various edge cases gracefully.

Here's a constructive review with minor suggestions for improvement:

**Positive Aspects:**

1.  **Correctness:** The `gcd` function correctly implements the Euclidean algorithm and produces the right results for all standard and edge cases (positive, zero, negative inputs).
....

**Suggestions for Improvement:**

1.  **Docstring Consistency (Minor):**
    *   The docstring states that `a` and `b` are "non-negative integers." However, the first two lines of the function `a = abs(a)` and `b = abs(b)` explicitly handle negative integers.
....

**Conclusion:**

The code is excellent. It's a complete, correct, and highly readable solution for calculating the GCD. The suggestions above are mostly stylistic or for added clarity/robustness in documentation, and do not detract from the quality of the core implementation.   

[code_refiner]: ```python
import math

def gcd(a: int, b: int) -> int:
    """
    Calculates the Greatest Common Divisor (GCD) of two integers using the Euclidean algorithm.

    The Euclidean algorithm is an efficient method for computing the
    greatest common divisor (GCD) of two integers (numbers), the largest
    number that divides them both without a remainder.
    Negative inputs are handled by taking their absolute values, as GCD is
    typically defined for non-negative integers.

    Args:
        a (int): The first integer.
        b (int): The second integer.

....
```

[code_reviewer]: The `code_refiner` has done an excellent job incorporating the previous feedback. This revised code is significantly improved and demonstrates best practices.

Here's a breakdown of the positive aspects and how the suggestions were addressed:

**Positive Aspects and Improvements:**

1.  **Comprehensive Docstring:** The docstring is now perfectly aligned with the function's behavior.
    *   It correctly states that `a` and `b` are `int` (any integer).
    *   It explicitly clarifies: "Negative inputs are handled by taking their absolute values, as GCD is typically defined for non-negative integers." This fully addresses the docstring consistency suggestion.
....
**Conclusion:**

This is an excellent piece of code. All previous feedback has been thoughtfully incorporated, leading to a robust, well-documented, and highly educational implementation of the GCD function. Great work!

[code_refiner]: ```python
"""
This module provides a custom implementation of the Greatest Common Divisor (GCD) function
using the Euclidean algorithm, along with example usage and comparison to Python's
built-in `math.gcd()` function. It's intended for educational purposes to demonstrate
the algorithm's logic.
"""
....
```

[code_reviewer]: This revised code is truly excellent and demonstrates a very high standard of Python programming and documentation. All previous feedback has been thoroughly addressed, resulting in a robust, clear, and highly educational module.
...
**Conclusion:**

This code is exceptionally well-written. It is correct, robust, highly readable, well-documented, and serves its educational purpose perfectly. There are no further improvements needed. This is an exemplary solution.

[code_refiner]: ```python
....
```
[user]: 
````

As you can see, the review-refine loop runs for 3 iterations and completes. The reviewer provided feedback in the second iteration itself that the refined code is excellent. However, the refiner continued to generate the code refinement. We can use the sub-agent's escalation to terminate the loop and avoid unnecessary iterations.

```python
from google.adk.agents import LlmAgent, SequentialAgent, LoopAgent
from google.adk.tools.tool_context import ToolContext

def exit_loop(tool_context: ToolContext):
  """Call this function ONLY when the reviewer indicates APPROVED, signaling the iterative process should end."""
  print(f"[Tool Call] exit_loop triggered by {tool_context.agent_name}")
  tool_context.actions.escalate = True
  tool_context.actions.skip_summarization = True
  return {}

code_generator_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='code_generator',
    description='Agent that generates code based on user requirements.',
    instruction='''
    You are a code generator only and NOT a reviewer. Generate code based on the user's requirements.
    Ensure that the code is well-commented and follows best practices.
    Output code only and wrap the code in markdown format for better readability.
    ''',
    output_key='generated_code',
)

code_reviewer_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='code_reviewer',
    description='Agent that reviews code and provides feedback.',
    instruction='''
    You are a code reviewer. Review the code generated by the code generator.
    Generate code:
    {generated_code}
    Provide constructive feedback and suggest improvements. Do not generate the code yourself.

    If the refined code is satisfactory, respond with "APPROVED" only and nothing else.
    Else, provide specific feedback on what needs to be improved.
    ''',
    output_key='review_feedback',
)

code_refiner_agent = LlmAgent(
    model='gemini-2.5-flash',
    name='code_refiner',
    description='Agent that refines code based on feedback.',
    instruction='''
    You are a code refiner. You must consider the feedback provided by the code reviwer agent and respond with refined code.
    Ensure that the code is well-commented and follows best practices.

    Code to update:
    {generated_code}

    Review feedback:
    {review_feedback}

    If the feedback is "APPROVED", you must call 'exit_loop' function and DO NOT output any code or text.
    Else output refined code only and wrap the code in markdown format for better readability.
    ''',
    tools=[exit_loop],
    output_key='generated_code',
)

loop_agent = LoopAgent(
    name='parallel_code_generator',
    description='Parallel agent to generate code using different models.',
    sub_agents=[code_reviewer_agent,code_refiner_agent],
    max_iterations=3,
)

root_agent = SequentialAgent(
    name='code_tutor_agent',
    description='An agent that generates, reviews, and refines code based on user requirements.',
    sub_agents=[code_generator_agent, loop_agent],
)
```

Taking a cue from the ADK documentation, the `exit_loop` is used to implement loop termination. To make this happen, we need a signal from the reviewer agent. This is done by modifying the instructions given to both the reviewer and refiner agents. When the code refined by the refiner is satisfactory, the reviewer will respond with a completion word or phrase. In this example, it is APPROVED. When the refiner agent receives a response from the reviewer that contains only the completion word or phrase, it will call the specified tool to terminate the loop. Within this function, `tool_context.actions.escalate = True` indicates that the control be escalated to a higher-level agent and `tool_context.actions.skip_summarization = True` indicates that there is no need to call the LLM to summarize the reviewer agent's response. 

````shell
PS C:\GitHub\google-adk-101> adk run .\code_tutor\
Running agent code_tutor_agent, type exit to exit.

[user]: Write a Python program to determine the factorial of a number.

[code_generator]: ```python
....
```

[code_reviewer]: The code is well-structured, easy to read, and includes good docstrings and comments. It correctly handles the base cases (n=0) and negative inputs, as well as non-integer inputs. The `__main__` block provides a robust user interface with input validation and error handling.

However, there's an opportunity to improve the separation of concerns within the `factorial` function itself.

**Feedback and Suggestions for Improvement:**
....

[code_refiner]: ```python
....
```

[code_reviewer]: APPROVED

  async for event in agen:
  [Tool Call] exit_loop triggered by code_refiner
[user]:
````

As you have seen in these examples, it is possible to combine different workflow agents into a single workflow. This comes in handy when you want to create complex agentic workflows using Google ADK. As we proceed in this series, we will explore several such examples. Stay tuned.






