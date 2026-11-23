# Does counting repeated query terms change what an RL query rewriter learns?

This is a CS291A class project that reproduces and extends one result of DeepRetrieval (Jiang et al., 2025, [arXiv:2503.00223](https://arxiv.org/abs/2503.00223)). DeepRetrieval trains a 3-billion-parameter language model with reinforcement learning to rewrite search queries: the model rewrites a query, a search engine runs it, and the model is rewarded by how well the right documents rank. The paper reports that this beats the original query and prompted models such as GPT-4o and Claude-3.5-Sonnet; on BM25 retrieval it is best on 7 of 8 datasets (its Table 2). On the MS MARCO-Science benchmark with BM25 keyword search (its "MS-S, sparse" column), it reports nDCG@10 41.1 against 38.8 for the original query.

We re-implemented the training ourselves and reran that one setting. We added three things the paper does not report:

1. **A reward ablation.** We trained the same model twice, once with the paper's reward and once with a *count-once* variant that removes repeated words before searching. The paper itself reports that a model trained without reasoning fell into repeating query terms (Appendix D.1); we test whether that is possible under BM25 with reasoning.
2. **Training diagnostics.** How the training signals behaved (entropy, KL, critic, validation noise), where the paper reports only final scores.
3. **A behavior analysis.** We sampled each test question 32 times per model and compared the rewriters with confidence intervals, not only by their scores.

We also compared the paper's text with its released code, found settings where they differ, and examined its prompt, which asks for Boolean operators that this BM25 setup ignores (see "Comparison with the paper").

In reinforcement learning terms the trained models are *policies*; we use the word below.

## Background

**The task.** Each example is a short science question from MS MARCO, for example "3 characteristics of protozoa replication", paired with the passage (out of 800,000) that answers it. About 94% of questions have exactly one relevant passage (93% of test questions). The model sees the question and must write a search query that brings that passage into the top 10 results.

**BM25** is a standard keyword search method. It scores a passage by the query words it contains, giving more weight to rare words, with diminishing returns when a passage repeats a word, and adjusting for passage length. Words are first *analyzed*: lowercased, common words such as "the", "is" and "and" dropped, and the rest cut to a stem ("fibre" becomes "fibr"). BM25 ignores word order and Boolean operators, so `crust AND mantle` and `crust mantle` score the same.

**nDCG@10** measures how high the relevant passage ranks in the top 10. With one relevant passage it is 1/log2(rank + 1): 1.0 at rank 1, 0.63 at rank 2, 0.36 at rank 6, and 0 if the passage is not in the top 10. We report its mean over queries.

**The question.** In standard BM25 a word that appears twice in the query counts twice. The untrained model repeats words in 42% of its rewrites, so a rewriter might learn to inflate its score by repeating words instead of choosing better ones. We built a second reward, *count-once*, that removes repeated words before searching, so repetition cannot help, and asked whether training with it produces a different rewriter.

## Procedure

1. **Data.** MS MARCO-Science as released by DeepRetrieval: 22,416 training questions and 2,305 test questions (the "dev" split), searched over an 800,000-passage index (BM25 settings k1 0.9, b 0.4). We held out 500 training questions for validation and trained on the remaining 21,916.
2. **Model and prompt.** Qwen2.5-3B-Instruct, a 3-billion-parameter instruction-tuned model, with all weights trained. The prompt, copied from DeepRetrieval, asks the model to reason inside `<think>` tags and then give the new query as JSON inside `<answer>` tags. It also tells the model to "use Boolean operators (AND, OR) and parentheses", which BM25 then ignores.
3. **Reward.** The rewrite is searched with BM25 and scored by nDCG@10. Reward is 0.1 + nDCG@10 if the passage is in the top 10, 0 if it is not, and −2 if the response is malformed. The *normal* run scores with standard BM25; the *count-once* run removes duplicate words from the rewrite first. Nothing else differs: same model, data order, settings and random seed.
4. **Training.** PPO, a standard reinforcement learning method for language models. Each step takes 64 training questions, samples one response per question at temperature 0.6 (sampling randomness; 0 would always pick the most likely word), computes the rewards, and nudges the model toward responses that scored better than expected. A second network, the *critic*, learns to predict the reward so the update can tell "better than expected" from "worse". A small penalty (KL coefficient 0.001) discourages moving far from the original model, and a small entropy bonus (0.001) discourages the model from becoming fully deterministic. Each run took 1,751 steps: 112,064 responses, about five passes over the training questions. Other settings: actor learning rate 1e-6, critic learning rate 1e-5, clip 0.2, one PPO epoch per batch, gradient clip 1.0.
5. **Checkpoint selection.** Every 50 steps the model rewrote the 500 validation questions with greedy decoding (always the most likely next word), and the checkpoint with the highest validation nDCG@10 was kept: step 1549 for normal, step 1349 for count-once.
6. **Test.** Four sources rewrote all 2,305 test questions with greedy decoding: the raw question unchanged, the *untrained* model (the same prompt, before any training), and the two trained models.
7. **Behavior analysis.** To see behavior beyond one greedy answer, the untrained and both trained models each answered every test question 32 times at the training temperature (73,760 responses each), using the same random seed per question for all three. For each response we stored the reasoning, the rewrite, its analyzed words, the top 10 passages, and nDCG@10 under both scorers. Comparisons treat the question as the unit: average each question's 32 samples, then compare the two models across questions with a paired bootstrap (10,000 resamples) for 95% confidence intervals and a Wilcoxon signed-rank test. nDCG is the main comparison; the 33 other behavior metrics are corrected for multiple comparisons (Benjamini-Yekutieli), so "significant" below means after that correction.

**What was analyzed:**

| Source | What it contains | Used for |
|---|---|---|
| Training logs, both runs | per-step reward, nDCG under both scorers, repetition rate, response length, entropy, KL, critic statistics, gradient norms; validation every 50 steps | Training and Validation sections |
| Greedy test evaluation | nDCG@10 and query statistics for the four sources on 2,305 test questions, with paired confidence intervals | Test results |
| Sampled responses | 221,280 model responses plus the raw questions, with reasoning, rewrites, retrieved passages and scores; computed metrics | Behavior section and examples |

Training ran on two RTX PRO 6000 GPUs (96 GB each), alternating between the two runs in 50-step chunks; both runs together took about 15.6 hours and cost about $84.

## Main findings

- **We reproduce the paper's baselines but not its full gain.** Original query 38.8 and untrained model 25.8, against the paper's 38.8 and 25.9. Our trained models reach 39.7 and 39.6, against the paper's 41.1. We did not test why. Candidates include the training reward (we followed the released code's nDCG cutoff of k = 10; the paper's text says 3000), training length, checkpoint selection and response length.
- **Retrieval quality is the same.** On the 2,305 test questions, greedy rewrites score nDCG@10 0.3967 (normal) and 0.3961 (count-once). The paired 95% CI of the difference is [−0.0058, +0.0047]. With 32 sampled rewrites per question the means are 0.3960 and 0.3958, CI [−0.0045, +0.0041].
- **Both beat the raw query by a little and the untrained model by a lot.** Raw query: 0.3877. Untrained model: 0.2575 (greedy). Over 32 samples, normal minus raw query is +0.008, 95% CI [+0.001, +0.015].
- **The two rewards gave nearly the same signal.** Repetition moved the score little even when it was common: in the first 50 steps 33% to 37% of training rewrites repeated a term, yet standard BM25 scored them only 0.003 to 0.005 higher than count-once BM25. Both policies dropped repetition within about 100 steps. The normal run drifted back into it three times (a 25-step average of up to 37% of rewrites); each time standard BM25 scored those batches *lower* than count-once BM25, and reward did not rise. Greedy rewrites with a repeated term: 4.3% (normal), 3.7% (count-once), 5.2% for raw queries, 41.7% for the untrained model.
- **The policies still behave differently.** 26 of 33 secondary behavior metrics differ after correcting for multiple comparisons (Benjamini-Yekutieli). Count-once is more deterministic (on average 1.6 distinct rewrites out of 32 samples, against 3.6 for normal), opens its reasoning with the same phrase in 99.8% of samples, and a text classifier tells its reasoning apart from normal's with 99.96% accuracy on held-out questions.
- **Training was stable but narrowed the policy.** No divergence, no non-finite values, no skipped steps. Entropy fell from 0.43 to 0.02, most of it by step 300. Normal's validation nDCG stayed flat after the first 100 steps; count-once's sat on a plateau until step 900, then rose by about 0.02.

## Training

![Training reward](figures/train_reward.png)

Mean training reward rose from 0.365 to 0.450 (normal) and from 0.331 to 0.449 (count-once), comparing the first and last 50 steps. Most of the rise came in the first 150 steps; after that the smoothed batch reward stays between about 0.38 and 0.47. The two scorers' training-batch nDCG differs by 0.003 to 0.005 over the first 50 steps, when a third of rewrites still repeated a term, and by 0.002 to 0.004 per step over the whole run (mean absolute difference).

![Repeated terms during training](figures/deck_repeat_train.png)

The share of training rewrites with a repeated term fell from 37% (normal) and 33% (count-once) in the first 50 steps to 5% and 7% over steps 100 to 150, at about the same speed under both rewards.

Repetition came back in the normal run three times. In each episode the standard scorer gave *lower* nDCG than the count-once scorer on the same rewrites, so repetition was costing reward, not earning it:

| normal run, steps | rewrites with a repeat | standard − count-once nDCG | reward |
|---|---|---|---|
| 300 to 400 (before) | 7% | −0.002 | 0.428 |
| 410 to 460 | 24% | −0.010 | 0.430 |
| 880 to 960 | 24% | −0.004 | 0.423 |
| 960 to 1060 (between) | 5% | −0.001 | 0.436 |
| 1080 to 1290 | 27% | −0.003 | 0.432 |
| 1320 to 1500 (after) | 3% | −0.000 | 0.429 |

Count-once had one smaller episode (14% over steps 1570 to 1620). Both selected checkpoints (steps 1549 and 1349) fall outside these episodes. We do not know what started them.

### Validation

![Validation nDCG](figures/val_ndcg.png)

Validation is greedy nDCG@10 on 500 held-out training queries every 50 steps, and the best value selects the checkpoint.

| | step 49 | best | last (1750) | range after step 300 |
|---|---|---|---|---|
| normal | 0.353 | 0.374 (step 1549) | 0.365 | 0.346 to 0.374 |
| count-once | 0.333 | 0.372 (step 1349) | 0.367 | 0.346 to 0.372 |

Normal's mean validation nDCG is 0.363 over steps 49 to 299 and 0.366 over steps 1049 to 1750: no trend after the first few points. Count-once's is 0.348 and 0.366: it stayed between 0.347 and 0.355 from step 149 to 899, then mostly between 0.366 and 0.372 from step 1099 on, with dips to 0.346 (step 1049) and 0.356 (step 1649). The y-axis of the figure starts at 0.32, which makes these swings look larger than they are.

Single points swing by about 0.02. One 500-query mean has a standard error of about 0.017 (per-query standard deviation about 0.39). All checkpoints are scored on the same 500 queries, so differences between checkpoints are less noisy than that, but the normal run's best step (1549) cannot be told apart from its neighbours with this set. The test score of the selected checkpoints (0.397) is higher than their validation score. Validation and test are different query sets, and we did not score the raw query on the validation set, so we cannot say how much of the gap is the query set.

### Training health

| Signal | normal (first → last 50 steps) | count-once | Reading |
|---|---|---|---|
| Entropy (nats/token) | 0.426 → 0.019 | 0.428 → 0.012 | the policy became nearly deterministic |
| KL to start model | 0.13 → 2.58 | 0.13 → 1.18 | normal drifted about twice as far |
| Response length (tokens) | 130 → 46 | 114 → 70 | reasoning got shorter |
| Critic value loss | 0.095 → 0.066 | 0.089 → 0.028 | |
| Critic explained variance | 0.01 → 0.33 | 0.05 → 0.71 | the normal-run critic stayed weak |
| PPO clip fraction | 0.009 → 0.003 | 0.009 → 0.002 | updates were small |
| Actor grad norm (before clipping) | 6.9 → 3.4 | 7.8 → 5.6 | clipped to 1.0 on 84% / 88% of optimizer updates (4 per step) |
| Format errors in training batches | 0.13% → 0.03% | 0.16% → 0.03% | |

![Entropy](figures/train_entropy.png)
![KL](figures/train_kl.png)

Terms: *entropy* measures how spread out the policy's next-token choices are (0 means it always picks the same token). *KL to start model* measures how far the policy's token probabilities have moved from the untrained model. The *critic* predicts each response's reward; *explained variance* is the share of reward variation it predicts (1 is perfect, 0 is no better than the average). *Clip fraction* is the share of tokens whose update PPO capped.

What the signals say:

- **Stable.** No non-finite values and no skipped optimizer steps.
- **Gradient spikes were contained.** The count-once actor had five steps with gradient norm above 100 (largest 719 at step 1652; the normal actor never exceeded 20); clipping held each update to norm 1.0 and reward showed no lasting drop.
- **Entropy collapse is the main cost.** Smoothed entropy was about 0.016 by step 300 in both runs, down from 0.43, which matches the low diversity of the trained policies below.
- **The critic.** The count-once critic explains 71% of return variance by the end, the normal critic 33%. At step 1000 the normal critic's explained variance fell from 0.26 to about 0 and its value loss rose from 0.071 to 0.104; it recovered slowly over the next 500 steps. We found no change in the logged rewrite or reward statistics at that step, so the cause is not known. A weaker critic makes the "better than expected" signal noisier; the normal run still reached the same reward.
- **A late shift in the normal policy.** Between steps 1500 and 1640 the normal policy's responses halved in length (about 113 to 57 tokens), entropy briefly rose to about 0.09, and KL to the start model rose from about 1.6 to 2.4. The selected normal checkpoint (step 1549) falls in the middle of this shift, when responses were already down to about 66 tokens; the sampled normal policy averages 66.5 tokens.

![Critic explained variance](figures/train_explained_var.png)

## Test results (greedy, 2,305 test questions)

| Source | nDCG@10 (standard BM25) | nDCG@10 (count-once BM25) | terms per rewrite | rewrites with a repeat |
|---|---|---|---|---|
| raw query | 0.3877 | 0.3877 | 5.22 | 5.2% |
| untrained | 0.2575 | 0.2579 | 6.63 | 41.7% |
| normal | 0.3967 | 0.3970 | 4.04 | 4.3% |
| count-once | 0.3961 | 0.3965 | 3.85 | 3.7% |

Count-once minus normal: −0.0006, 95% CI [−0.0058, +0.0047]. Untrained minus raw query: −0.130, CI [−0.144, −0.116]. Part of the untrained model's loss is formatting: 1.3% of its greedy responses are malformed and score 0.

Against the raw query, the normal policy's mean over 32 samples is higher on 481 queries, lower on 282, and identical on 1,542 (67%).

## Comparison with the paper

Our baselines match the paper's to within 0.2 points; our trained models score 1.4 points below the paper's DeepRetrieval-3B.

| MS-S, BM25, nDCG@10 (×100), 2,305 test questions | paper (Table 2) | ours |
|---|---|---|
| original query | 38.8 | 38.8 |
| Qwen2.5-3B-Instruct, zero-shot, with reasoning (our "untrained") | 25.9 | 25.8 |
| Qwen2.5-3B-Instruct, zero-shot, without reasoning | 31.6 | not run |
| DeepRetrieval-3B | 41.1 | 39.7 (normal), 39.6 (count-once) |

Our untrained model uses the training prompt; we take it to correspond to the paper's "with reasoning" zero-shot row, which the close match (25.8 vs 25.9) supports but the paper does not state. The paper reports one number per setting, without confidence intervals or repeated runs, and we do not have its per-question results, so we cannot test whether the 1.4-point gap is larger than run-to-run variation.

### Where our setup differs

Where the paper's text and its released code (repository `pat-jj/DeepRetrieval`, checked out at commit `2716c8d`) disagree, we followed the code:

| | paper text | released code | ours |
|---|---|---|---|
| nDCG cutoff in the training reward | k = 3000, "to mitigate the risk of sparse or zero-reward signals" (Appendix B.2); but Table 8 gives the sparse reward as "Same as evaluation metric (NDCG)" | k = 10 for training and evaluation (`msmarco.py`) | k = 10 |
| Maximum response length | 512 tokens for classic retrieval (Appendix B.2) | 350 tokens (`scripts/train/msmarco.sh`) | 350 tokens |
| Validation during training | not described | the test set, every 50 steps (`msmarco.sh`) | 500 held-out training questions, every 50 steps; test scored once |
| Training length | not stated for MS-S | `msmarco.sh` is the MS-T (technology) script; it runs 5 epochs, resuming from step 450 of an earlier run | 1,751 steps, about 5.1 passes |
| PPO implementation | verl | verl | our own PyTorch implementation of the same objective |
| Hardware | 2× A100 80GB (Appendix B.3) | | 2× RTX PRO 6000 96GB |

What matches the paper's text: Qwen2.5-3B-Instruct, batch 64, mini-batch 16, actor and critic learning rates 1e-6 and 1e-5, KL coefficient 0.001, temperature 0.6. What matches only the released code, because the paper does not give it: the reward constants (0.1 + nDCG@10, 0, −2), the entropy coefficient 0.001 (verl's default), and the exact prompt (below).

Any of these differences could explain part of the gap; we did not test any of them. The candidates:

- **The k = 3000 reward.** With k = 10, about 44% of training responses got no retrieval reward (the share of rewrites with nDCG@10 = 0 over the whole run), the sparse signal the paper says k = 3000 avoids. But the released script resumes from a run directory named `msmarco_tech_sparse_new_corpus_k_10`, which suggests the authors also trained MS MARCO runs with k = 10, so this may not be the setting behind Table 2.
- **Training length.** The paper does not say how long MS-S was trained. The only released MS MARCO script continues an earlier run for 5 more epochs, so the paper's model may have trained longer than ours.
- **Checkpoint selection.** The released script evaluates on the test set every 50 steps. If the best of those test evaluations were the one reported, the reported score would be biased upward; the paper does not say how its checkpoint was chosen.
- **Response length** (512 vs 350 tokens) and **implementation details** of our re-implementation.

### The prompt and Boolean operators

The prompt our model saw, byte-identical to the released code (`code/data_preprocess/msmarco_sub.py`), with the question in place of `{question}`:

```text
<|im_start|>system
You are a helpful assistant. You first thinks about the reasoning process in the mind and then provides the user with the answer.<|im_end|>
<|im_start|>user

You are a query rewriting expert. Your task is to augment the user query to find relevant literature in a corpus with sparse retrieval.

Show your work in <think> </think> tags. Your final response must be in JSON format within <answer> </answer> tags. For example,
<think>
[thinking process]
</think>
<answer>
{
    "query": "...."
} 
</answer>. 
Note: The query should use Boolean operators (AND, OR) and parentheses for grouping terms appropriately."

Here's the user query:
{question}<|im_end|>
<|im_start|>assistant

Let me rewrite the query with reasoning. 
<think>
```

The paper prints this prompt as Figure 15 with small differences: grammatical system text ("You first think … and then provide"), and the assistant turn begins "Let me think step by step." instead of "Let me rewrite the query with reasoning."

**What the paper says about Boolean operators.** The paper adapts the output to each domain, "including structured boolean expressions for literature search and sparse retrieval" (Section 2.2), and describes sparse retrieval as retrieving documents "using keyword matching and boolean operations with BM25" (Table 8). It argues that RL is "particularly effective for real search engines, where the ability to formulate precise boolean expressions with appropriate operator usage and term grouping is crucial"; those real engines are PubMed and ClinicalTrials.gov, used for literature search.

**What BM25 does with them here.** In both the released code and ours, the rewrite is passed as a plain string to pyserini's `searcher.search`, which analyzes it as a bag of words. "and" and "or" are stopwords and parentheses are punctuation, so the operators disappear. For example, the untrained model's rewrite `Pascal's Law AND (definition OR applications OR examples) IN CONTEXT` is searched as the terms `pascal law definit applic exampl context`. On this benchmark, "boolean operations with BM25" do not happen: an OR clause becomes extra words that all count toward the score.

**What the models did.**

| | rewrites with AND, OR or parentheses | nDCG@10, Boolean rewrites | nDCG@10, other rewrites |
|---|---|---|---|
| untrained | 98% | 0.264 | 0.303 |
| normal | 11.6% (AND only, no OR) | 0.417 | 0.394 |
| count-once | 0.3% | 0.506 | 0.396 |

The untrained model follows the instruction almost always, and it costs it: on the 630 questions where its 32 samples include both kinds, its Boolean rewrites score 0.027 lower than its plain ones (95% CI −0.046 to −0.009) and carry 1.4 more analyzed terms. Training removed the habit, so both trained policies learned to ignore an instruction in their own prompt. The normal policy's remaining Boolean rewrites only join words with AND ("Sea Otters AND endangered AND Alaska"), which is the same search as without it. (The trained policies' Boolean and plain rewrites come from different questions, so their nDCG columns are not comparable.) A likely reading, which we did not test, is that the instruction was carried over from the paper's literature-search setting, where the search engines do interpret Boolean operators.

### Findings that relate to the paper's own observations

- **Repetition.** The paper's Appendix D.1 reports, on PubMed literature search, that Qwen trained *without* reasoning generated "increasingly repetitive queries with redundant terms by step 600 (e.g., repeating "ovarian atrophy" numerous times)", and credits reasoning with letting the models "avoid the degenerate strategy of query expansion through repetition". Our count-once reward tests the same failure directly under BM25. With reasoning, on MS-S, repetition stopped paying early and the count-once reward changed nothing in the score. That is consistent with D.1's claim but does not test it, since we did not train a model without reasoning.
- **Reasoning gets shorter.** The paper observes on literature search that reasoning shortens during training (Figure 4, Appendix D.1). We see the same on MS-S: responses fell from 130 to 46 tokens (normal) and 114 to 70 (count-once).
- **Exploration.** The paper attributes the benefit of reasoning, compared with no reasoning, to "broader exploration during training". We ran no no-reasoning model, so we cannot test that comparison. We can only add that, with reasoning, entropy was down 96% by step 300 and the trained policies produce 3.6 and 1.6 distinct rewrites out of 32 samples.

## Behavior (32 samples per question)

### Count-once is more deterministic

| | untrained | normal | count-once | count-once − normal (95% CI) |
|---|---|---|---|---|
| distinct rewrites per 32 samples | 31.3 | 3.6 | 1.6 | −2.0 (share: −0.062 [−0.066, −0.059]) |
| within-query std of nDCG | 0.193 | 0.022 | 0.006 | −0.016 [−0.019, −0.013] |
| mean token log-prob | −0.669 | −0.105 | −0.013 | +0.092 [+0.090, +0.094] |
| expected best-of-16 nDCG | 0.590 | 0.421 | 0.403 | −0.018 [−0.023, −0.014] |

![Best of k](figures/best_of_k.png)

Training traded diversity for a better average. A single untrained sample scores 0.263, but the best of 16 untrained samples scores 0.590, well above either trained policy's best of 16.

### Both learned to delete words

![Rewrite types](figures/rewrite_class.png)

Rewrite types compare the rewrite's analyzed terms with the query's: *compression* only removes terms, *same* keeps the same terms, *expansion* only adds terms, *substitution* adds as many as it removes, and *mixed* adds and removes different numbers.

83% (normal) and 91% (count-once) of rewrites only remove terms from the query. Both keep about 72% to 73% of the query's terms and add almost none (0.11 vs 0.04 new terms per rewrite). The untrained model expands instead, mostly through Boolean OR clauses (see "The prompt and Boolean operators"): it keeps 58% of the query's terms and adds about 3.

### The rewrites differ in wording, not in the documents they retrieve

- Normal keeps question words ("how many", "why", "what"); count-once often replaces "how many" with "number". In 25 queries the normal policy's most common rewrite contains "how many" and count-once's contains "number" instead.
- The two policies' most common rewrites differ as exact strings in 92% of queries, but much of that is capitalization (normal writes "Xenon come from", count-once "xenon come from"). Ignoring case they differ in 64%, and after BM25's analyzer (lowercasing, stopword removal, stemming) their terms differ in only 25%. Their top-10 results are identical in 77% of queries (rank-biased overlap, RBO, of 1; RBO compares two ranked lists, weighting the top ranks most).
- A classifier separates the rewrites 65% of the time (chance is 50%; permutation p ≤ 0.005, the smallest value 200 permutations can give). The classifier is logistic regression on word and word-pair frequencies (TF-IDF), trained on the first sample of each question and scored by 5-fold cross-validation with folds split by question, so it is always tested on questions it has not seen.

### The reasoning templates differ

- Count-once starts its reasoning with "The query is looking for" in 99.8% of samples and writes "does not require the use of Boolean operators" in 97.7%. Normal starts with "The user query can be broken down into key terms" in 64.6%.
- Normal states a number in its reasoning in 10.5% of samples, against 0.4% for count-once and 7.2% for the untrained model. In the samples we read, this is the policy answering the question instead of discussing the query, for example "The atomic mass of lead is approximately 207.2 atomic mass units (amu)."
- Median reasoning length: 579 characters (untrained), 182 (normal), 245 (count-once).
- A classifier separates the two policies' reasoning with 99.96% accuracy (permutation p ≤ 0.005).

![Reasoning length](figures/think_len.png)

### Examples

Each cell shows a rewrite, how many of the 32 samples produced it, and that rewrite's nDCG@10; the policy's mean over all 32 samples is in brackets. Every untrained sample was different, so its cell shows one sample.

| Query (raw nDCG) | untrained (one sample) | normal | count-once |
|---|---|---|---|
| how many chromosomes do carp have (1.00) | `(chromosome count OR number of chromosomes) AND (carp OR fish)`: 1.00 [0.64] | `how many chromosomes do Carp have` (9/32): 1.00 [0.91] | `number of chromosomes carp` (30/32): 1.00 [1.00] |
| how far are the crust and mantle (0.00) | `how far are the crust and mantle AND located`: 0.00 [0.29] | `distance between Crust and Mantle` (31/32): 1.00 [1.00] | `distance are the crust and mantle` (18/32): 1.00; `far are the crust and mantle` (10/32): 0.00 [0.69] |
| what food is fibre found in (1.00) | `fiber AND food AND (whole grains OR fruits OR vegetables OR legumes)`: 0.00 [0.08] | `Food is Fiber found in` (15/32): 0.00 [0.00] | `food is fiber found` (32/32): 0.00 [0.00] |
| a _______ is a pictorial representation of the chromosomes in a cell (1.00) | `chromosome AND (map OR diagram)`: 0.00 [0.67] | `karyotype is a pictorial representation of the chromosomes in a cell` (5/32): 1.00; `chromosome diagram` (4/32): 0.00 [0.69] | `a pictorial representation of the chromosomes in a cell` (32/32): 1.00 [1.00] |

The fibre query is one of the largest losses. Both policies drop "what" and change "fibre" to "fiber" (analyzed terms `what food fibr found` become `food fiber found`), and the relevant passage leaves the top 10; we did not test which change causes the loss. In the karyotype query the normal policy's most common rewrite writes the answer into the query. In the crust and mantle query, count-once keeps "far" in 10 of 32 samples and those rewrites miss.

## Limitations

- One training seed per reward. The behavior differences could partly be run-to-run variation rather than an effect of the reward; a second seed per reward would separate the two.
- The validation set (500 queries) is too small to separate neighbouring checkpoints.
- We did not test the paper's k = 3000 training reward or its 512-token limit, so we cannot say how much of the 1.4-point gap to the paper they explain.
- The vocabulary statistics use Lucene's stemmed terms ("mani" is "many").
- The classifier test on reasoning picks up stock phrasing; it shows the outputs differ, not that the policies reason differently in substance.

## Reproducing

`scripts/report_data.py` computes every number and figure in this report from the training logs, the greedy evaluation tables and the sampled responses, and writes `report/data/*.json` and `report/figures/`. `scripts/deck_figures.py` and `report/deck/build.js` build the slides from those files. The logs and samples are stored privately; the README describes how to regenerate them.
