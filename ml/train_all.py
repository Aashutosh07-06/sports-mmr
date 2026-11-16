"""Train every game model and run both feasibility experiments.

Run from the project root (with the virtual environment active):
    python -m ml.train_all            # everything
    python -m ml.train_all csgo pubg  # selected games only
"""
import sys

from ml.csgo import train as csgo
from ml.dota2 import train as dota2
from ml.experiments import dota2_trueskill_feasibility, valorant_ranked_feasibility
from ml.pubg import train as pubg
from ml.valorant import train as valorant

JOBS = {"csgo": csgo.main, "pubg": pubg.main, "valorant": valorant.main, "dota2": dota2.main,
        "experiments": lambda: (dota2_trueskill_feasibility.main(), valorant_ranked_feasibility.main())}

if __name__ == "__main__":
    for name in sys.argv[1:] or JOBS:
        JOBS[name]()
