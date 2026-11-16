"""Train valorant models.  Run from the project root:  python -m ml.valorant.train"""
from ml.common.trainer import train_game
from ml.valorant.feature_engineering import SPEC
from ml.valorant.preprocessing import load_and_clean


def main() -> None:
    df, log, raw_rows = load_and_clean()
    train_game(SPEC, df, log, raw_rows)


if __name__ == "__main__":
    main()
