"""Re-evaluate the saved dota2 model.  Run:  python -m ml.dota2.evaluate"""
from ml.common.evaluate import evaluate_saved

if __name__ == "__main__":
    evaluate_saved("dota2")
