"""Re-evaluate the saved pubg model.  Run:  python -m ml.pubg.evaluate"""
from ml.common.evaluate import evaluate_saved

if __name__ == "__main__":
    evaluate_saved("pubg")
