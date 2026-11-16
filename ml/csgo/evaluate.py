"""Re-evaluate the saved CS:GO model.  Run:  python -m ml.csgo.evaluate"""
from ml.common.evaluate import evaluate_saved

if __name__ == "__main__":
    evaluate_saved("csgo")
