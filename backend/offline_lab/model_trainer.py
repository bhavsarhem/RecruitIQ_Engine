"""
model_trainer.py — Phase A: Train LightGBM LambdaRank model.

Trains a LightGBM ranking model using the weak labels and pre-extracted
feature matrix. Saves the trained model + SHAP importances to artifacts/.

Prerequisites:
    1. Run feature_engineer.py → artifacts/features.npz
    2. Run weak_label_generator.py → artifacts/labels.json
    3. pip install lightgbm numpy scikit-learn shap

Run from repo root:
    python offline_lab/model_trainer.py \
        --features offline_lab/artifacts/features.npz \
        --labels offline_lab/artifacts/labels.json \
        --out offline_lab/artifacts/lgbm_ranker.pkl
"""

from __future__ import annotations

import argparse
import json
import pickle
import sys
import time
from pathlib import Path

import numpy as np

_REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(_REPO_ROOT))


def train_lgbm_ranker(
    features_path: Path,
    labels_path: Path,
    model_output_path: Path,
    feature_names_output: Path,
    verbose: bool = True,
) -> None:
    """
    Train LightGBM LambdaRank model.
    """
    try:
        import lightgbm as lgb
    except ImportError:
        print("ERROR: lightgbm not installed. Run: pip install lightgbm", file=sys.stderr)
        sys.exit(1)

    t0 = time.perf_counter()

    # ----------------------------------------------------------------
    # Load features
    # ----------------------------------------------------------------
    if verbose:
        print(f"Loading features from {features_path}...")
    data = np.load(features_path, allow_pickle=True)
    X = data["X"].astype(np.float32)
    candidate_ids = data["candidate_ids"].tolist()
    feature_names = data["feature_names"].tolist()

    if verbose:
        print(f"  Feature matrix: {X.shape}")
        print(f"  Candidates: {len(candidate_ids):,}")
        print(f"  Features: {len(feature_names)}")

    # ----------------------------------------------------------------
    # Load labels
    # ----------------------------------------------------------------
    if verbose:
        print(f"Loading labels from {labels_path}...")
    with open(labels_path, "r", encoding="utf-8") as f:
        labels_dict = json.load(f)

    # Match labels to feature matrix order
    y = np.array([labels_dict.get(cid, {}).get("label", 1) for cid in candidate_ids], dtype=np.int32)

    label_counts = {i: int((y == i).sum()) for i in range(4)}
    if verbose:
        print(f"  Label distribution: {label_counts}")

    # ----------------------------------------------------------------
    # LightGBM LambdaRank setup
    # LambdaRank requires a "group" array specifying how many candidates
    # belong to each query. Since we have one global ranking pool, we
    # treat all candidates as one query group.
    # ----------------------------------------------------------------

    # For LambdaRank with a single query, we need to split into
    # pseudo-queries to allow the model to learn properly.
    # Split into groups of ~1000 candidates each.
    GROUP_SIZE = 1000
    n = len(y)
    groups = [GROUP_SIZE] * (n // GROUP_SIZE)
    remainder = n % GROUP_SIZE
    if remainder:
        groups.append(remainder)

    # ---- Training / validation split ----
    # Use first 80% for training, last 20% for validation
    train_size = int(n * 0.8)
    X_train = X[:train_size]
    y_train = y[:train_size]
    X_val = X[train_size:]
    y_val = y[train_size:]

    # Groups for train/val
    cumsum = 0
    train_groups = []
    val_groups = []
    for g in groups:
        if cumsum + g <= train_size:
            train_groups.append(g)
        elif cumsum >= train_size:
            val_groups.append(g)
        else:
            # Split this group
            split = train_size - cumsum
            if split > 0:
                train_groups.append(split)
            if g - split > 0:
                val_groups.append(g - split)
        cumsum += g

    if not val_groups:
        val_groups = [len(y_val)]

    if verbose:
        print(f"\nTraining: {len(X_train):,} | Validation: {len(X_val):,}")
        print(f"Train groups: {len(train_groups)} | Val groups: {len(val_groups)}")

    train_data = lgb.Dataset(
        X_train,
        label=y_train,
        group=train_groups,
        feature_name=feature_names,
    )
    val_data = lgb.Dataset(
        X_val,
        label=y_val,
        group=val_groups,
        feature_name=feature_names,
        reference=train_data,
    )

    # ---- LightGBM params ----
    params = {
        "objective": "lambdarank",
        "metric": "ndcg",
        "ndcg_eval_at": [10, 50],
        "learning_rate": 0.05,
        "num_leaves": 63,
        "max_depth": -1,
        "min_child_samples": 20,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "reg_alpha": 0.1,
        "reg_lambda": 0.1,
        "n_jobs": -1,
        "verbose": -1,
        "lambdarank_truncation_level": 50,
        "seed": 42,
    }

    callbacks = [lgb.log_evaluation(period=10)] if verbose else [lgb.log_evaluation(period=0)]

    if verbose:
        print("\nTraining LightGBM LambdaRank...")

    model = lgb.train(
        params,
        train_data,
        num_boost_round=200,
        valid_sets=[val_data],
        callbacks=callbacks + [lgb.early_stopping(stopping_rounds=20, verbose=verbose)],
    )

    if verbose:
        print(f"\nBest iteration: {model.best_iteration}")

    # ----------------------------------------------------------------
    # Save model natively as text (secure, pickle-free)
    # ----------------------------------------------------------------
    model_output_path.parent.mkdir(parents=True, exist_ok=True)
    model.save_model(str(model_output_path))

    # Save scaler parameters to a JSON file (standard min-max params)
    raw_preds = model.predict(X)
    min_val = float(raw_preds.min())
    max_val = float(raw_preds.max())
    scaler_params = {
        "min": min_val,
        "max": max_val,
        "range": max_val - min_val if max_val > min_val else 1.0
    }
    scaler_path = model_output_path.parent / "scaler_config.json"
    scaler_path.write_text(json.dumps(scaler_params, indent=2), encoding="utf-8")
    if verbose:
        print(f"Scaler parameters saved to: {scaler_path}")

    # ----------------------------------------------------------------
    # SHAP feature importances
    # ----------------------------------------------------------------
    if verbose:
        print("\nComputing SHAP importances...")
    importance = model.feature_importance(importance_type="gain")
    importance_dict = dict(zip(feature_names, importance.tolist()))
    sorted_importance = dict(
        sorted(importance_dict.items(), key=lambda x: -x[1])
    )

    shap_path = model_output_path.parent / "shap_importances.json"
    shap_path.write_text(json.dumps(sorted_importance, indent=2), encoding="utf-8")
    if verbose:
        print(f"SHAP importances saved to: {shap_path}")
        print("\nTop 10 features:")
        for i, (feat, imp) in enumerate(list(sorted_importance.items())[:10]):
            print(f"  {i+1:2d}. {feat}: {imp:.1f}")

    # Save feature names separately (for ranker.py compatibility)
    feature_names_output.write_text(json.dumps(feature_names, indent=2), encoding="utf-8")

    elapsed = time.perf_counter() - t0
    if verbose:
        print(f"\nModel saved to: {model_output_path}")
        print(f"Feature names saved to: {feature_names_output}")
        print(f"Total training time: {elapsed:.1f}s")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--features", default="../dataset/features.npz")
    parser.add_argument("--labels", default="../dataset/labels.json")
    parser.add_argument("--out", default="offline_lab/artifacts/lgbm_ranker.txt")
    parser.add_argument("--feature-names", default="offline_lab/artifacts/feature_names.json")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    train_lgbm_ranker(
        features_path=Path(args.features),
        labels_path=Path(args.labels),
        model_output_path=Path(args.out),
        feature_names_output=Path(args.feature_names),
        verbose=not args.quiet,
    )


if __name__ == "__main__":
    main()
