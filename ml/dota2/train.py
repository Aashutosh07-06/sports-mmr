"""Train dota2 models.  Run from the project root:  python -m ml.dota2.train"""
from ml.common.trainer import train_game
from ml.dota2.feature_engineering import SPEC
from ml.dota2.preprocessing import load_and_clean


def main() -> None:
    df, log, raw_rows = load_and_clean()
    train_game(SPEC, df, log, raw_rows)


if __name__ == "__main__":
    main()
