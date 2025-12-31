# Oumi RL Fine-tuning Setup

## Reinforcement Learning via Direct Preference Optimization (DPO)

This project uses **RL fine-tuning**, not just supervised learning.

### Key Difference

**Supervised Fine-tuning (SFT):**
```json
{"instruction": "Analyze commit", "output": "This commit..."}
{
  "prompt": "Analyze commit: feat: add auth",
  "chosen": "This commit addresses a critical security requirement by implementing user authentication. The business need is to protect sensitive data...",
  "rejected": "Added login feature."
}
cd ~/projects/code-archaeologist

cat > docs/OUMI_RL_TRAINING.md << 'EOF'
# Oumi RL Fine-tuning Setup

## Reinforcement Learning via Direct Preference Optimization (DPO)

This project uses **RL fine-tuning**, not just supervised learning.

### Key Difference

**Supervised Fine-tuning (SFT):**
```json
{"instruction": "Analyze commit", "output": "This commit..."}
Model learns to mimic examples.

Reinforcement Learning (DPO):

JSON

{
  "prompt": "Analyze commit: feat: add auth",
  "chosen": "This commit addresses a critical security requirement...",
  "rejected": "Added login feature."
}
Model learns to prefer better responses.

Training Process
Bash

cd oumi-training
source venv/bin/activate
oumi train -c ../train-config.yaml
oumi train -c ../dpo-train-config.yaml
Why DPO?
DPO teaches the model to generate better archaeological analyses by learning from preference comparisons.

Configuration
Parameter	SFT	DPO
trainer_type	TRL_SFT	TRL_DPO
beta	N/A	0.1
Outputs
SFT: oumi-training/output/archaeologist-model/
DPO: oumi-training/output/archaeologist-dpo-model/
