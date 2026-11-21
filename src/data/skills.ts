// GENERATED from the public repository, not written by hand. Every string below
// was copied by script from github.com/objones25/my-skills at the commit named
// in `skillsSource`: README lines, script docstrings, SKILL.md excerpts, and the
// output of running each script on a small input. To refresh, rerun the
// research step and regenerate; do not edit quotes or numbers here.

export interface SkillDemo {
  command: string
  exitCode: number
  output: string
  // The file the command ran on, when it was written for this page.
  input?: { name: string; text: string }
  // The file the command ran on, when it ships in the repo.
  repoInput?: { name: string; href: string }
}

export interface SkillRecord {
  label: string
  date: string
  quote: string
  source: string
}

export interface Skill {
  name: string
  href: string
  summary: string
  counts: { label: string; value: number }[]
  scripts: { file: string; purpose: string }[]
  demos: SkillDemo[]
  excerpt: { source: string; text: string }
  records: SkillRecord[]
}

export const skillsSource = {
  repo: "https://github.com/objones25/my-skills",
  commit: "ece6c42",
  commitDate: "2026-11-21",
  skillCount: 19,
  intro: "Claude Code skills I develop and maintain.",
  install: "mkdir -p ~/.claude/skills\ncp -R pytest-expert ~/.claude/skills/",
} as const

export const skills: Skill[] = [
  {
    name: "pytest-expert",
    href: "https://github.com/objones25/my-skills/tree/main/pytest-expert",
    summary: "Builds, audits and hardens pytest suites, with scripts that catch tests that cannot fail and tests weakened to get green, plus mutation, flaky-test, CI and hook tooling.",
    counts: [{ label: "reference files", value: 31 }, { label: "scripts", value: 4 }, { label: "example files", value: 41 }],
    scripts: [
      { file: "audit_tests.py", purpose: "Static audit of a pytest suite against the pytest-expert hard gates." },
      { file: "diff_guard.py", purpose: "Report edits that turn a test suite green without fixing anything." },
      { file: "flake_hunt.py", purpose: "Rerun a pytest selection many times to find flaky and order-dependent tests." },
      { file: "mutate_check.py", purpose: "Targeted mutation check: prove that a test command fails when the code is wrong." },
    ],
    demos: [
      {
        command: "python diff_guard.py .   # after an edit that makes a failing suite pass",
        exitCode: 1,
        output: "tests/test_cart.py:9: CASES_REDUCED: test_total: 3 parametrize rows -> 1\ntests/test_cart.py:9: ASSERT_WEAKENED: test_total: 2 equality comparisons -> 0\ntests/test_cart.py:14: SKIP_ADDED: test_total_rejects_none: skip/xfail added",
        input: { name: "tests/test_cart.py", text: "import pytest\n\n\ndef total(prices):\n    return round(sum(prices), 2)\n\n\n@pytest.mark.parametrize(\"prices,expected\", [([1.0, 2.0], 3.0)])\ndef test_total(prices, expected):\n    assert total(prices) is not None\n\n\n@pytest.mark.skip(reason=\"flaky\")\ndef test_total_rejects_none():\n    with pytest.raises(TypeError):\n        total(None)" },
      },
      {
        command: "python audit_tests.py tests/",
        exitCode: 1,
        output: "pt/test_cart.py:8: NO_ASSERT: test_total_runs asserts nothing that can fail\npt/test_cart.py:17: FLOAT_EQ: float 0.3 compared with ==; use pytest.approx\npt/test_cart.py:20: SKIP_NO_REASON: @pytest.mark.skip has no reason\npt/test_cart.py:25: NO_ASSERT: test_total_error asserts nothing that can fail\npt/test_cart.py:28: SWALLOWED_FAILURE: except Exception without re-raise hides failures\n\n5 finding(s): FLOAT_EQ=1, NO_ASSERT=2, SKIP_NO_REASON=1, SWALLOWED_FAILURE=1",
        input: { name: "test_cart.py", text: "import pytest\n\n\ndef total(prices):\n    return sum(prices)\n\n\ndef test_total_runs():\n    total([1.0, 2.0])\n\n\ndef test_total_is_truthy():\n    assert total([1.0, 2.0])\n\n\ndef test_total_float():\n    assert total([0.1, 0.2]) == 0.3\n\n\n@pytest.mark.skip\ndef test_total_empty():\n    assert total([]) == 0\n\n\ndef test_total_error():\n    try:\n        total(None)\n    except Exception:\n        pass" },
      },
    ],
    excerpt: { source: "pytest-expert/SKILL.md:98-102", text: "Never edit, skip, or delete a failing test to make it pass, and never special-case the\ncode for a test's inputs. If the test is wrong (it contradicts the spec), say so: with\nthe hooks installed, write `.claude/pytest-expert-escalation.md` (Issue type, Test,\nProblem, Tried, Recommendation) and stop. Evidence and details:\n`references/llm-written-tests.md`." },
    records: [
      { label: "Tests", date: "2026-11-20", quote: "1429 passed, 0 skipped, in 201 s (audit 450, diff guard 462, flake hunt 54, hooks 111, mutate_check 179, structure 173)", source: "pytest-expert/CHANGELOG.md:187" },
      { label: "Claims audit", date: "2026-11-20", quote: "Checked 311 of 3323 items (9%): 260 confirmed, 48 wrong, 1 stale, 2 disputed. Independent review: stopped at the 3-round cap; 2 item(s) disputed.", source: "pytest-expert/AUDIT.md:1,7" },
    ],
  },
  {
    name: "robot-learning-expert",
    href: "https://github.com/objones25/my-skills/tree/main/robot-learning-expert",
    summary: "Explains RL concepts and helps design and debug robot policies, using a routing SKILL.md, paper digests and tested numerical oracle scripts.",
    counts: [{ label: "reference files", value: 36 }, { label: "scripts", value: 7 }, { label: "example files", value: 3 }],
    scripts: [
      { file: "batch_math.py", purpose: "Batch arithmetic and compute-cost estimates for massively parallel on-policy RL." },
      { file: "local_sim.py", purpose: "Access-protocol wrappers for reset-based RL experiments (Power of Resets / RVFS project)." },
      { file: "lqr.py", purpose: "LQR ground truth: Riccati recursion, DARE, rollouts, and least-squares system ID." },
      { file: "mdp_tools.py", purpose: "Ground-truth tools for small tabular MDPs." },
      { file: "rl_math.py", purpose: "Reference implementations of the small RL formulas that silently bias training when wrong." },
      { file: "run_stats.py", purpose: "Aggregate RL results over seeds the way Agarwal et al. (NeurIPS 2021, \"Deep RL at the" },
    ],
    demos: [
      {
        command: "python rl_math.py",
        exitCode: 0,
        output: "rl_math self-check passed\ntruncation demo (r=1, gamma=0.99, 20 s at 50 Hz = 1000 steps):\n  true value 100.0; terminal-treated: start 100.0, episode mean 90.1 (9.9% low), last step 1.0\nif the 24-step rollout boundary were treated as terminal: start value 21.43 vs 100",
      },
      {
        command: "python batch_math.py --envs 4096 --steps 24 --minibatches 4 --epochs 5",
        exitCode: 0,
        output: "num_envs | steps/env |  batch | minibatches | minibatch | grad steps/iter\n---------+-----------+--------+-------------+-----------+----------------\n   4,096 |        24 | 98,304 |           4 |    24,576 |              20\nsim seconds per env per iteration: 0.48",
      },
    ],
    excerpt: { source: "robot-learning-expert/SKILL.md:19-24", text: "## Source tags\n\n- `Notes N`, `AJKS`, `SB`, `BBC`: books and lecture notes, keys in `references/sources.md`.\n- `[Paper §x]`: a located claim in a paper digest under `references/papers/`.\n- `[rsl_rl 5.4.2]`, `[mjlab 1.6.0]`: read from installed source.\n- `[practice]`: common practice, with the source named where one exists. `[inference]`: synthesis not stated in a source. `(unverified)`: not checked against an opened page." },
    records: [
      { label: "Tests", date: "2026-11-16", quote: "212 passed, 0 skipped", source: "robot-learning-expert/CHANGELOG.md:43" },
      { label: "Claims audit", date: "2026-11-16", quote: "Checked 124 of 2460 items (5%): 97 confirmed, 8 wrong, 10 stale, 8 disputed, 1 could not be verified. Independent review: stopped at the 3-round cap; 8 item(s) disputed.", source: "robot-learning-expert/AUDIT.md:5" },
    ],
  },
  {
    name: "design-patterns-expert",
    href: "https://github.com/objones25/my-skills/tree/main/design-patterns-expert",
    summary: "Helps choose, or decline, a design pattern for Python code, with runnable examples and a script that checks the skill's version-dependent claims.",
    counts: [{ label: "reference files", value: 10 }, { label: "scripts", value: 3 }, { label: "example files", value: 18 }],
    scripts: [
      { file: "check_layers.py", purpose: "Fail when an inner layer imports something it must not. Stdlib only." },
      { file: "design_smells.py", purpose: "Scan Python source for structural signals that suggest (or argue against) a design pattern." },
      { file: "verify_python_claims.py", purpose: "Execute every Python-behaviour claim the skill's references make." },
    ],
    demos: [
      {
        command: "python design_smells.py export.py",
        exitCode: 0,
        output: "dp/export.py\n------------\n  L1  [long_param_list] export() takes 6 parameters\n         | def export(report, fmt, compress, encrypt, upload, notify):\n         -> Context Object (group related ones into a dataclass); or split the function\n  L2  [dispatch_chain] 5-branch if/elif dispatching on 'fmt'\n         | if fmt == \"csv\":\n         -> Strategy (dict of callables); Registry if variants live in other files\n\n2 finding(s) across 1 file(s): dispatch_chain=1, long_param_list=1\nLeads, not verdicts. Confirm each against how the code actually changes before recommending a pattern.",
        input: { name: "export.py", text: "def export(report, fmt, compress, encrypt, upload, notify):\n    if fmt == \"csv\":\n        body = \",\".join(report)\n    elif fmt == \"json\":\n        body = str(report)\n    elif fmt == \"xml\":\n        body = \"<r/>\"\n    elif fmt == \"parquet\":\n        body = \"PAR1\"\n    elif fmt == \"html\":\n        body = \"<html/>\"\n    else:\n        raise ValueError(fmt)\n    return body" },
      },
    ],
    excerpt: { source: "design-patterns-expert/SKILL.md:35-35", text: "When the axis is speculative, say so plainly and recommend the simple version, then name the seam that would let them adopt the pattern later without rework. That last part is what makes the advice actionable rather than merely conservative." },
    records: [
      { label: "Tests", date: "2026-11-16", quote: "Tests: 104 passed, 0 skipped", source: "design-patterns-expert/CHANGELOG.md:45" },
      { label: "Claims audit", date: "2026-11-16", quote: "Checked 244 of 1216 items (20%): 194 confirmed, 16 wrong, 1 stale, 2 version-specific, 15 disputed, 16 could not be verified. Independent review: stopped at the 3-round cap; 15 item(s) disputed.", source: "design-patterns-expert/AUDIT.md:5" },
    ],
  },
  {
    name: "pytorch",
    href: "https://github.com/objones25/my-skills/tree/main/pytorch",
    summary: "PyTorch 2.15 engineering reference with a linter, a training triage tool, memory sizing and an API drift checker.",
    counts: [{ label: "reference files", value: 18 }, { label: "scripts", value: 5 }, { label: "example files", value: 13 }],
    scripts: [
      { file: "check_env.py", purpose: "Report the PyTorch environment this code will actually run in." },
      { file: "diagnose.py", purpose: "Triage a PyTorch model that trains but does not learn, or goes NaN." },
      { file: "lint_pytorch.py", purpose: "Static lint for PyTorch code against the pytorch skill's non-negotiables." },
      { file: "memory_budget.py", purpose: "Per-rank memory for weights, gradients and optimizer state, before activations." },
      { file: "verify_api.py", purpose: "Check this skill's documented signatures against the installed PyTorch." },
    ],
    demos: [
      {
        command: "python lint_pytorch.py train.py",
        exitCode: 1,
        output: "torch/train.py:7: ASSIGN_BEFORE_SUPER [error]: self.fc set but __init__ never calls super().__init__() (see references/03-models-layers.md)\ntorch/train.py:16: CUDA_HARDCODE [warning]: \"cuda\" hard-codes CUDA; thread a device variable through instead (see references/01-devices-amp.md)\ntorch/train.py:16: DISCARDED_TO [error]: x.to(...) result is thrown away; tensors move by copy, so reassign: x = x.to(...) (see references/01-devices-amp.md)\ntorch/train.py:19: MISSING_ZERO_GRAD [warning]: backward() and optimizer step() with no zero_grad() in this function; gradients accumulate across steps (see references/05-data-training-loop.md)\ntorch/train.py:20: LOSS_TENSOR_ACCUMULATED [error]: loss accumulated into total as a tensor; use loss.item() (or .detach()) so each step's graph can be freed (see references/05-data-training-loop.md)\n\n5 finding(s): ASSIGN_BEFORE_SUPER=1, CUDA_HARDCODE=1, DISCARDED_TO=1, LOSS_TENSOR_ACCUMULATED=1, MISSING_ZERO_GRAD=1",
        input: { name: "train.py", text: "import torch\nimport torch.nn as nn\n\n\nclass Net(nn.Module):\n    def __init__(self):\n        self.fc = nn.Linear(8, 2)\n\n    def forward(self, x):\n        return self.fc(x)\n\n\ndef train(model, loader, opt):\n    total = 0\n    for x, y in loader:\n        x.to(\"cuda\")\n        loss = nn.functional.cross_entropy(model(x), y)\n        loss.backward()\n        opt.step()\n        total += loss\n    return total\n\n\ndef evaluate(model, loader):\n    return [model(x).argmax(1) for x, _ in loader]" },
      },
    ],
    excerpt: { source: "pytorch/SKILL.md:105-107", text: "8. **Never claim a signature or default from memory.** Every value in `references/` was\n   introspected from torch 2.15.0. Outside that set, check the installed library\n   (`inspect.signature`) or run it. When docs and code disagree, follow the code and say so." },
    records: [
      { label: "Tests", date: "2026-11-16", quote: "415 passed, 2 skipped (one test is for torch 2.14, one needs a machine with no accelerator)", source: "pytorch/CHANGELOG.md:52" },
      { label: "Claims audit", date: "2026-11-16", quote: "checked 162 of 1547 inventoried items (10%): 132 confirmed, 18 wrong, 12 disputed after a 3-round blind review. The other 1385 items were not checked and are not vouched for here.", source: "pytorch/AUDIT.md:3-6" },
    ],
  },
  {
    name: "building-effective-agents",
    href: "https://github.com/objones25/my-skills/tree/main/building-effective-agents",
    summary: "Diagnoses and designs LLM agents and their harnesses, routing each symptom to a starting reference, with mostly stdlib scripts and an A/B eval set.",
    counts: [{ label: "reference files", value: 12 }, { label: "scripts", value: 8 }, { label: "example files", value: 8 }],
    scripts: [
      { file: "agent_loop.py", purpose: "A small, framework-free agent harness that shows where each control lives." },
      { file: "cache_prefix_check.py", purpose: "Find what breaks prompt-cache reuse across consecutive model calls in one run." },
      { file: "inspect_eval_template.py", purpose: "Inspect AI template for an outcome-graded, multi-trial agent eval." },
      { file: "reliability.py", purpose: "Reliability arithmetic for agent evals: pass@k, pass^k, paired comparison, run budgets." },
      { file: "rule_of_two_audit.py", purpose: "Audit agent sessions against Meta's Agents Rule of Two." },
      { file: "tool_budget.py", purpose: "Budget a tool result before it enters the model's context." },
      { file: "tool_lint.py", purpose: "Lint a set of tool definitions for the problems that cause wrong-tool picks." },
      { file: "triage_transcripts.py", purpose: "Sort \"agent said it worked\" runs into causes, using the tool-call record." },
    ],
    demos: [
      {
        command: "python tool_lint.py tools.json",
        exitCode: 1,
        output: "3 tools, ~113 definition tokens\n[thin-desc] search_orders: 2 words\n[vague-param] search_orders: rename ['id'] (e.g. user -> user_id)\n[thin-desc] find_orders: 10 words\n[vague-param] find_orders: rename ['user'] (e.g. user -> user_id)\n[thin-desc] delete_order: 3 words\n[write-unmarked] delete_order: side-effect name with no annotations (destructiveHint / idempotentHint / openWorldHint)",
        input: { name: "tools.json", text: "[\n  {\"name\": \"search_orders\", \"description\": \"Search orders.\", \"input_schema\": {\"type\": \"object\", \"properties\": {\"id\": {\"type\": \"string\"}}}},\n  {\"name\": \"find_orders\", \"description\": \"Find orders for a customer by searching the orders table.\", \"input_schema\": {\"type\": \"object\", \"properties\": {\"user\": {\"type\": \"string\"}}}},\n  {\"name\": \"delete_order\", \"description\": \"Delete an order.\", \"input_schema\": {\"type\": \"object\", \"properties\": {\"order_id\": {\"type\": \"string\"}}}}\n]" },
      },
      {
        command: "python reliability.py passk --n 8 --c 7 --k 4",
        exitCode: 0,
        output: "{\n  \"pass@k\": 1.0,\n  \"pass^k\": 0.5\n}",
      },
    ],
    excerpt: { source: "building-effective-agents/SKILL.md:69-69", text: "When someone asks for an agent but describes a script, say so and name what they're buying: latency, token spend, and a new failure surface. Build the deterministic parts deterministically even inside an agent." },
    records: [
      { label: "Tests", date: "2026-11-16", quote: "Tests: 58 passed, 0 skipped", source: "building-effective-agents/CHANGELOG.md:51" },
      { label: "Claims audit", date: "2026-11-16", quote: "Checked 454 of 1208 items (38%): 374 confirmed, 30 wrong, 19 stale, 16 disputed, 15 could not be verified. Independent review: stopped at the 3-round cap; 16 item(s) disputed.", source: "building-effective-agents/AUDIT.md:5" },
    ],
  },
  {
    name: "negative-space-programming",
    href: "https://github.com/objones25/my-skills/tree/main/negative-space-programming",
    summary: "Adds runtime checks for what must never happen (assertions, bounded loops, the split between programmer and operating errors), with an audit script.",
    counts: [{ label: "reference files", value: 3 }, { label: "scripts", value: 4 }],
    scripts: [
      { file: "audit_negative_space.py", purpose: "Audit Python source for missing negative space." },
      { file: "test_audit.py", purpose: "Regression test for audit_negative_space.py. Runs under pytest or bare python:" },
      { file: "test_self_claims.py", purpose: "Claims the skill makes about itself. Needs pytest; the frontmatter test skips without pyyaml." },
      { file: "test_types.py", purpose: "Type-checker regression test. Runs under pytest or bare python:" },
    ],
    demos: [
      {
        command: "python audit_negative_space.py before.py",
        exitCode: 1,
        output: "nsp/before.py:34: NSP001 [warning] split_indices: 0 runtime check(s) in 4 statements; minimum is 2. What must never be true when this returns?\nnsp/before.py:41: NSP001 [warning] normalize: 0 runtime check(s) in 3 statements; minimum is 2. What must never be true when this returns?\nnsp/before.py:48: NSP001 [warning] fetch_with_retry: 0 runtime check(s) in 1 statements; minimum is 2. What must never be true when this returns?\nnsp/before.py:49: NSP005 [error] fetch_with_retry: `while True` with no iteration bound; add an explicit maximum and assert it, or mark it `# nsp: ignore NSP005` if it is a deliberate event loop\nnsp/before.py:54: NSP007 [error] fetch_with_retry: handler neither raises nor logs; the failure is erased. Re-raise, log with context, or put `# nsp: ignore NSP007 <reason>` on the except line if it is truly ignorable\nnsp/before.py:59: NSP001 [warning] load_checkpoint: 0 runtime check(s) in 3 statements; minimum is 2. What must never be true when this returns?\nnsp/before.py:74: NSP001 [warning] running_mean: 0 runtime check(s) in 4 statements; minimum is 2. What must never be true when this returns?\n\n1 file(s) scanned, 7 finding(s): NSP001=5, NSP005=1, NSP007=1",
        repoInput: { name: "assets/examples/before.py", href: "https://github.com/objones25/my-skills/blob/main/negative-space-programming/assets/examples/before.py" },
      },
      {
        command: "python audit_negative_space.py after.py",
        exitCode: 0,
        output: "1 file(s) scanned, 0 finding(s): none",
        repoInput: { name: "assets/examples/after.py", href: "https://github.com/objones25/my-skills/blob/main/negative-space-programming/assets/examples/after.py" },
      },
    ],
    excerpt: { source: "negative-space-programming/SKILL.md:108-110", text: "Rule 3 is the one people get wrong. `require(0 < frac < 1)` for a value hardcoded by the caller is\nan assertion. The same check on a value parsed from a config file is validation and belongs in a\n`raise ValueError`. Same predicate, different category, decided by where the value came from." },
    records: [
    ],
  },
]
