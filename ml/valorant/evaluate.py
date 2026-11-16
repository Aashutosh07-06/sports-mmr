"""Re-evaluate the saved valorant model.  Run:  python -m ml.valorant.evaluate"""
from ml.common.evaluate import evaluate_saved

if __name__ == "__main__":
    evaluate_saved("valorant")
