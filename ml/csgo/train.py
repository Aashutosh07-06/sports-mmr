"""Train CS:GO models.  Run from the project root:  python -m ml.csgo.train"""
from ml.common.trainer import train_game
from ml.csgo.feature_engineering import SPEC
from ml.csgo.preprocessing import load_and_clean


def main() -> None:
    df, log, raw_rows = load_and_clean()
    train_game(SPEC, df, log, raw_rows)


if __name__ == "__main__":
    main()
